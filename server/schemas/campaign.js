/**
 * Campaign Config Schemas — STO-15
 *
 * Validates the 5 JSON config files that constitute a campaign:
 *   meta.json | world.json | factions.json | challenges.json | session-brief.json
 *
 * These are loaded at session start and injected into the DM agent context (STO-26).
 */

import { z } from 'zod';

// ── meta.json ────────────────────────────────────────────────────────────────

export const CampaignMetaSchema = z.object({
  campaign_id: z.string().min(1),
  title: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  region_name: z.string().min(1),
  tone: z.enum(['adventure', 'mystery', 'comedy', 'horror', 'epic']),
  age_rating: z.enum(['all-ages', 'teen', 'mature']),
  max_players: z.number().int().min(1).max(8),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

// ── world.json ───────────────────────────────────────────────────────────────

const RegionSchema = z.object({
  name: z.string(),
  theme: z.string(),
  description: z.string(),
  environment_tags: z.array(z.string()),
  climate: z.string(),
  starting_location_id: z.string(),
});

const LocationSchema = z.object({
  location_id: z.string(),
  name: z.string(),
  type: z.enum(['town', 'route', 'dungeon', 'landmark', 'gym', 'wilderness']),
  description: z.string(),
  connections: z.array(z.string()).default([]), // other location_ids
  known_by_default: z.boolean().default(false),
  level_range: z
    .object({ min: z.number().int().min(1), max: z.number().int().max(100) })
    .optional(),
  notes: z.string().optional(),
});

const WorldFactSchema = z.object({
  fact_id: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  revealed_by_default: z.boolean().default(false),
});

const RecurringNPCSchema = z.object({
  npc_id: z.string(),
  name: z.string(),
  role: z.enum(['researcher', 'merchant', 'antagonist', 'ranger', 'guide', 'gym_leader', 'rival']),
  disposition: z.enum(['friendly', 'neutral', 'tense', 'hostile']),
  home_location_id: z.string().optional(),
  faction_id: z.string().optional(),
  notes: z.string().optional(),
});

export const CampaignWorldSchema = z.object({
  campaign_id: z.string(),
  region: RegionSchema,
  locations: z.array(LocationSchema).min(1),
  world_facts: z.array(WorldFactSchema).default([]),
  recurring_npcs: z.array(RecurringNPCSchema).default([]),
});

// ── factions.json ─────────────────────────────────────────────────────────────

const FactionMemberSchema = z.object({
  npc_id: z.string(),
  role: z.enum(['leader', 'admin', 'grunt', 'researcher', 'defector']),
  notes: z.string().optional(),
});

const FactionSchema = z.object({
  faction_id: z.string(),
  name: z.string(),
  philosophy: z.string(),
  tone: z.enum(['misguided', 'idealistic', 'confused', 'ruthless', 'fanatical']),
  motivation: z.string(),
  known_members: z.array(FactionMemberSchema).default([]),
  controlled_locations: z.array(z.string()).default([]), // location_ids
  status: z.enum(['active', 'dormant', 'reformed', 'defeated']),
  notes: z.string().optional(),
});

export const CampaignFactionsSchema = z.object({
  campaign_id: z.string(),
  factions: z.array(FactionSchema).default([]),
});

// ── challenges.json ───────────────────────────────────────────────────────────

const GymChallengeSchema = z.object({
  challenge_id: z.string(),
  type: z.literal('gym'),
  leader_npc_id: z.string(),
  location_id: z.string(),
  badge_name: z.string(),
  badge_id: z.string(),
  speciality_type: z.string(), // e.g. "ice", "fire"
  recommended_level: z.number().int().min(1).max(100),
  // Scaling: party avg level used to compute actual leader team levels
  level_scale_factor: z.number().min(0.8).max(1.5).default(1.0),
  pre_battle_dialogue: z.string().optional(),
  victory_dialogue: z.string().optional(),
  defeat_dialogue: z.string().optional(),
  notes: z.string().optional(),
});

const BossChallengeSchema = z.object({
  challenge_id: z.string(),
  type: z.literal('boss'),
  leader_npc_id: z.string(),
  location_id: z.string(),
  reward: z.string(),
  recommended_level: z.number().int().min(1).max(100),
  level_scale_factor: z.number().min(0.8).max(1.5).default(1.0),
  stages: z.number().int().min(1).max(5).default(1),
  pre_battle_dialogue: z.string().optional(),
  victory_dialogue: z.string().optional(),
  notes: z.string().optional(),
});

export const ChallengeSchema = z.discriminatedUnion('type', [
  GymChallengeSchema,
  BossChallengeSchema,
]);

export const CampaignChallengesSchema = z.object({
  campaign_id: z.string(),
  challenges: z.array(ChallengeSchema).default([]),
});

// ── session-brief.json ────────────────────────────────────────────────────────
// Loaded fresh each session by the host; tells the DM what this session is about.

export const SessionBriefSchema = z.object({
  campaign_id: z.string(),
  episode_number: z.number().int().min(1),
  episode_title: z.string().min(1),
  // Where the party starts this session
  starting_location_id: z.string(),
  // Freeform setup paragraph the host writes — injected verbatim into DM system prompt
  scene_setup: z.string().min(1).max(2000),
  // Active objectives for this session (displayed in play UI, referenced by DM)
  objectives: z
    .array(
      z.object({
        objective_id: z.string(),
        description: z.string(),
        optional: z.boolean().default(false),
      })
    )
    .min(1)
    .max(10),
  // Optional DM guidance notes (not shown to players)
  dm_notes: z.string().max(1000).optional(),
  // Encounters the host explicitly pre-plans (wild spawns, scripted trainers)
  planned_encounters: z
    .array(
      z.object({
        encounter_id: z.string(),
        type: z.enum(['wild', 'trainer', 'grunt', 'gym', 'boss', 'pvp']),
        location_id: z.string(),
        trigger: z.enum(['automatic', 'player_triggered', 'scripted']),
        notes: z.string().optional(),
      })
    )
    .default([]),
  created_at: z.string().datetime(),
});

// ── Combined loader schema ────────────────────────────────────────────────────
// Used to validate a fully-loaded campaign at session start.

export const CampaignConfigSchema = z.object({
  meta: CampaignMetaSchema,
  world: CampaignWorldSchema,
  factions: CampaignFactionsSchema,
  challenges: CampaignChallengesSchema,
  session_brief: SessionBriefSchema,
});
