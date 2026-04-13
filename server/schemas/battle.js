/**
 * Battle State Schemas — STO-18
 *
 * Five battle types, each with type-specific fields:
 *   wild      — flee + catch allowed; single wild Pokémon
 *   trainer   — NPC trainer with full party; no catch
 *   grunt     — faction grunt; scaled to party level; badge-irrelevant
 *   gym       — gym leader; badge reward on victory; level-scaled
 *   pvp       — player vs player (same session/device); no catch; no badge
 *
 * The battle engine (STO-23/24) is pure JS — no AI in game math.
 * The DM agent receives BattleResultSchema after each engine tick and narrates it.
 */

import { z } from 'zod';

// ── Shared participant ────────────────────────────────────────────────────────

export const BattleParticipantSchema = z.object({
  /** Unique slot within this battle */
  slot: z.number().int().min(0),
  kind: z.enum(['party_pokemon', 'wild_pokemon', 'npc_pokemon']),
  /** pokemon instance_id or encounter_slot_id */
  ref: z.string(),
  /** character_id (player) or npc_id (NPC trainer) owning this Pokémon */
  owner_id: z.string(),
  /** true once HP reaches 0 */
  fainted: z.boolean().default(false),
  /**
   * Stat stage modifiers (-6 to +6) applied during this battle.
   * Reset when Pokémon is switched or battle ends.
   */
  stage_modifiers: z
    .object({
      attack: z.number().int().min(-6).max(6).default(0),
      defense: z.number().int().min(-6).max(6).default(0),
      special_attack: z.number().int().min(-6).max(6).default(0),
      special_defense: z.number().int().min(-6).max(6).default(0),
      speed: z.number().int().min(-6).max(6).default(0),
      accuracy: z.number().int().min(-6).max(6).default(0),
      evasion: z.number().int().min(-6).max(6).default(0),
    })
    .default({}),
});

// ── Turn order ────────────────────────────────────────────────────────────────

export const TurnEntrySchema = z.object({
  slot: z.number().int().min(0),
  /** Effective speed (after stage modifiers + paralysis) used to sort this turn */
  effective_speed: z.number().int().min(0),
});

// ── Battle log entry ──────────────────────────────────────────────────────────

export const BattleLogEntrySchema = z.object({
  round: z.number().int().min(1),
  turn: z.number().int().min(1),
  actor_slot: z.number().int().min(0),
  action: z.enum(['move', 'item', 'switch', 'flee', 'catch']),
  move_name: z.string().optional(),
  /** d20 roll result (1–20) — natural 20 = crit, natural 1 = miss */
  d20_roll: z.number().int().min(1).max(20).optional(),
  hit: z.boolean().optional(),
  critical: z.boolean().optional(),
  damage_dealt: z.number().int().min(0).optional(),
  type_effectiveness: z.number().optional(), // 0 | 0.25 | 0.5 | 1 | 2 | 4
  /** One-line engine summary passed to DM agent for narration */
  summary: z.string(),
});

// ── Wild battle state ─────────────────────────────────────────────────────────

export const WildBattleStateSchema = z.object({
  battle_type: z.literal('wild'),
  encounter_slot_id: z.string(),
  /** Whether the active trainer can flee this round (Pokémon with Run Away or fast enough) */
  flee_available: z.boolean().default(true),
  catch_attempts: z.number().int().min(0).default(0),
  last_ball_used: z.string().optional(),
});

// ── Trainer battle state ──────────────────────────────────────────────────────

export const TrainerBattleStateSchema = z.object({
  battle_type: z.literal('trainer'),
  npc_trainer_id: z.string(),
  /** Prize money awarded on victory (derived from trainer level × payout formula) */
  prize_money: z.number().int().min(0).default(0),
  /** Rematch allowed? Some trainers only battle once per session */
  rematch_allowed: z.boolean().default(false),
});

// ── Grunt battle state ────────────────────────────────────────────────────────

export const GruntBattleStateSchema = z.object({
  battle_type: z.literal('grunt'),
  faction_id: z.string(),
  npc_grunt_id: z.string(),
  /** Grunt level scales to party average level */
  scaled_to_level: z.number().int().min(1).max(100),
  /** Story consequence if players lose (optional DM hook) */
  defeat_consequence: z.string().optional(),
});

// ── Gym / boss battle state ───────────────────────────────────────────────────

export const GymBattleStateSchema = z.object({
  battle_type: z.enum(['gym', 'boss']),
  challenge_id: z.string(),
  leader_npc_id: z.string(),
  /** Badge ID awarded on victory (gym only) */
  badge_id: z.string().optional(),
  badge_name: z.string().optional(),
  /** Current stage (for multi-stage boss fights) */
  stage: z.number().int().min(1).default(1),
  total_stages: z.number().int().min(1).default(1),
  /** Level-scaled team (computed by battle engine at battle start) */
  scaled_level: z.number().int().min(1).max(100),
});

// ── PvP battle state ──────────────────────────────────────────────────────────

export const PvpBattleStateSchema = z.object({
  battle_type: z.literal('pvp'),
  challenger_character_id: z.string().uuid(),
  defender_character_id: z.string().uuid(),
  /** Optional wager (items, money, Pokémon trade) agreed before battle */
  stakes: z.string().optional(),
  /** Who won (populated at battle end) */
  winner_character_id: z.string().uuid().optional(),
});

// ── Top-level BattleState ─────────────────────────────────────────────────────

export const BattleTypeDataSchema = z.discriminatedUnion('battle_type', [
  WildBattleStateSchema,
  TrainerBattleStateSchema,
  GruntBattleStateSchema,
  GymBattleStateSchema,
  PvpBattleStateSchema,
]);

export const BattleStateSchema = z.object({
  /** true while a battle is in progress */
  active: z.boolean().default(false),
  /** Populated when active = true */
  battle_id: z.string().uuid().optional(),
  round: z.number().int().min(0).default(0),
  turn: z.number().int().min(0).default(0),
  /** Ordered by effective speed (highest first) */
  turn_order: z.array(TurnEntrySchema).default([]),
  participants: z.array(BattleParticipantSchema).default([]),
  /** Global field effects (e.g. "hail", "sandstorm", "trick_room") */
  field_effects: z.array(z.string()).default([]),
  /** Battle log for this battle (cleared when battle ends) */
  log: z.array(BattleLogEntrySchema).default([]),
  /**
   * Type-specific battle data — present only when active = true.
   * The discriminated union ensures the correct shape per battle_type.
   */
  type_data: BattleTypeDataSchema.optional(),
  /** One-line summary of last action — passed to DM agent each turn */
  last_action_summary: z.string().optional(),
});

// ── Battle result (engine output → DM agent input) ────────────────────────────

export const BattleResultSchema = z.object({
  battle_id: z.string().uuid(),
  outcome: z.enum(['ongoing', 'player_won', 'player_lost', 'fled', 'caught', 'draw']),
  round: z.number().int().min(1),
  turn_summary: z.string(),
  /** XP earned per party Pokémon this turn */
  xp_earned: z.record(z.string(), z.number().int().min(0)).default({}),
  /** Affinity XP earned per trainer this turn (type → xp) */
  affinity_xp: z.record(z.string(), z.number().int().min(0)).default({}),
  badge_earned: z.string().optional(),
  caught_pokemon: z.string().optional(), // encounter_slot_id
  updated_state: BattleStateSchema,
});
