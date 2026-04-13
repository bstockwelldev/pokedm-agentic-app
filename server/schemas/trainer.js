/**
 * Trainer / Player Schemas — STO-16
 *
 * Covers trainer identity, type affinity progression (rank 1-10 per type),
 * and player profile as a session participant.
 *
 * TypeAffinity is the core progression mechanic: trainers earn XP in 1-2 types
 * through battle actions. Rank-up milestones unlock passive bonuses.
 */

import { z } from 'zod';

// ── Type Affinity ─────────────────────────────────────────────────────────────

/**
 * XP thresholds per rank (cumulative).
 * Exported so the affinity engine (STO-25) can import these constants.
 */
export const AFFINITY_XP_THRESHOLDS = [
  0,    // rank 1 (starting)
  200,  // rank 2
  450,  // rank 3
  750,  // rank 4
  1100, // rank 5
  1500, // rank 6
  1950, // rank 7
  2450, // rank 8
  3000, // rank 9
  3600, // rank 10 (mastery)
];

/**
 * Milestone bonuses unlocked at each rank.
 * The affinity engine reads these; the DM agent narrates them.
 */
export const AFFINITY_MILESTONES = {
  2: { id: 'catch_bonus',     label: '+5% catch rate, +2% stat multiplier for this type' },
  3: { id: 'type_sense',      label: 'Type Sense — DM describes matchups unprompted' },
  5: { id: 'signature_perk',  label: 'Signature Perk (campaign-defined)' },
  7: { id: 'deep_bond',       label: 'Deep Bond — +1 to all d20 rolls for this type\'s Pokémon' },
  10: { id: 'type_mastery',   label: 'Type Mastery — signature Pokémon learns extra move' },
};

export const TypeAffinitySchema = z.object({
  /** Pokémon type name (lowercase), e.g. "ice", "water", "dragon" */
  type: z.string().toLowerCase().min(1),
  /** Current rank 1–10 */
  rank: z.number().int().min(1).max(10).default(1),
  /** Cumulative XP earned in this type */
  xp: z.number().int().min(0).default(0),
  /** IDs of milestone bonuses already unlocked (populated by affinity engine) */
  unlocked_milestones: z.array(z.string()).default([]),
  /**
   * Optional campaign-defined signature perk text (set at rank 5 unlock).
   * e.g. "Ice: Frozen Resolve — immune to freeze status once per battle"
   */
  signature_perk: z.string().optional(),
});

// ── Trainer identity ──────────────────────────────────────────────────────────

const BondSchema = z.object({
  bond_id: z.string(),
  /** pokemon_instance_id | npc_id | place name | concept */
  target: z.string(),
  description: z.string(),
});

export const TrainerIdentitySchema = z.object({
  name: z.string().min(1),
  age_group: z.enum(['child', 'teen', 'adult']),
  background: z.string().default(''),
  personality_traits: z.array(z.string()).default([]),
  bonds: z.array(BondSchema).default([]),
});

// ── Player profile ─────────────────────────────────────────────────────────────
// Extends trainer identity with session-runtime progression data.

export const PlayerProfileSchema = z.object({
  character_id: z.string().uuid(),
  campaign_id: z.string(),
  trainer: TrainerIdentitySchema,
  /**
   * 1–2 type affinities per trainer (enforced by campaign config at creation time).
   * The affinity engine (STO-25) mutates these during battles.
   */
  type_affinities: z
    .array(TypeAffinitySchema)
    .min(1)
    .max(2)
    .default([{ type: 'normal', rank: 1, xp: 0, unlocked_milestones: [] }]),
  /** Badge IDs earned this campaign */
  badges: z.array(z.string()).default([]),
  /** Total sessions played */
  sessions_played: z.number().int().min(0).default(0),
  /** Trainer-level XP (separate from Pokémon XP — tracks overall campaign progression) */
  trainer_xp: z.number().int().min(0).default(0),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// ── Active trainer indicator (session runtime) ────────────────────────────────
// Tracks whose turn it is in shared-device group play.

export const ActiveTrainerSchema = z.object({
  character_id: z.string().uuid(),
  turn_index: z.number().int().min(0),
  /** Rotation order — character_ids in the order they take turns */
  rotation: z.array(z.string().uuid()).min(1),
});
