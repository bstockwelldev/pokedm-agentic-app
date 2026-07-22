/**
 * Bundled Campaign Session Service — STO-504
 *
 * Creates v1.1.0-compatible sessions seeded from bundled campaign data
 * (aurora-region, celestide-isles) via loadCampaign.
 */

import { randomUUID } from 'crypto';
import { z } from 'zod';
import { loadCampaign, resolveSessionBrief } from './campaignLoader.js';
import { saveSession } from '../storage/sessionStore.js';
import logger from '../lib/logger.js';

const LOCATION_TYPES = new Set(['town', 'route', 'dungeon', 'landmark']);
const FACTION_TONES = new Set(['misguided', 'idealistic', 'confused']);
const FACTION_MEMBER_ROLES = new Set(['leader', 'grunt', 'researcher', 'merchant', 'ranger']);
const NPC_ROLES = new Set(['researcher', 'merchant', 'antagonist', 'ranger', 'guide']);
const NPC_DISPOSITIONS = new Set(['friendly', 'neutral', 'tense']);

export const CreateBundledSessionInputSchema = z.object({
  campaign_id: z.string().min(1),
  host_name: z.string().min(1).max(60).default('Trainer'),
  session_brief_id: z.string().optional(),
});

/**
 * Create a new v1.1.0 session seeded from a bundled campaign.
 *
 * @param {object} input
 * @returns {Promise<{ sessionId: string, session: object }>}
 */
export async function createBundledCampaignSession(input) {
  const parsed = CreateBundledSessionInputSchema.parse(input);
  const { campaign_id, host_name, session_brief_id } = parsed;

  const bundle = loadCampaign(campaign_id);
  if (!bundle?.meta) {
    throw new BundledCampaignSessionError(
      `Campaign not found: "${campaign_id}"`,
      'CAMPAIGN_NOT_FOUND'
    );
  }

  const sessionBrief = resolveSessionBrief(campaign_id, session_brief_id) ?? bundle.sessionBrief;
  const sessionId = randomUUID();
  const now = new Date().toISOString();
  const briefId = session_brief_id ?? sessionBrief?.id ?? 'session-brief';
  const startingLocationId = sessionBrief?.starting_location_id
    ?? bundle.world?.region?.starting_location_id
    ?? bundle.world?.locations?.[0]?.location_id
    ?? '';

  const session = {
    schema_version: '1.1.0',
    session_brief_id: briefId,
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
      ruleset_flags: { allow_new_species: false },
      notes: 'Custom Pokémon stored alongside canon, never overwriting canon entries.',
    },
    campaign: mapCampaignToSession(bundle),
    characters: [buildHostCharacter(host_name)],
    session: {
      session_id: sessionId,
      campaign_id: bundle.meta.campaign_id,
      character_ids: [],
      episode_title: sessionBrief?.episode_title ?? `Episode ${sessionBrief?.episode_number ?? 1}`,
      scene: {
        location_id: startingLocationId,
        description: sessionBrief?.scene_setup ?? '',
        mood: 'calm',
      },
      current_objectives: (sessionBrief?.objectives ?? []).map((obj) => ({
        objective_id: obj.objective_id,
        description: obj.description,
        status: 'active',
        notes: obj.optional ? 'optional' : undefined,
      })),
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
      event_log: [
        {
          t: now,
          kind: 'scene',
          summary: `Campaign selected: ${bundle.meta.title}`,
          details: `Episode ${sessionBrief?.episode_number ?? 1} — ${sessionBrief?.episode_title ?? 'Opening'}`,
        },
      ],
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
      migration_notes: `Seeded from bundled campaign ${bundle.campaignId}`,
      last_migrated_at: now,
    },
  };

  session.session.character_ids = session.characters.map((c) => c.character_id);

  await saveSession(sessionId, session);
  logger.info('Bundled campaign session created', {
    sessionId,
    campaign_id: bundle.meta.campaign_id,
    slug: bundle.campaignId,
  });

  return { sessionId, session };
}

function mapCampaignToSession(bundle) {
  const { meta, world, factions } = bundle;

  return {
    campaign_id: meta.campaign_id,
    region: {
      name: world?.region?.name ?? meta.region_name,
      theme: world?.region?.theme ?? '',
      description: world?.region?.description ?? meta.notes ?? '',
      environment_tags: world?.region?.environment_tags ?? meta.tags ?? [],
      climate: world?.region?.climate ?? 'temperate',
    },
    locations: (world?.locations ?? []).map(mapLocation),
    factions: (factions?.factions ?? []).map(mapFaction),
    recurring_npcs: (world?.recurring_npcs ?? []).map(mapNpc),
    world_facts: (world?.world_facts ?? []).map(mapWorldFact),
  };
}

function mapLocation(loc) {
  const type = LOCATION_TYPES.has(loc.type)
    ? loc.type
    : loc.type === 'gym' || loc.type === 'wilderness'
      ? 'landmark'
      : 'route';

  return {
    location_id: loc.location_id,
    name: loc.name,
    type,
    description: loc.description ?? '',
    known: loc.known_by_default ?? loc.known ?? false,
  };
}

function mapFaction(faction) {
  const tone = FACTION_TONES.has(faction.tone) ? faction.tone : 'misguided';

  return {
    faction_id: faction.faction_id,
    name: faction.name,
    philosophy: faction.philosophy ?? faction.motivation ?? '',
    tone,
    known_members: (faction.known_members ?? []).map((member) => ({
      npc_id: member.npc_id,
      role: FACTION_MEMBER_ROLES.has(member.role) ? member.role : 'grunt',
      notes: member.notes,
    })),
    status: faction.status === 'dormant' || faction.status === 'reformed'
      ? faction.status
      : 'active',
  };
}

function mapNpc(npc) {
  return {
    npc_id: npc.npc_id,
    name: npc.name,
    role: NPC_ROLES.has(npc.role) ? npc.role : 'guide',
    disposition: NPC_DISPOSITIONS.has(npc.disposition) ? npc.disposition : 'neutral',
    notes: npc.notes,
    home_location_id: npc.home_location_id,
    faction_id: npc.faction_id,
  };
}

function mapWorldFact(fact) {
  return {
    fact_id: fact.fact_id,
    title: fact.title ?? '',
    description: fact.description ?? '',
    tags: fact.tags ?? [],
    revealed: fact.revealed ?? fact.revealed_by_default ?? false,
  };
}

function buildHostCharacter(hostName) {
  const characterId = `char_${randomUUID()}`;

  return {
    character_id: characterId,
    trainer: {
      name: hostName,
      age_group: 'teen',
      background: 'New trainer beginning their regional journey.',
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
  };
}

export class BundledCampaignSessionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'BundledCampaignSessionError';
    this.code = code;
  }
}
