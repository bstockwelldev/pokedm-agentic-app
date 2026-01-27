import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { PokemonSessionSchema } from '../schemas/session.js';
import { randomUUID } from 'crypto';

// Detect Vercel environment (check multiple possible env vars)
const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);

// In Vercel serverless, use /tmp for session storage (ephemeral)
// In local dev, use ./sessions
const SESSIONS_DIR = isVercel
  ? '/tmp/sessions'
  : (process.env.SESSIONS_DIR || './sessions');

// Lazy initialization: ensure directory exists only when needed
function ensureSessionsDir() {
  try {
    if (!existsSync(SESSIONS_DIR)) {
      // In Vercel, ensure /tmp exists first
      if (SESSIONS_DIR.startsWith('/tmp')) {
        if (!existsSync('/tmp')) {
          console.warn('/tmp directory does not exist in this environment');
          return;
        }
      }
      mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  } catch (err) {
    // In serverless environments, directory creation might fail
    // Log warning but don't throw - we'll handle errors when reading/writing files
    console.warn(`Could not create sessions directory ${SESSIONS_DIR}:`, err.message);
  }
}

/**
 * Load session from JSON file with schema validation
 * @param {string} sessionId - Session ID
 * @returns {object|null} Parsed and validated session or null if not found
 */
export function loadSession(sessionId) {
  ensureSessionsDir(); // Ensure directory exists before reading
  const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`);
  
  if (!existsSync(sessionPath)) {
    return null;
  }

  try {
    const sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
    return PokemonSessionSchema.parse(sessionData);
  } catch (error) {
    console.error(`Error loading session ${sessionId}:`, error);
    throw new Error(`Invalid session data: ${error.message}`);
  }
}

/**
 * Save session to JSON file with validation
 * @param {string} sessionId - Session ID
 * @param {object} sessionData - Session data to save
 */
export function saveSession(sessionId, sessionData) {
  // Validate before saving
  const validated = PokemonSessionSchema.parse(sessionData);
  
  ensureSessionsDir(); // Ensure directory exists before writing
  const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`);
  writeFileSync(sessionPath, JSON.stringify(validated, null, 2), 'utf-8');
}

/**
 * Create new session with default structure
 * @param {string} campaignId - Optional campaign ID
 * @param {string[]} characterIds - Optional character IDs
 * @returns {object} New session object
 */
export function createSession(campaignId = null, characterIds = []) {
  const sessionId = randomUUID();
  const now = new Date().toISOString();

  const newSession = {
    schema_version: '1.1.0',
    dex: {
      canon_cache: {
        pokemon: {},
        moves: {},
        abilities: {},
        types: {},
        species: {},
        evolution_chains: {},
        items: {},
        locations: {},
        generations: {},
      },
      cache_policy: {
        source: 'pokeapi',
        gen_range: '1-9',
        ttl_hours: 168,
        max_entries_per_kind: 5000,
        notes: 'Canon reference-only cache; never treated as player-owned state.',
      },
    },
    custom_dex: {
      pokemon: {},
      ruleset_flags: {
        allow_new_species: false, // Default: no new species
      },
      notes: 'Custom Pokémon stored alongside canon, never overwriting canon entries.',
    },
    campaign: {
      campaign_id: campaignId || '',
      region: {
        name: '',
        theme: '',
        description: '',
        environment_tags: [],
        climate: '',
      },
      locations: [],
      factions: [],
      recurring_npcs: [],
      world_facts: [],
    },
    characters: characterIds.map((charId) => ({
      character_id: charId,
      trainer: {
        name: '',
        age_group: 'child',
        background: '',
        personality_traits: [],
        bonds: [],
      },
      inventory: {
        items: [],
        pokeballs: {
          poke_ball: 5,
          great_ball: 0,
          ultra_ball: 0,
        },
        key_items: [],
      },
      pokemon_party: [],
      achievements: [],
      progression: {
        badges: 0,
        milestones: [],
      },
    })),
    session: {
      session_id: sessionId,
      campaign_id: campaignId || '',
      character_ids: characterIds,
      episode_title: '',
      scene: {
        location_id: '',
        description: '',
        mood: 'calm',
      },
      current_objectives: [],
      encounters: [],
      battle_state: {
        active: false,
        round: 0,
        turn_order: [],
        field_effects: [],
      },
      fail_soft_flags: {
        recent_failures: 0,
        recent_successes: 0,
        difficulty_adjusted: false,
        party_confidence: 'medium',
        auto_scaled_last_encounter: false,
      },
      player_choices: {
        options_presented: [],
      },
      controls: {
        pause_requested: false,
        skip_requested: false,
        explain_requested: false,
      },
      event_log: [],
    },
    continuity: {
      timeline: [],
      discovered_pokemon: [],
      unresolved_hooks: [],
      recaps: [],
    },
    state_versioning: {
      current_version: '1.1.0',
      previous_versions: [],
      migration_notes: 'Initial session creation',
      last_migrated_at: now,
    },
  };

  // Clean up any null values for optional fields before validation
  // JSON serialization can introduce nulls, so we remove them for optional fields
  if (newSession.session.battle_state.encounter_id === null) {
    delete newSession.session.battle_state.encounter_id;
  }
  if (newSession.session.battle_state.last_action_summary === null) {
    delete newSession.session.battle_state.last_action_summary;
  }
  if (newSession.session.player_choices.safe_default === null) {
    delete newSession.session.player_choices.safe_default;
  }
  if (newSession.session.player_choices.last_choice === null) {
    delete newSession.session.player_choices.last_choice;
  }
  if (newSession.session.controls.explain_depth === null) {
    delete newSession.session.controls.explain_depth;
  }

  // Validate and save
  const validated = PokemonSessionSchema.parse(newSession);
  saveSession(sessionId, validated);
  return validated;
}

/**
 * List all sessions for a campaign
 * @param {string} campaignId - Campaign ID (optional)
 * @returns {string[]} Array of session IDs
 */
export function listSessions(campaignId = null) {
  ensureSessionsDir(); // Ensure directory exists before listing
  if (!existsSync(SESSIONS_DIR)) {
    return [];
  }

  const files = readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json'));
  const sessionIds = files.map((f) => f.replace('.json', ''));

  if (!campaignId) {
    return sessionIds;
  }

  // Filter by campaign
  return sessionIds.filter((sessionId) => {
    try {
      const session = loadSession(sessionId);
      return session?.session?.campaign_id === campaignId;
    } catch {
      return false;
    }
  });
}

/**
 * Get custom dex registry
 * @param {string} sessionId - Session ID
 * @returns {object} Custom dex pokemon registry
 */
export function getCustomDex(sessionId) {
  const session = loadSession(sessionId);
  return session?.custom_dex?.pokemon || {};
}

/**
 * Add custom Pokémon to registry
 * @param {string} sessionId - Session ID
 * @param {object} customPokemon - Custom Pokémon data
 */
export function addCustomPokemon(sessionId, customPokemon) {
  const session = loadSession(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  session.custom_dex.pokemon[customPokemon.custom_species_id] = customPokemon;
  saveSession(sessionId, session);
}

/**
 * Get canon cache (read-only)
 * @param {string} sessionId - Session ID
 * @returns {object} Canon cache object
 */
export function getCanonCache(sessionId) {
  const session = loadSession(sessionId);
  return session?.dex?.canon_cache || null;
}
