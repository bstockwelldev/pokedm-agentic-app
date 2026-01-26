import { z } from 'zod';
import { SpeciesRefSchema, FormRefSchema } from './references.js';
import { CustomPokemonSchema } from './customPokemon.js';

/**
 * Session State Schema v1.1.0
 * Complete schema matching pokedm-session-state-schema.json
 */

// Cache Policy Schema
const CachePolicySchema = z.object({
  source: z.literal('pokeapi'),
  gen_range: z.string().regex(/^\d+-\d+$/), // e.g., "1-9"
  ttl_hours: z.number().int().positive(),
  max_entries_per_kind: z.number().int().positive(),
  notes: z.string().optional(),
});

// Dex Schema - Canon cache and policy
const DexSchema = z.object({
  canon_cache: z.object({
    pokemon: z.record(z.unknown()),
    moves: z.record(z.unknown()),
    abilities: z.record(z.unknown()),
    types: z.record(z.unknown()),
    species: z.record(z.unknown()),
    evolution_chains: z.record(z.unknown()),
    items: z.record(z.unknown()),
    locations: z.record(z.unknown()),
    generations: z.record(z.unknown()),
  }),
  cache_policy: CachePolicySchema,
});

// Custom Dex Schema
const CustomDexSchema = z.object({
  pokemon: z.record(CustomPokemonSchema),
  ruleset_flags: z.object({
    allow_new_species: z.boolean(),
  }),
  notes: z.string().optional(),
});

// Campaign Region Schema
const RegionSchema = z.object({
  name: z.string(),
  theme: z.string(),
  description: z.string(),
  environment_tags: z.array(z.string()),
  climate: z.string(),
});

// Location Schema
const LocationSchema = z.object({
  location_id: z.string(),
  name: z.string(),
  type: z.enum(['town', 'route', 'dungeon', 'landmark']),
  description: z.string(),
  known: z.boolean(),
});

// Faction Member Schema
const FactionMemberSchema = z.object({
  npc_id: z.string(),
  role: z.enum(['leader', 'grunt', 'researcher', 'merchant', 'ranger']),
  notes: z.string().optional(),
});

// Faction Schema
const FactionSchema = z.object({
  faction_id: z.string(),
  name: z.string(),
  philosophy: z.string(),
  tone: z.enum(['misguided', 'idealistic', 'confused']),
  known_members: z.array(FactionMemberSchema),
  status: z.enum(['active', 'dormant', 'reformed']),
});

// Recurring NPC Schema
const RecurringNPCSchema = z.object({
  npc_id: z.string(),
  name: z.string(),
  role: z.enum(['researcher', 'merchant', 'antagonist', 'ranger', 'guide']),
  disposition: z.enum(['friendly', 'neutral', 'tense']),
  notes: z.string().optional(),
  home_location_id: z.string().optional(),
  faction_id: z.string().optional(),
});

// World Fact Schema
const WorldFactSchema = z.object({
  fact_id: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  revealed: z.boolean(),
});

// Campaign Schema
const CampaignSchema = z.object({
  campaign_id: z.string(),
  region: RegionSchema,
  locations: z.array(LocationSchema),
  factions: z.array(FactionSchema),
  recurring_npcs: z.array(RecurringNPCSchema),
  world_facts: z.array(WorldFactSchema),
});

// Trainer Bond Schema
const BondSchema = z.object({
  bond_id: z.string(),
  target: z.string(), // pokemon_instance_id | npc_id | place | idea
  description: z.string(),
});

// Trainer Schema
const TrainerSchema = z.object({
  name: z.string(),
  age_group: z.enum(['child', 'teen', 'adult']),
  background: z.string(),
  personality_traits: z.array(z.string()),
  bonds: z.array(BondSchema),
});

// Inventory Item Schema
const InventoryItemSchema = z.object({
  kind: z.enum(['canon', 'custom']),
  ref: z.string(), // e.g., "canon:potion"
  quantity: z.number().int().min(0),
  notes: z.string().optional(),
});

// Pokeballs Schema
const PokeballsSchema = z.object({
  poke_ball: z.number().int().min(0),
  great_ball: z.number().int().min(0),
  ultra_ball: z.number().int().min(0),
});

// Key Item Schema
const KeyItemSchema = z.object({
  kind: z.enum(['canon', 'custom']),
  ref: z.string(),
  notes: z.string().optional(),
});

// Inventory Schema
const InventorySchema = z.object({
  items: z.array(InventoryItemSchema),
  pokeballs: PokeballsSchema,
  key_items: z.array(KeyItemSchema),
});

// Move Schema (for party/encounter)
const MoveSchema = z.object({
  kind: z.enum(['canon', 'custom']),
  name: z.string(),
  type: z.string(),
  category: z.enum(['physical', 'special', 'status']),
  pp: z.number().int().min(0),
  accuracy: z.number().int().min(0).max(100).nullable(),
  power: z.number().int().min(0).max(200).nullable(),
  notes: z.string().optional(),
  simple_effect: z.string().optional(),
});

// Ability Schema (for party/encounter)
const AbilitySchema = z.object({
  kind: z.enum(['canon', 'custom']),
  name: z.string(),
  description: z.string(),
});

// HP Schema
const HPSchema = z.object({
  current: z.number().int().min(0),
  max: z.number().int().min(1),
});

// Stats Schema
const StatsSchema = z.object({
  hp: HPSchema,
  attack: z.number().int().min(0),
  defense: z.number().int().min(0),
  special_attack: z.number().int().min(0),
  special_defense: z.number().int().min(0),
  speed: z.number().int().min(0),
});

// Known Info Schema
const KnownInfoSchema = z.object({
  met_at: z.object({
    location_id: z.string(),
    session_id: z.string(),
  }),
  lore_learned: z.array(z.string()),
  seen_moves: z.array(z.string()),
  notes: z.string().optional(),
});

// Pokemon Party Member Schema
const PokemonPartyMemberSchema = z.object({
  instance_id: z.string(),
  species_ref: SpeciesRefSchema,
  nickname: z.string().optional(),
  form_ref: FormRefSchema,
  typing: z.array(z.string()).min(1).max(2),
  level: z.number().int().min(1).max(100),
  ability: AbilitySchema,
  moves: z.array(MoveSchema),
  stats: StatsSchema,
  status_conditions: z.array(z.string()),
  friendship: z.number().int().min(0).max(255),
  known_info: KnownInfoSchema,
  notes: z.string().optional(),
});

// Achievement Schema
const AchievementSchema = z.object({
  achievement_id: z.string(),
  title: z.string(),
  description: z.string(),
  earned_in_session_id: z.string(),
});

// Milestone Schema
const MilestoneSchema = z.object({
  milestone_id: z.string(),
  title: z.string(),
  description: z.string(),
  completed: z.boolean(),
});

// Progression Schema
const ProgressionSchema = z.object({
  badges: z.number().int().min(0).max(8),
  milestones: z.array(MilestoneSchema),
});

// Character Schema
const CharacterSchema = z.object({
  character_id: z.string(),
  trainer: TrainerSchema,
  inventory: InventorySchema,
  pokemon_party: z.array(PokemonPartyMemberSchema),
  achievements: z.array(AchievementSchema),
  progression: ProgressionSchema,
});

// Scene Schema
const SceneSchema = z.object({
  location_id: z.string(),
  description: z.string(),
  mood: z.enum(['calm', 'tense', 'adventurous']),
});

// Objective Schema
const ObjectiveSchema = z.object({
  objective_id: z.string(),
  description: z.string(),
  status: z.enum(['active', 'completed', 'failed_soft']),
  notes: z.string().optional(),
});

// Encounter Participant Schema
const EncounterParticipantSchema = z.object({
  participant_id: z.string(),
  kind: z.enum([
    'party_pokemon',
    'npc_trainer',
    'npc_pokemon',
    'wild_pokemon',
    'environmental',
  ]),
  ref: z.string(), // pokemon_instance_id | npc_id | encounter_slot_id
  notes: z.string().optional(),
});

// Capture Schema
const CaptureSchema = z.object({
  attempts: z.number().int().min(0),
  captured_by_character_id: z.string().optional(),
  result: z.enum(['not_attempted', 'failed', 'succeeded']),
});

// Wild Slot Schema
const WildSlotSchema = z.object({
  encounter_slot_id: z.string(),
  species_ref: SpeciesRefSchema,
  form_ref: FormRefSchema,
  level: z.number().int().min(1).max(100),
  typing: z.array(z.string()).min(1).max(2),
  ability: AbilitySchema,
  moves: z.array(MoveSchema),
  stats: StatsSchema,
  status_conditions: z.array(z.string()),
  capture: CaptureSchema,
});

// Encounter Outcome Schema
const EncounterOutcomeSchema = z.object({
  summary: z.string(),
  fail_soft_applied: z.boolean(),
  new_story_path: z.string().optional(),
});

// Encounter Schema
const EncounterSchema = z.object({
  encounter_id: z.string(),
  type: z.enum(['wild', 'trainer', 'environmental']),
  difficulty: z.enum(['easy', 'normal', 'hard']),
  status: z.enum(['active', 'resolved', 'bypassed']),
  participants: z.array(EncounterParticipantSchema),
  wild_slots: z.array(WildSlotSchema),
  outcome: EncounterOutcomeSchema.optional(),
});

// Turn Order Schema
const TurnOrderSchema = z.object({
  slot: z.number().int().min(1),
  participant_kind: z.enum(['party_pokemon', 'wild_pokemon', 'npc_pokemon']),
  ref: z.string(), // pokemon_instance_id | encounter_slot_id
  fainted: z.boolean(),
});

// Battle State Schema
const BattleStateSchema = z.object({
  active: z.boolean(),
  encounter_id: z.string().nullish().transform((val) => val === null ? undefined : val),
  round: z.number().int().min(0),
  turn_order: z.array(TurnOrderSchema),
  field_effects: z.array(z.string()),
  last_action_summary: z.string().nullish().transform((val) => val === null ? undefined : val),
});

// Fail Soft Flags Schema
const FailSoftFlagsSchema = z.object({
  recent_failures: z.number().int().min(0),
  recent_successes: z.number().int().min(0),
  difficulty_adjusted: z.boolean(),
  party_confidence: z.enum(['low', 'medium', 'high']),
  auto_scaled_last_encounter: z.boolean(),
});

// Player Choice Option Schema
const PlayerChoiceOptionSchema = z.object({
  option_id: z.string(),
  label: z.string(),
  description: z.string(),
  risk_level: z.enum(['low', 'medium', 'high']),
});

// Last Choice Schema
const LastChoiceSchema = z.object({
  option_id: z.string(),
  timestamp: z.string(),
});

// Player Choices Schema
const PlayerChoicesSchema = z.object({
  options_presented: z.array(PlayerChoiceOptionSchema),
  safe_default: z.string().nullish().transform((val) => val === null ? undefined : val),
  last_choice: LastChoiceSchema.nullish().transform((val) => val === null ? undefined : val),
});

// Controls Schema
const ControlsSchema = z.object({
  pause_requested: z.boolean(),
  skip_requested: z.boolean(),
  explain_requested: z.boolean(),
  explain_depth: z.enum(['kid', 'adult']).nullish().transform((val) => val === null ? undefined : val),
});

// Event Log Entry Schema
const EventLogEntrySchema = z.object({
  t: z.string(), // timestamp
  kind: z.enum([
    'scene',
    'choice',
    'encounter',
    'battle',
    'discovery',
    'reward',
    'recap',
  ]),
  summary: z.string(),
  details: z.string().optional(),
});

// Session Schema
const SessionSchema = z.object({
  session_id: z.string(),
  campaign_id: z.string(),
  character_ids: z.array(z.string()),
  episode_title: z.string(),
  scene: SceneSchema,
  current_objectives: z.array(ObjectiveSchema),
  encounters: z.array(EncounterSchema),
  battle_state: BattleStateSchema,
  fail_soft_flags: FailSoftFlagsSchema,
  player_choices: PlayerChoicesSchema,
  controls: ControlsSchema,
  event_log: z.array(EventLogEntrySchema),
});

// Timeline Entry Schema
const TimelineEntrySchema = z.object({
  session_id: z.string(),
  episode_title: z.string(),
  summary: z.string(),
  canonized: z.boolean(),
  date: z.string(),
  tags: z.array(z.string()),
});

// Discovered Pokemon Schema
const DiscoveredPokemonSchema = z.object({
  species_ref: SpeciesRefSchema,
  form_ref: FormRefSchema,
  first_seen_location_id: z.string(),
  first_seen_session_id: z.string(),
  notes: z.string().optional(),
});

// Unresolved Hook Schema
const UnresolvedHookSchema = z.object({
  hook_id: z.string(),
  description: z.string(),
  urgency: z.enum(['low', 'medium', 'high']),
  introduced_in_session_id: z.string(),
  linked_faction_id: z.string().optional(),
  linked_location_id: z.string().optional(),
  status: z.enum(['open', 'progressed', 'resolved']),
});

// Recap Schema
const RecapSchema = z.object({
  recap_id: z.string(),
  scope: z.enum(['campaign', 'character']),
  target_id: z.string(), // campaign_id | character_id
  text: z.string(),
  updated_in_session_id: z.string(),
});

// Continuity Schema
const ContinuitySchema = z.object({
  timeline: z.array(TimelineEntrySchema),
  discovered_pokemon: z.array(DiscoveredPokemonSchema),
  unresolved_hooks: z.array(UnresolvedHookSchema),
  recaps: z.array(RecapSchema),
});

// State Versioning Schema
const StateVersioningSchema = z.object({
  current_version: z.string(),
  previous_versions: z.array(z.string()),
  migration_notes: z.string().optional(),
  last_migrated_at: z.string().optional(),
});

// Root Pokemon Session Schema with null cleanup
export const PokemonSessionSchema = z.object({
  schema_version: z.string().optional(), // For backward compatibility
  dex: DexSchema,
  custom_dex: CustomDexSchema,
  campaign: CampaignSchema.nullable().transform((val) => val || {
    campaign_id: '',
    region: { name: '', theme: '', description: '', environment_tags: [], climate: '' },
    locations: [],
    factions: [],
    recurring_npcs: [],
    world_facts: [],
  }),
  characters: z.array(CharacterSchema),
  session: SessionSchema,
  continuity: ContinuitySchema,
  state_versioning: StateVersioningSchema,
}).transform((data) => {
  // Clean up null values for optional fields
  if (data.session.battle_state.encounter_id === null) {
    delete data.session.battle_state.encounter_id;
  }
  if (data.session.battle_state.last_action_summary === null) {
    delete data.session.battle_state.last_action_summary;
  }
  if (data.session.player_choices.safe_default === null) {
    delete data.session.player_choices.safe_default;
  }
  if (data.session.player_choices.last_choice === null) {
    delete data.session.player_choices.last_choice;
  }
  if (data.session.controls.explain_depth === null) {
    delete data.session.controls.explain_depth;
  }
  return data;
});

// TypeScript type (for TypeScript projects):
// export type PokemonSession = z.infer<typeof PokemonSessionSchema>;

// Export individual schemas for use in validation
export {
  DexSchema,
  CustomDexSchema,
  CampaignSchema,
  CharacterSchema,
  SessionSchema,
  ContinuitySchema,
  StateVersioningSchema,
  SpeciesRefSchema,
  FormRefSchema,
};
