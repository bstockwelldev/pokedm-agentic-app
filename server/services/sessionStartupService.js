/**
 * Session Startup Service — STO-32
 *
 * Orchestrates the Campaign → Session handoff flow:
 *   1. Validate campaign config against schema
 *   2. Create trainer entities for each player
 *   3. Assign starter Pokémon per trainer selection
 *   4. Persist session record (file dev / Postgres prod)
 *   5. Trigger DM opening narration from session-brief first beat
 *
 * Z1: createSession   — full handoff orchestration
 *     activateSession — transition lobby → active
 * Z2: buildSessionRecord     — assemble the session JSON blob
 *     buildTrainerEntities   — create trainer state per player input
 *     resolveStarterPokemon  — look up starter species via override layer
 *     generateOpeningNarration — invoke DM agent for first-beat narration
 * Z3: generateSessionId      — UUID v4
 *     buildWorldState        — derive initial world state from campaign
 *     buildPlayersMap        — map trainerId → player slot
 */

import { randomUUID } from 'crypto';
import { loadCampaign } from './campaignLoader.js';
import { resolvePokemon } from './pokemonOverrideService.js';
import { runDMAgent } from '../agents/dm.js';
import { getDefaultAdapter } from '../storage/adapters/index.js';
import logger from '../lib/logger.js';
import { z } from 'zod';

// ── Input Schemas ──────────────────────────────────────────────────────────────

const PlayerInputSchema = z.object({
  name: z.string().min(1).max(60),
  pronouns: z.string().max(20).optional(),
  trainer_class: z.string().max(40).default('Trainer'),
  type_affinities: z.array(
    z.object({ type: z.string().min(1), rank: z.number().int().min(1).max(10).default(1) })
  ).min(1).max(2),
  starter_species_id: z.string().min(1),  // PokeAPI dex id OR custom id
});

export const CreateSessionInputSchema = z.object({
  campaign_id: z.string().min(1),
  session_brief_id: z.string().optional(), // defaults to "session-brief" (the file in campaign dir)
  players: z.array(PlayerInputSchema).min(1).max(4),
});

// ── Z1: Orchestrators ──────────────────────────────────────────────────────────

/**
 * Create a new session from a campaign config + player roster.
 *
 * @param {object} input  Validated CreateSessionInputSchema data
 * @returns {Promise<{ sessionId: string, dmOpeningNarration: string, session: object }>}
 */
export async function createSession(input) {
  const parsed = CreateSessionInputSchema.parse(input);
  const { campaign_id, session_brief_id, players } = parsed;

  // Load and validate the campaign
  const campaign = loadCampaign(campaign_id);
  if (!campaign?.meta) {
    throw new SessionStartupError(`Campaign not found: "${campaign_id}"`, 'CAMPAIGN_NOT_FOUND');
  }

  // Build all the pieces
  const sessionId = generateSessionId();
  const trainerEntities = await buildTrainerEntities(players, campaign_id);
  const worldState = buildWorldState(campaign);
  const playersMap = buildPlayersMap(trainerEntities);

  const sessionRecord = buildSessionRecord({
    sessionId,
    campaign,
    sessionBriefId: session_brief_id,
    trainerEntities,
    playersMap,
    worldState,
  });

  // Persist
  const adapter = getDefaultAdapter();
  await adapter.saveSession(sessionId, sessionRecord);
  logger.info('Session created', { sessionId, campaign_id, playerCount: players.length });

  // Trigger opening narration
  const dmOpeningNarration = await generateOpeningNarration(sessionRecord);

  return { sessionId, dmOpeningNarration, session: sessionRecord };
}

/**
 * Transition a session from lobby → active state.
 * @param {string} sessionId
 * @returns {Promise<object>}  Updated session
 */
export async function activateSession(sessionId) {
  const adapter = getDefaultAdapter();
  const session = await adapter.getSession(sessionId);
  if (!session) {
    throw new SessionStartupError(`Session not found: "${sessionId}"`, 'SESSION_NOT_FOUND');
  }
  if (session.multiplayer?.status === 'active') {
    return session; // idempotent
  }

  const updated = {
    ...session,
    multiplayer: {
      ...session.multiplayer,
      status: 'active',
      activated_at: new Date().toISOString(),
    },
  };

  await adapter.saveSession(sessionId, updated);
  logger.info('Session activated', { sessionId });
  return updated;
}

/**
 * Rotate the active trainer to the next player in turn order.
 * @param {string} sessionId
 * @param {string} [toTrainerId]  Explicit target trainer; if omitted, cycles to next
 * @returns {Promise<object>}  Updated session
 */
export async function passSessionTurn(sessionId, toTrainerId) {
  const adapter = getDefaultAdapter();
  const session = await adapter.getSession(sessionId);
  if (!session) {
    throw new SessionStartupError(`Session not found: "${sessionId}"`, 'SESSION_NOT_FOUND');
  }

  const mp = session.multiplayer ?? {};
  const playerIds = mp.turn_order ?? Object.keys(mp.players ?? {});
  if (playerIds.length === 0) return session;

  let nextTrainerId = toTrainerId;
  if (!nextTrainerId) {
    const currentIdx = playerIds.indexOf(mp.active_trainer_id ?? playerIds[0]);
    nextTrainerId = playerIds[(currentIdx + 1) % playerIds.length];
  }

  if (!playerIds.includes(nextTrainerId)) {
    throw new SessionStartupError(`Trainer not in session: "${nextTrainerId}"`, 'INVALID_TRAINER');
  }

  const updated = {
    ...session,
    multiplayer: {
      ...mp,
      active_trainer_id: nextTrainerId,
      players: {
        ...mp.players,
        ...Object.fromEntries(
          playerIds.map((id) => [
            id,
            { ...mp.players[id], is_active: id === nextTrainerId },
          ])
        ),
      },
    },
  };

  await adapter.saveSession(sessionId, updated);
  return updated;
}

// ── Z2: Coordinators ───────────────────────────────────────────────────────────

/**
 * Assemble the full session JSON record ready for persistence.
 */
function buildSessionRecord({ sessionId, campaign, sessionBriefId, trainerEntities, playersMap, worldState }) {
  const now = new Date().toISOString();
  const brief = campaign.sessionBrief;

  return {
    schema_version: '2.0.0',
    session_id: sessionId,
    campaign_id: campaign.campaignId,
    session_brief_id: sessionBriefId ?? 'session-brief',
    created_at: now,
    multiplayer: {
      status: 'lobby',           // lobby → active after /activate
      host_trainer_id: trainerEntities[0]?.trainer_id ?? null,
      active_trainer_id: trainerEntities[0]?.trainer_id ?? null,
      turn_order: trainerEntities.map((t) => t.trainer_id),
      players: playersMap,
    },
    world_state: worldState,
    characters: trainerEntities,
    session: {
      session_id: sessionId,
      campaign_id: campaign.campaignId,
      episode_number: brief?.episode_number ?? 1,
      episode_title: brief ? `Episode ${brief.episode_number}` : 'Episode 1',
      scene: {
        location_id: worldState.current_location_id,
        description: brief?.scene_setup ?? '',
        mood: 'calm',
      },
      current_objectives: (brief?.objectives ?? []).map((obj, i) => ({
        objective_id: `obj_${i + 1}`,
        description: obj.description,
        optional: obj.optional ?? false,
        status: 'active',
      })),
      event_log: [],
      player_choices: { options_presented: [], safe_default: null, last_choice: null },
      battle_state: { active: false, encounter_id: null, last_action_summary: null },
      controls: { pacing: 'normal', explain_depth: null },
      encounters: [],
    },
  };
}

/**
 * Build trainer entity objects for each player, including their starter Pokémon.
 */
async function buildTrainerEntities(players, campaignId) {
  return Promise.all(
    players.map(async (player, idx) => {
      const trainerId = `trainer_${randomUUID()}`;
      const starterPokemon = await resolveStarterPokemon(player.starter_species_id, campaignId, trainerId);

      return {
        trainer_id: trainerId,
        trainer: {
          name: player.name,
          pronouns: player.pronouns ?? null,
          trainer_class: player.trainer_class,
          level: 1,
          badges: [],
        },
        type_affinities: player.type_affinities.map((a) => ({
          type: a.type,
          rank: a.rank,
          xp: 0,
          unlocked_milestones: [],
          signature_perk: null,
        })),
        pokemon_party: [starterPokemon],
        turn_index: idx,
      };
    })
  );
}

/**
 * Resolve starter species (custom override → PokeAPI fallback) and build entity.
 */
async function resolveStarterPokemon(speciesId, campaignId, ownerId) {
  try {
    const resolved = await resolvePokemon(speciesId, campaignId);
    const baseStats = resolved.stats ?? {};
    const maxHp = Math.floor(((2 * (baseStats.hp ?? 45) + 31) * 5) / 100) + 5 + 10; // lv5 formula

    return {
      entity_id: `poke_${randomUUID()}`,
      species_id: speciesId,
      species_ref: { id: speciesId, name: resolved.name ?? speciesId },
      nickname: null,
      owner_id: ownerId,
      level: 5,
      experience: 0,
      current_hp: maxHp,
      max_hp: maxHp,
      stats: {
        hp: baseStats.hp ?? 45,
        attack: baseStats.attack ?? 49,
        defense: baseStats.defense ?? 49,
        special_attack: baseStats.special_attack ?? 65,
        special_defense: baseStats.special_defense ?? 65,
        speed: baseStats.speed ?? 45,
      },
      moves: (resolved.moves ?? []).slice(0, 4).map((m) => ({
        move_id: m.name ?? m,
        pp_current: m.pp ?? 20,
        pp_max: m.pp ?? 20,
      })),
      nature: 'hardy',
      status_condition: null,
      bond_level: 0,
      obtained_at: new Date().toISOString(),
      is_starter: true,
    };
  } catch (err) {
    logger.warn('Failed to resolve starter species — using placeholder', { speciesId, error: err.message });
    return buildPlaceholderPokemon(speciesId, ownerId);
  }
}

/**
 * Invoke the DM agent to produce the campaign's opening narration.
 * Uses the session-brief scene_setup as the user prompt.
 */
async function generateOpeningNarration(sessionRecord) {
  const brief = sessionRecord.session;
  const userPrompt = brief?.scene_setup
    ?? `The adventure begins! Open with a vivid scene-setting narration based on the campaign.`;

  try {
    const { narration } = await runDMAgent(userPrompt, sessionRecord);
    return narration;
  } catch (err) {
    logger.warn('Opening narration failed — using default', { error: err.message });
    return 'The adventure begins. Your journey into the Aurora Region starts now...';
  }
}

// ── Z3: Pure Helpers ───────────────────────────────────────────────────────────

function generateSessionId() {
  return randomUUID();
}

/**
 * Derive initial world state from campaign meta + world data.
 */
function buildWorldState(campaign) {
  const startingLocationId = campaign.world?.region?.starting_location_id
    ?? campaign.world?.locations?.[0]?.location_id
    ?? 'starting-location';

  return {
    current_location_id: startingLocationId,
    weather: 'clear',
    time_of_day: 'morning',
    active_field_effects: [],
  };
}

/**
 * Map trainer entities to the `players` map format used by multiplayer state.
 */
function buildPlayersMap(trainerEntities) {
  return Object.fromEntries(
    trainerEntities.map((t, idx) => [
      t.trainer_id,
      {
        name: t.trainer.name,
        is_active: idx === 0,
        is_connected: true,
        joined_at: new Date().toISOString(),
      },
    ])
  );
}

function buildPlaceholderPokemon(speciesId, ownerId) {
  return {
    entity_id: `poke_${randomUUID()}`,
    species_id: speciesId,
    species_ref: { id: speciesId, name: speciesId },
    nickname: null,
    owner_id: ownerId,
    level: 5,
    experience: 0,
    current_hp: 20,
    max_hp: 20,
    stats: { hp: 45, attack: 49, defense: 49, special_attack: 65, special_defense: 65, speed: 45 },
    moves: [{ move_id: 'tackle', pp_current: 35, pp_max: 35 }],
    nature: 'hardy',
    status_condition: null,
    bond_level: 0,
    obtained_at: new Date().toISOString(),
    is_starter: true,
  };
}

// ── Error Class ────────────────────────────────────────────────────────────────

export class SessionStartupError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'SessionStartupError';
    this.code = code;
  }
}
