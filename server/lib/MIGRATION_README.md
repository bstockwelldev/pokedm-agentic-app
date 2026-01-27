# Session Migration Utility

## Overview

The migration utility (`migrateSession.js`) automatically transforms example/legacy session JSON formats into schema-compliant `PokemonSessionSchema` format.

## Features

- ✅ Automatic detection of legacy format
- ✅ Complete transformation of all required fields
- ✅ Schema validation after migration
- ✅ Preserves as much data as possible from source
- ✅ Provides sensible defaults for missing required fields

## Usage

### 1. Automatic Migration via Import API

The `/api/import` endpoint automatically detects and migrates legacy format sessions:

```javascript
// POST /api/import
{
  "session_data": { /* legacy format session */ },
  "options": {
    "import_components": ["all"]
  }
}

// Response includes:
{
  "sessionId": "...",
  "session": { /* migrated, schema-compliant session */ },
  "migrated": true,  // Indicates migration occurred
  "warnings": ["Legacy session format detected and automatically migrated..."]
}
```

### 2. Standalone Migration Script

```bash
# From project root
node server/scripts/migrate-example-session.js input.json output.json
```

### 3. Programmatic Usage

```javascript
import { 
  migrateExampleToSchema, 
  validateMigratedSession,
  isLegacyFormat 
} from './lib/migrateSession.js';
import { PokemonSessionSchema } from './schemas/session.js';

// Check if migration is needed
if (isLegacyFormat(sessionData)) {
  // Migrate
  const migrated = migrateExampleToSchema(sessionData);
  
  // Validate
  const validation = validateMigratedSession(migrated, PokemonSessionSchema);
  
  if (validation.valid) {
    console.log('Migration successful!');
    // Use validation.data
  } else {
    console.error('Migration validation failed:', validation.errors);
  }
}
```

## Migration Transformations

### Root Level
- `state_version` → `schema_version`
- Adds `dex` with empty canon cache and default policy
- Adds `custom_dex` with empty pokemon registry
- Adds `continuity` with empty arrays
- Adds `state_versioning` with version info

### Campaign
- `theme` array → `region.theme` string (joined)
- `region_type` → `region.description`
- `time_of_day`, `weather` → `region.climate`
- `world_state.locations` → `campaign.locations[]`
- `world_state.global_effects` → `campaign.world_facts[]`
- Adds required arrays: `factions[]`, `recurring_npcs[]`

### Characters (from Trainers)
- `trainers` → `characters`
- `trainer_id` → `character_id`
- `class` → `trainer.background`
- `milestones` (strings) → `progression.milestones[]` (objects)
- `party` → `pokemon_party`
- Adds: `trainer.age_group`, `trainer.personality_traits[]`, `trainer.bonds[]`
- Adds: `inventory` with default pokeballs
- Adds: `achievements[]`

### Pokemon Party Members
- `pokemon_id` → `instance_id`
- `species` (string) → `species_ref` (object)
- `variant` → `form_ref.region` and `form_ref.kind`
- `hp` → `stats.hp`
- `status` (string) → `status_conditions[]` (array)
- Adds: `ability` (default if missing)
- Adds: `moves[]` (empty, would need lookup)
- Adds: Full `stats` object (calculated from level)
- Adds: `friendship` (default: 70)
- Adds: `known_info` with default values
- Adds: `form_ref` object

### Session
- `title` → `episode_title`
- `starting_location` / `last_checkpoint` → `scene.location_id`
- `narrative_flags` → `current_objectives[]`
- `next_actions.default_choice` → `player_choices.safe_default`
- `next_actions.session_2_entry` → `current_objectives[]`
- Adds: `scene` object with `location_id`, `description`, `mood`
- Adds: `battle_state` with `active: false`
- Adds: `fail_soft_flags` with defaults
- Adds: `player_choices` structure
- Adds: `controls` with defaults
- Adds: `event_log[]` (empty)
- Adds: `encounters[]` (empty)
- Adds: `character_ids[]` from migrated characters

### Continuity
- `known_species_flags` → `discovered_pokemon[]`
- Adds: `timeline[]` (empty)
- Adds: `unresolved_hooks[]` (empty)
- Adds: `recaps[]` (empty)

## Limitations & Notes

### Data That Requires Manual Lookup
- **Pokemon Abilities**: Migration provides default "Unknown Ability" - would need PokeAPI lookup
- **Pokemon Moves**: Migration provides empty array - would need level-appropriate move lookup
- **Pokemon Stats**: Migration calculates simplified stats - would need proper stat calculation
- **Species References**: Migration creates refs but doesn't validate against PokeAPI

### Default Values Used
- `age_group`: Defaults to `'teen'` (could be inferred from `class`)
- `friendship`: Defaults to `70`
- `pokeballs`: Defaults to 5 Poke Balls
- `badges`: Defaults to `0`
- `battle_state.active`: Defaults to `false`
- `fail_soft_flags`: All default to safe values
- `controls`: All default to `false`

### Fields Not Migrated
- `session.previous_session_id` - Not in schema (could be added to `state_versioning.previous_versions`)
- `session.status` - Not in schema
- `session.starting_location` - Used for `scene.location_id` but not preserved
- `session.last_checkpoint` - Not in schema
- Pokemon `experience` object - Not in schema (preserved in `notes` if present)

## Testing

To test the migration:

1. Create a test file with example session JSON
2. Run migration script: `node server/scripts/migrate-example-session.js test.json migrated.json`
3. Check output for validation errors
4. Verify migrated session works with import API

## Future Enhancements

- [ ] PokeAPI integration for ability/move lookup
- [ ] Proper stat calculation based on species and level
- [ ] Better inference of `age_group` from `class`
- [ ] Preservation of `previous_session_id` in schema
- [ ] XP tracking support if added to schema
- [ ] Better location matching from `world_state`

---

**Version**: 1.0  
**Last Updated**: 2026-01-27
