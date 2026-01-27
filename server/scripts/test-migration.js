/**
 * Test Migration Script
 * Tests the migration utility with a sample legacy session format
 */

import { migrateExampleToSchema, validateMigratedSession, isLegacyFormat } from '../lib/migrateSession.js';
import { PokemonSessionSchema } from '../schemas/session.js';

// Sample legacy session format (based on the example from SCHEMA_COMPARISON_ANALYSIS.md)
const legacySession = {
  state_version: "1.0.0",
  campaign: {
    campaign_id: "celestide_isles",
    name: "Celestide Isles",
    region_type: "floating archipelago",
    theme: ["wind", "celestial energy", "environmental balance"],
    time_of_day: "morning",
    weather: "clear_wind"
  },
  session: {
    session_id: "session_02",
    previous_session_id: "session_01",
    title: "Skyfall Expanse",
    status: "active",
    starting_location: "Route 2 - Southern Approach",
    last_checkpoint: "Skysong Harbor - Professor Liora Lab",
    narrative_flags: {
      met_professor_liora: true,
      obtained_starter: true,
      completed_tutorial: true
    }
  },
  world_state: {
    locations: {
      "Skysong Harbor": {
        status: "active",
        npc_presence: ["Professor Liora", "Assistant Kael"]
      },
      "Route 2 - Southern Approach": {
        status: "active",
        npc_presence: []
      }
    },
    global_effects: {
      celestial_alignment: "active",
      wind_currents: "favorable"
    }
  },
  trainers: [
    {
      trainer_id: "trainer_001",
      name: "Alex",
      class: "Researcher",
      party: [
        {
          pokemon_id: "pokemon_001",
          species: "Pikachu",
          variant: "Alolan",
          nickname: "Sparky",
          level: 5,
          hp: { current: 20, max: 20 },
          status: "healthy",
          typing: ["Electric"],
          experience: {
            current_xp: 50,
            xp_to_next: 100
          }
        }
      ],
      milestones: ["obtained_starter", "met_professor"]
    }
  ],
  known_species_flags: {
    pikachu_alolan_variant: true,
    "raichu_alolan_variant": false
  },
  next_actions: {
    default_choice: "Continue exploring Route 2",
    session_2_entry: "The group prepares to leave Skysong Harbor"
  }
};

console.log('=== Migration Test ===\n');

// Step 1: Check if it's legacy format
console.log('Step 1: Checking if session is legacy format...');
const isLegacy = isLegacyFormat(legacySession);
console.log(`Result: ${isLegacy ? '✅ Legacy format detected' : '❌ Not detected as legacy'}\n`);

if (!isLegacy) {
  console.error('❌ Session was not detected as legacy format. Exiting.');
  process.exit(1);
}

// Step 2: Migrate
console.log('Step 2: Migrating session to schema-compliant format...');
let migratedSession;
try {
  migratedSession = migrateExampleToSchema(legacySession);
  console.log('✅ Migration completed\n');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Step 3: Validate
console.log('Step 3: Validating migrated session against schema...');
const validation = validateMigratedSession(migratedSession, PokemonSessionSchema);

if (validation.valid) {
  console.log('✅ Validation passed! Session is schema-compliant.\n');
  
  // Step 4: Print summary
  console.log('=== Migration Summary ===');
  console.log(`Schema Version: ${validation.data.schema_version}`);
  console.log(`Campaign ID: ${validation.data.campaign.campaign_id}`);
  console.log(`Characters: ${validation.data.characters.length}`);
  console.log(`Total Pokémon: ${validation.data.characters.reduce((sum, c) => sum + c.pokemon_party.length, 0)}`);
  console.log(`Locations: ${validation.data.campaign.locations.length}`);
  console.log(`Objectives: ${validation.data.session.current_objectives.length}`);
  console.log(`Discovered Pokémon: ${validation.data.continuity.discovered_pokemon.length}`);
  console.log(`Session ID: ${validation.data.session.session_id}`);
  console.log(`Episode Title: ${validation.data.session.episode_title}`);
  console.log(`Scene Location: ${validation.data.session.scene.location_id}`);
  console.log(`Character IDs: ${validation.data.session.character_ids.join(', ') || 'none'}`);
  
  // Step 5: Show key transformations
  console.log('\n=== Key Transformations ===');
  console.log(`✓ trainers → characters (${legacySession.trainers.length} trainers migrated)`);
  console.log(`✓ world_state.locations → campaign.locations (${validation.data.campaign.locations.length} locations)`);
  console.log(`✓ narrative_flags → current_objectives (${validation.data.session.current_objectives.length} objectives)`);
  console.log(`✓ known_species_flags → continuity.discovered_pokemon (${validation.data.continuity.discovered_pokemon.length} discovered)`);
  console.log(`✓ next_actions → player_choices & objectives`);
  console.log(`✓ Added required fields: dex, custom_dex, state_versioning, battle_state, fail_soft_flags, controls`);
  
  console.log('\n✅ Migration test completed successfully!');
  
  // Optionally write to file
  if (process.argv.includes('--write')) {
    const { writeFileSync } = await import('fs');
    const outputFile = 'migrated-session-test.json';
    writeFileSync(outputFile, JSON.stringify(validation.data, null, 2), 'utf-8');
    console.log(`\n📄 Migrated session written to: ${outputFile}`);
  }
} else {
  console.error('❌ Validation failed:');
  console.error(JSON.stringify(validation.errors, null, 2));
  process.exit(1);
}
