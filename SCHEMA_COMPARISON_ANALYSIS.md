# Session State Schema Comparison Analysis

## Overview
This document compares the example session state JSON with the actual `PokemonSessionSchema` defined in `server/schemas/session.js`.

---

## Comparison Matrix

| Aspect | Example JSON | Actual Schema | Status | Notes |
|--------|-------------|---------------|--------|-------|
| **Root Level** |
| `state_version` | ✅ Present (`"1.0.0"`) | ❌ Missing | **GAP** | Schema uses `schema_version` (optional) |
| `schema_version` | ❌ Missing | ✅ Optional field | **GAP** | Example uses different name |
| `dex` | ❌ Missing | ✅ **REQUIRED** | **CRITICAL GAP** | Must include `canon_cache` and `cache_policy` |
| `custom_dex` | ❌ Missing | ✅ **REQUIRED** | **CRITICAL GAP** | Must include `pokemon` record and `ruleset_flags` |
| `campaign` | ✅ Present (simplified) | ✅ **REQUIRED** (full structure) | **INCOMPLETE** | See Campaign section below |
| `characters` | ❌ Missing | ✅ **REQUIRED** | **CRITICAL GAP** | Example uses `trainers` instead |
| `session` | ✅ Present (simplified) | ✅ **REQUIRED** (full structure) | **INCOMPLETE** | See Session section below |
| `continuity` | ❌ Missing | ✅ **REQUIRED** | **CRITICAL GAP** | Must include `timeline`, `discovered_pokemon`, `unresolved_hooks`, `recaps` |
| `state_versioning` | ❌ Missing | ✅ **REQUIRED** | **CRITICAL GAP** | Must include `current_version`, `previous_versions` |
| **Extra Fields in Example** |
| `world_state` | ✅ Present | ❌ Not in schema | **EXTRA** | Could map to `campaign.locations` or `session.scene` |
| `trainers` | ✅ Present | ❌ Not in schema | **EXTRA** | Should be `characters` with full structure |
| `known_species_flags` | ✅ Present | ❌ Not in schema | **EXTRA** | Could map to `continuity.discovered_pokemon` |
| `next_actions` | ✅ Present | ❌ Not in schema | **EXTRA** | Could map to `session.current_objectives` or `session.player_choices` |

---

## Detailed Field-by-Field Comparison

### 1. Campaign Object

| Field | Example | Schema | Status | Notes |
|-------|---------|--------|--------|-------|
| `campaign_id` | ✅ `"celestide_isles"` | ✅ Required | ✅ Match | Correct |
| `name` | ✅ `"Celestide Isles"` | ✅ Required | ✅ Match | Correct |
| `region_type` | ✅ `"floating archipelago"` | ❌ Not in schema | **GAP** | Schema has `region.theme` (string), not `region_type` |
| `theme` | ✅ Array `["wind", "celestial energy", ...]` | ✅ Required (string) | **TYPE MISMATCH** | Schema expects single string, example has array |
| `time_of_day` | ✅ `"morning"` | ❌ Not in schema | **GAP** | Not defined in schema |
| `weather` | ✅ `"clear_wind"` | ❌ Not in schema | **GAP** | Not defined in schema |
| `region` | ❌ Missing | ✅ Required (object) | **CRITICAL GAP** | Must have: `name`, `theme`, `description`, `environment_tags[]`, `climate` |
| `locations` | ❌ Missing | ✅ Required (array) | **CRITICAL GAP** | Must have array of `LocationSchema` objects |
| `factions` | ❌ Missing | ✅ Required (array) | **CRITICAL GAP** | Must have array (can be empty) |
| `recurring_npcs` | ❌ Missing | ✅ Required (array) | **CRITICAL GAP** | Must have array (can be empty) |
| `world_facts` | ❌ Missing | ✅ Required (array) | **CRITICAL GAP** | Must have array (can be empty) |

**Example Campaign Structure:**
```json
{
  "campaign_id": "celestide_isles",
  "name": "Celestide Isles",
  "region_type": "floating archipelago",  // ❌ Not in schema
  "theme": ["wind", "celestial energy", "environmental balance"],  // ❌ Should be string
  "time_of_day": "morning",  // ❌ Not in schema
  "weather": "clear_wind"  // ❌ Not in schema
}
```

**Schema Campaign Structure:**
```typescript
{
  campaign_id: string,
  region: {
    name: string,
    theme: string,  // Single string, not array
    description: string,
    environment_tags: string[],
    climate: string
  },
  locations: LocationSchema[],
  factions: FactionSchema[],
  recurring_npcs: RecurringNPCSchema[],
  world_facts: WorldFactSchema[]
}
```

---

### 2. Session Object

| Field | Example | Schema | Status | Notes |
|-------|---------|--------|--------|-------|
| `session_id` | ✅ `"session_02"` | ✅ Required | ✅ Match | Correct |
| `previous_session_id` | ✅ `"session_01"` | ❌ Not in schema | **GAP** | Not tracked in schema |
| `title` | ✅ `"Skyfall Expanse"` | ❌ Not in schema | **GAP** | Schema uses `episode_title` |
| `status` | ✅ `"active"` | ❌ Not in schema | **GAP** | Not tracked in schema |
| `starting_location` | ✅ `"Route 2 - Southern Approach"` | ❌ Not in schema | **GAP** | Not tracked in schema |
| `last_checkpoint` | ✅ `"Skysong Harbor - Professor Liora Lab"` | ❌ Not in schema | **GAP** | Not tracked in schema |
| `narrative_flags` | ✅ Object with flags | ❌ Not in schema | **GAP** | Could map to `event_log` or `continuity.unresolved_hooks` |
| `campaign_id` | ❌ Missing | ✅ Required | **GAP** | Must be present |
| `character_ids` | ❌ Missing | ✅ Required (array) | **CRITICAL GAP** | Must have array of character IDs |
| `episode_title` | ❌ Missing | ✅ Required | **GAP** | Example has `title` instead |
| `scene` | ❌ Missing | ✅ Required (object) | **CRITICAL GAP** | Must have: `location_id`, `description`, `mood` |
| `current_objectives` | ❌ Missing | ✅ Required (array) | **CRITICAL GAP** | Must have array (can be empty) |
| `encounters` | ❌ Missing | ✅ Required (array) | **CRITICAL GAP** | Must have array (can be empty) |
| `battle_state` | ❌ Missing | ✅ Required (object) | **CRITICAL GAP** | Must have: `active`, `round`, `turn_order[]`, `field_effects[]` |
| `fail_soft_flags` | ❌ Missing | ✅ Required (object) | **CRITICAL GAP** | Must have failure tracking flags |
| `player_choices` | ❌ Missing | ✅ Required (object) | **CRITICAL GAP** | Must have: `options_presented[]`, `safe_default?`, `last_choice?` |
| `controls` | ❌ Missing | ✅ Required (object) | **CRITICAL GAP** | Must have: `pause_requested`, `skip_requested`, `explain_requested` |
| `event_log` | ❌ Missing | ✅ Required (array) | **CRITICAL GAP** | Must have array (can be empty) |

**Example Session Structure:**
```json
{
  "session_id": "session_02",
  "previous_session_id": "session_01",  // ❌ Not in schema
  "title": "Skyfall Expanse",  // ❌ Should be episode_title
  "status": "active",  // ❌ Not in schema
  "starting_location": "...",  // ❌ Not in schema
  "last_checkpoint": "...",  // ❌ Not in schema
  "narrative_flags": { ... }  // ❌ Not in schema
}
```

**Schema Session Structure:**
```typescript
{
  session_id: string,
  campaign_id: string,  // ❌ Missing in example
  character_ids: string[],  // ❌ Missing in example
  episode_title: string,  // ❌ Missing (example has "title")
  scene: { location_id, description, mood },  // ❌ Missing
  current_objectives: ObjectiveSchema[],  // ❌ Missing
  encounters: EncounterSchema[],  // ❌ Missing
  battle_state: BattleStateSchema,  // ❌ Missing
  fail_soft_flags: FailSoftFlagsSchema,  // ❌ Missing
  player_choices: PlayerChoicesSchema,  // ❌ Missing
  controls: ControlsSchema,  // ❌ Missing
  event_log: EventLogEntrySchema[]  // ❌ Missing
}
```

---

### 3. Trainers vs Characters

| Aspect | Example (`trainers`) | Schema (`characters`) | Status | Notes |
|--------|---------------------|----------------------|--------|-------|
| **Root Key** | `trainers` | `characters` | **KEY MISMATCH** | Wrong property name |
| **Structure** | Simplified | Full `CharacterSchema` | **INCOMPLETE** | See details below |

**Example Trainer Structure:**
```json
{
  "trainer_id": "valion",  // ❌ Should be character_id
  "name": "Valion",
  "class": "Scout",  // ❌ Not in schema (could map to trainer.background)
  "level": 1,  // ❌ Not in schema
  "milestones": ["environmental_hazard_resolution"],  // ❌ Should be progression.milestones[]
  "party": [  // ❌ Should be pokemon_party
    {
      "pokemon_id": "dreepy",  // ❌ Should be instance_id
      "species": "Dreepy",  // ❌ Should be species_ref object
      "level": 5,
      "experience": { ... },  // ❌ Not in schema
      "hp": { current: 20, max: 20 },  // ❌ Should be stats.hp
      "status": "healthy"  // ❌ Should be status_conditions[]
    }
  ]
}
```

**Schema Character Structure:**
```typescript
{
  character_id: string,  // ❌ Example uses trainer_id
  trainer: {
    name: string,
    age_group: 'child' | 'teen' | 'adult',  // ❌ Missing
    background: string,  // ❌ Missing (example has "class")
    personality_traits: string[],  // ❌ Missing
    bonds: BondSchema[]  // ❌ Missing
  },
  inventory: {
    items: InventoryItemSchema[],
    pokeballs: { poke_ball, great_ball, ultra_ball },
    key_items: KeyItemSchema[]
  },  // ❌ Missing
  pokemon_party: PokemonPartyMemberSchema[],  // ❌ Example uses "party"
  achievements: AchievementSchema[],  // ❌ Missing
  progression: {
    badges: number,
    milestones: MilestoneSchema[]  // ❌ Example has simple strings
  }
}
```

**Pokemon Party Member Differences:**

| Field | Example | Schema | Status |
|-------|---------|--------|--------|
| `pokemon_id` | ✅ Present | ❌ Should be `instance_id` | **KEY MISMATCH** |
| `species` | ✅ String `"Dreepy"` | ✅ Required (object `SpeciesRefSchema`) | **TYPE MISMATCH** |
| `variant` | ✅ `"Celestide"` | ❌ Should be in `form_ref` | **STRUCTURE MISMATCH** |
| `form_stage` | ✅ `"juvenile"` | ❌ Should be in `form_ref` | **STRUCTURE MISMATCH** |
| `level` | ✅ Present | ✅ Required | ✅ Match |
| `experience` | ✅ Object with `current_xp`, `xp_to_next` | ❌ Not in schema | **EXTRA** |
| `hp` | ✅ Object `{current, max}` | ✅ Required (in `stats.hp`) | **STRUCTURE MISMATCH** |
| `status` | ✅ String `"healthy"` | ✅ Required (array `status_conditions[]`) | **TYPE MISMATCH** |
| `typing` | ✅ Array (when present) | ✅ Required | ✅ Match |
| `ability` | ❌ Missing | ✅ Required (object) | **CRITICAL GAP** |
| `moves` | ❌ Missing | ✅ Required (array) | **CRITICAL GAP** |
| `stats` | ❌ Missing (only hp) | ✅ Required (full stats object) | **CRITICAL GAP** |
| `friendship` | ❌ Missing | ✅ Required | **CRITICAL GAP** |
| `known_info` | ❌ Missing | ✅ Required | **CRITICAL GAP** |
| `nickname` | ❌ Missing | ✅ Optional | **GAP** |
| `form_ref` | ❌ Missing | ✅ Required | **CRITICAL GAP** |

---

### 4. World State (Extra Field)

| Field | Example | Schema Mapping | Status |
|-------|---------|----------------|--------|
| `locations` | ✅ Object with location data | Could map to `campaign.locations[]` | **NEEDS MAPPING** |
| `global_effects` | ✅ Object | ❌ Not in schema | **EXTRA** |

**Example World State:**
```json
{
  "locations": {
    "Skysong Harbor": {
      "status": "stable",
      "services": ["pokemon_center", ...],
      "npc_presence": ["Professor Liora"]
    }
  },
  "global_effects": {
    "wind_instability": "reduced_near_harbor",
    "pokemon_migration": "disrupted",
    "environment_reacts_to_players": true
  }
}
```

**Schema Mapping:**
- `world_state.locations` → `campaign.locations[]` (needs transformation)
- `world_state.global_effects` → Could be `campaign.world_facts[]` or `session.event_log[]`

---

### 5. Known Species Flags (Extra Field)

| Field | Example | Schema Mapping | Status |
|-------|---------|----------------|--------|
| `celestide_variant_known` | ✅ Boolean | Could map to `continuity.discovered_pokemon[]` | **NEEDS MAPPING** |
| `alternate_evolution_known` | ✅ Boolean | Could map to `continuity.discovered_pokemon[]` | **NEEDS MAPPING** |
| `cosmoros_species_revealed` | ✅ Boolean | Could map to `continuity.discovered_pokemon[]` | **NEEDS MAPPING** |

**Schema Mapping:**
- Should be converted to `continuity.discovered_pokemon[]` entries with proper `DiscoveredPokemonSchema` structure

---

### 6. Next Actions (Extra Field)

| Field | Example | Schema Mapping | Status |
|-------|---------|----------------|--------|
| `session_2_entry` | ✅ String | Could map to `session.current_objectives[]` | **NEEDS MAPPING** |
| `default_choice` | ✅ String | Could map to `session.player_choices.safe_default` | **NEEDS MAPPING** |
| `encounter_roll_ready` | ✅ Boolean | ❌ Not in schema | **EXTRA** |

---

## Critical Missing Required Fields

### 1. `dex` (REQUIRED)
```typescript
{
  canon_cache: {
    pokemon: Record<string, unknown>,
    moves: Record<string, unknown>,
    abilities: Record<string, unknown>,
    types: Record<string, unknown>,
    species: Record<string, unknown>,
    evolution_chains: Record<string, unknown>,
    items: Record<string, unknown>,
    locations: Record<string, unknown>,
    generations: Record<string, unknown>
  },
  cache_policy: {
    source: 'pokeapi',
    gen_range: string,  // e.g., "1-9"
    ttl_hours: number,
    max_entries_per_kind: number,
    notes?: string
  }
}
```

### 2. `custom_dex` (REQUIRED)
```typescript
{
  pokemon: Record<string, CustomPokemonSchema>,
  ruleset_flags: {
    allow_new_species: boolean
  },
  notes?: string
}
```

### 3. `continuity` (REQUIRED)
```typescript
{
  timeline: TimelineEntrySchema[],
  discovered_pokemon: DiscoveredPokemonSchema[],
  unresolved_hooks: UnresolvedHookSchema[],
  recaps: RecapSchema[]
}
```

### 4. `state_versioning` (REQUIRED)
```typescript
{
  current_version: string,
  previous_versions: string[],
  migration_notes?: string,
  last_migrated_at?: string
}
```

---

## Summary of Issues

### 🔴 Critical Gaps (Required Fields Missing)
1. **`dex`** - Complete missing, required for canon Pokémon data caching
2. **`custom_dex`** - Complete missing, required for custom Pokémon registry
3. **`characters`** - Missing (example uses `trainers` with wrong structure)
4. **`session.scene`** - Missing, required for current location/context
5. **`session.battle_state`** - Missing, required (even if `active: false`)
6. **`session.fail_soft_flags`** - Missing, required for difficulty tracking
7. **`session.player_choices`** - Missing, required for choice system
8. **`session.controls`** - Missing, required for pause/skip/explain
9. **`session.event_log`** - Missing, required array (can be empty)
10. **`continuity`** - Complete missing, required for campaign continuity
11. **`state_versioning`** - Complete missing, required for version tracking
12. **`campaign.region`** - Missing full region object
13. **`campaign.locations`** - Missing array (can be empty)
14. **`campaign.factions`** - Missing array (can be empty)
15. **`campaign.recurring_npcs`** - Missing array (can be empty)
16. **`campaign.world_facts`** - Missing array (can be empty)

### 🟡 Structural Mismatches
1. **Root key**: `trainers` → should be `characters`
2. **Campaign**: `theme` is array → should be string
3. **Session**: `title` → should be `episode_title`
4. **Pokemon**: `pokemon_id` → should be `instance_id`
5. **Pokemon**: `species` is string → should be `SpeciesRefSchema` object
6. **Pokemon**: `hp` at root → should be in `stats.hp`
7. **Pokemon**: `status` is string → should be `status_conditions[]` array
8. **Pokemon**: Missing `ability`, `moves`, `stats`, `friendship`, `known_info`, `form_ref`

### 🟢 Extra Fields (Not in Schema)
1. **`world_state`** - Could be mapped to `campaign.locations` and `session.scene`
2. **`known_species_flags`** - Could be mapped to `continuity.discovered_pokemon`
3. **`next_actions`** - Could be mapped to `session.current_objectives` and `session.player_choices`
4. **`session.previous_session_id`** - Not tracked in schema
5. **`session.status`** - Not tracked in schema
6. **`session.starting_location`** - Not tracked in schema
7. **`session.last_checkpoint`** - Not tracked in schema
8. **`session.narrative_flags`** - Could be mapped to `event_log` or `continuity.unresolved_hooks`
9. **Pokemon `experience`** - Not in schema (XP tracking not defined)

---

## Recommendations

### 1. Immediate Fixes Required
- Add all **REQUIRED** fields from schema
- Rename `trainers` → `characters`
- Transform simplified structures to match schema
- Add `dex`, `custom_dex`, `continuity`, `state_versioning` objects

### 2. Data Transformation Needed
- Convert `world_state.locations` → `campaign.locations[]`
- Convert `known_species_flags` → `continuity.discovered_pokemon[]`
- Convert `next_actions` → `session.current_objectives[]` and `session.player_choices`
- Convert `trainers[].party[]` → `characters[].pokemon_party[]` with full structure
- Convert Pokemon `species` string → `SpeciesRefSchema` object
- Convert Pokemon `hp` → `stats.hp` and add full stats
- Convert Pokemon `status` string → `status_conditions[]` array

### 3. Schema Enhancements to Consider
- Add `previous_session_id` to `SessionSchema` for session chaining
- Add `status` field to `SessionSchema` for active/completed states
- Add `starting_location` and `last_checkpoint` to `SessionSchema`
- Add `narrative_flags` or similar to track story progression
- Add `experience` tracking to `PokemonPartyMemberSchema` if XP system is needed
- Consider adding `time_of_day` and `weather` to `CampaignSchema` or `SceneSchema`
- Consider adding `world_state.global_effects` to schema if needed

### 4. Validation Impact
The example JSON would **FAIL** schema validation due to:
- Missing required root fields (`dex`, `custom_dex`, `continuity`, `state_versioning`)
- Missing required nested fields (`session.scene`, `session.battle_state`, etc.)
- Type mismatches (`theme` array vs string, `status` string vs array)
- Key name mismatches (`trainers` vs `characters`, `pokemon_id` vs `instance_id`)

---

## Migration Path

### Automated Migration (Recommended)

A migration utility has been created to automatically transform example/legacy session JSON to schema-compliant format:

**Location**: `server/lib/migrateSession.js`

**Usage Options**:

1. **Via Import API** (Automatic):
   - The `/api/import` endpoint automatically detects legacy format
   - If legacy format is detected, it automatically migrates before importing
   - Returns `migrated: true` in response if migration occurred

2. **Via Migration Script**:
   ```bash
   node server/scripts/migrate-example-session.js example-session.json migrated-session.json
   ```

3. **Programmatically**:
   ```javascript
   import { migrateExampleToSchema, validateMigratedSession } from './lib/migrateSession.js';
   import { PokemonSessionSchema } from './schemas/session.js';
   
   const migrated = migrateExampleToSchema(exampleSession);
   const validation = validateMigratedSession(migrated, PokemonSessionSchema);
   ```

**What the Migration Does**:

1. ✅ Adds all missing required root fields (`dex`, `custom_dex`, `continuity`, `state_versioning`)
2. ✅ Transforms `trainers` → `characters` with full structure
3. ✅ Transforms Pokemon party members to match `PokemonPartyMemberSchema`
4. ✅ Adds `session.scene` from `world_state.locations` or `session.starting_location`
5. ✅ Adds `session.battle_state` with `active: false` and empty arrays
6. ✅ Adds `session.fail_soft_flags` with default values
7. ✅ Adds `session.player_choices` from `next_actions.default_choice`
8. ✅ Adds `session.controls` with default `false` values
9. ✅ Adds `session.event_log` as empty array
10. ✅ Transforms `campaign` to include full `region` object and arrays
11. ✅ Adds `continuity` from `known_species_flags` and other data
12. ✅ Adds `state_versioning` with current version info

### Manual Migration Steps

If you need to manually convert the example JSON to valid schema format, follow these steps:

1. **Add missing root fields** with default/empty values
2. **Transform `trainers` → `characters`** with full structure
3. **Transform Pokemon party members** to match `PokemonPartyMemberSchema`
4. **Add `session.scene`** from `world_state.locations` or `session.starting_location`
5. **Add `session.battle_state`** with `active: false` and empty arrays
6. **Add `session.fail_soft_flags`** with default values
7. **Add `session.player_choices`** from `next_actions.default_choice`
8. **Add `session.controls`** with default `false` values
9. **Add `session.event_log`** as empty array
10. **Transform `campaign`** to include full `region` object and arrays
11. **Add `continuity`** from `known_species_flags` and other data
12. **Add `state_versioning`** with current version info

---

**Document Version**: 1.1  
**Date**: 2026-01-27  
**Schema Version**: 1.1.0 (from `server/schemas/session.js`)  
**Migration Utility**: `server/lib/migrateSession.js`
