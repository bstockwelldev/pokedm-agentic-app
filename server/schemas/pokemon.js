/**
 * Pokémon Entity Schemas — STO-17
 *
 * Three entity contexts:
 *   PartyPokemonSchema  — owned by a trainer, has nickname + bond level
 *   WildPokemonSchema   — encountered in the wild, has capture state
 *   NpcPokemonSchema    — owned by a trainer NPC, no catch allowed
 *
 * These are runtime entities. Static species data comes from PokeAPI
 * (or custom-pokemon.json via the override layer — STO-22).
 */

import { z } from 'zod';

// ── Shared building blocks ────────────────────────────────────────────────────

export const MoveSchema = z.object({
  kind: z.enum(['canon', 'custom']),
  name: z.string().min(1),
  type: z.string().min(1),
  category: z.enum(['physical', 'special', 'status']),
  pp: z.number().int().min(0),
  pp_max: z.number().int().min(1),
  /** null for status moves */
  accuracy: z.number().int().min(0).max(100).nullable(),
  /** null for status moves */
  power: z.number().int().min(0).max(250).nullable(),
  simple_effect: z.string().optional(),
  notes: z.string().optional(),
});

export const AbilitySchema = z.object({
  kind: z.enum(['canon', 'custom']),
  name: z.string().min(1),
  description: z.string(),
  /** true if the hidden ability */
  hidden: z.boolean().default(false),
});

export const StatsSchema = z.object({
  hp: z.object({ current: z.number().int().min(0), max: z.number().int().min(1) }),
  attack: z.number().int().min(1),
  defense: z.number().int().min(1),
  special_attack: z.number().int().min(1),
  special_defense: z.number().int().min(1),
  speed: z.number().int().min(1),
});

export const NatureSchema = z.enum([
  'hardy', 'lonely', 'brave', 'adamant', 'naughty',
  'bold', 'docile', 'relaxed', 'impish', 'lax',
  'timid', 'hasty', 'serious', 'jolly', 'naive',
  'modest', 'mild', 'quiet', 'bashful', 'rash',
  'calm', 'gentle', 'sassy', 'careful', 'quirky',
]);

/** Status conditions active on this Pokémon right now */
export const StatusConditionSchema = z.enum([
  'burn', 'freeze', 'paralysis', 'poison', 'bad_poison',
  'sleep', 'confusion', 'flinch',
]);

// ── Species reference ─────────────────────────────────────────────────────────

export const SpeciesRefSchema = z.object({
  kind: z.enum(['canon', 'custom']),
  /** PokeAPI name (e.g. "gyarados") or custom species ID (e.g. "cstm_glacial_gyarados") */
  ref: z.string().min(1),
});

export const FormRefSchema = z.object({
  kind: z.enum(['none', 'regional_variant', 'mega', 'gigantamax', 'custom']),
  /** null when kind is "none" */
  ref: z.string().nullable().default(null),
});

// ── Party Pokémon (owned by player trainer) ───────────────────────────────────

export const PartyPokemonSchema = z.object({
  instance_id: z.string().uuid(),
  species_ref: SpeciesRefSchema,
  form_ref: FormRefSchema,
  nickname: z.string().max(12).optional(),
  typing: z.array(z.string()).min(1).max(2),
  level: z.number().int().min(1).max(100),
  nature: NatureSchema,
  ability: AbilitySchema,
  /** Up to 4 moves */
  moves: z.array(MoveSchema).min(1).max(4),
  stats: StatsSchema,
  status_conditions: z.array(StatusConditionSchema).default([]),
  /** 0–5. Bond 5 = 5% chance to survive KO at 1 HP (narrated by DM) */
  bond_level: z.number().int().min(0).max(5).default(0),
  /** 0–255 friendship score (PokeAPI style) */
  friendship: z.number().int().min(0).max(255).default(70),
  /** Set when this Pokémon was caught / received */
  obtained_at: z
    .object({
      location_id: z.string(),
      session_id: z.string(),
      method: z.enum(['caught', 'starter', 'gift', 'trade', 'hatched']),
    })
    .optional(),
  /** Lore the trainer has discovered about this Pokémon */
  known_info: z
    .object({
      lore_learned: z.array(z.string()).default([]),
      seen_moves: z.array(z.string()).default([]),
      notes: z.string().optional(),
    })
    .default({ lore_learned: [], seen_moves: [] }),
  notes: z.string().optional(),
});

// ── Wild Pokémon (encountered in the field) ───────────────────────────────────

export const CaptureStateSchema = z.object({
  attempts: z.number().int().min(0).default(0),
  last_ball_used: z.string().optional(),
  captured: z.boolean().default(false),
  captured_by_character_id: z.string().uuid().optional(),
});

export const WildPokemonSchema = z.object({
  encounter_slot_id: z.string().uuid(),
  species_ref: SpeciesRefSchema,
  form_ref: FormRefSchema,
  typing: z.array(z.string()).min(1).max(2),
  level: z.number().int().min(1).max(100),
  nature: NatureSchema,
  ability: AbilitySchema,
  moves: z.array(MoveSchema).min(1).max(4),
  stats: StatsSchema,
  status_conditions: z.array(StatusConditionSchema).default([]),
  /** Capture state — only populated during wild battles */
  capture: CaptureStateSchema.default({ attempts: 0, captured: false }),
  /** Whether the player can attempt to flee this encounter */
  flee_allowed: z.boolean().default(true),
});

// ── NPC Pokémon (trainer NPC's party) ─────────────────────────────────────────

export const NpcPokemonSchema = z.object({
  instance_id: z.string().uuid(),
  species_ref: SpeciesRefSchema,
  form_ref: FormRefSchema,
  typing: z.array(z.string()).min(1).max(2),
  level: z.number().int().min(1).max(100),
  ability: AbilitySchema,
  moves: z.array(MoveSchema).min(1).max(4),
  stats: StatsSchema,
  status_conditions: z.array(StatusConditionSchema).default([]),
  /** NPC Pokémon cannot be caught */
  catchable: z.literal(false).default(false),
});
