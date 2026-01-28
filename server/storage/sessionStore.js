/**
 * Session Store
 * Provides session persistence using storage adapters
 */

import { PokemonSessionSchema } from '../schemas/session.js';
import { randomUUID } from 'crypto';
import { getDefaultAdapter } from './adapters/index.js';

// Import adapters to register them
import './adapters/file.js';
import './adapters/postgres.js';

// Get the default adapter instance
const adapter = getDefaultAdapter();

/**
 * Load session from storage with schema validation
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} Parsed and validated session or null if not found
 */
export async function loadSession(sessionId) {
  try {
    return await adapter.loadSession(sessionId);
  } catch (error) {
    console.error(`Error loading session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Save session to storage with validation
 * @param {string} sessionId - Session ID
 * @param {object} sessionData - Session data to save
 * @returns {Promise<void>}
 */
export async function saveSession(sessionId, sessionData) {
  try {
    await adapter.saveSession(sessionId, sessionData);
  } catch (error) {
    console.error(`Error saving session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Create new session with default structure
 * @param {string} campaignId - Optional campaign ID
 * @param {string[]} characterIds - Optional character IDs
 * @returns {Promise<object>} New session object
 */
export async function createSession(campaignId = null, characterIds = []) {
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
  await saveSession(sessionId, validated);
  return validated;
}

/**
 * List all sessions for a campaign
 * @param {string} campaignId - Campaign ID (optional)
 * @returns {Promise<string[]>} Array of session IDs
 */
export async function listSessions(campaignId = null) {
  try {
    return await adapter.listSessions(campaignId);
  } catch (error) {
    console.error('Error listing sessions:', error);
    throw error;
  }
}

/**
 * Get custom dex registry
 * @param {string} sessionId - Session ID
 * @returns {Promise<object>} Custom dex pokemon registry
 */
export async function getCustomDex(sessionId) {
  const session = await loadSession(sessionId);
  return session?.custom_dex?.pokemon || {};
}

/**
 * Add custom Pokémon to registry
 * @param {string} sessionId - Session ID
 * @param {object} customPokemon - Custom Pokémon data
 * @returns {Promise<void>}
 */
export async function addCustomPokemon(sessionId, customPokemon) {
  const session = await loadSession(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  session.custom_dex.pokemon[customPokemon.custom_species_id] = customPokemon;
  await saveSession(sessionId, session);
}

/**
 * Get canon cache (read-only)
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} Canon cache object
 */
export async function getCanonCache(sessionId) {
  const session = await loadSession(sessionId);
  return session?.dex?.canon_cache || null;
}
