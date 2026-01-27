/**
 * Migration Script for Example Session JSON
 * 
 * Usage:
 *   node scripts/migrate-example-session.js <input-file> [output-file]
 * 
 * Example:
 *   node scripts/migrate-example-session.js example-session.json migrated-session.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { migrateExampleToSchema, validateMigratedSession } from '../lib/migrateSession.js';
import { PokemonSessionSchema } from '../schemas/session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
const inputFile = args[0];
const outputFile = args[1] || 'migrated-session.json';

if (!inputFile) {
  console.error('Usage: node migrate-example-session.js <input-file> [output-file]');
  process.exit(1);
}

try {
  // Read input file
  console.log(`Reading input file: ${inputFile}`);
  const inputPath = join(__dirname, '..', '..', inputFile);
  const inputContent = readFileSync(inputPath, 'utf-8');
  const exampleSession = JSON.parse(inputContent);

  // Migrate
  console.log('Migrating session to schema-compliant format...');
  const migratedSession = migrateExampleToSchema(exampleSession);

  // Validate
  console.log('Validating migrated session...');
  const validation = validateMigratedSession(migratedSession, PokemonSessionSchema);

  if (validation.valid) {
    console.log('✅ Migration successful! Session is schema-compliant.');
    
    // Write output file
    const outputPath = join(__dirname, '..', '..', outputFile);
    writeFileSync(outputPath, JSON.stringify(validation.data, null, 2), 'utf-8');
    console.log(`✅ Migrated session written to: ${outputFile}`);
    
    // Print summary
    console.log('\n--- Migration Summary ---');
    console.log(`Characters: ${validation.data.characters.length}`);
    console.log(`Total Pokémon: ${validation.data.characters.reduce((sum, c) => sum + c.pokemon_party.length, 0)}`);
    console.log(`Locations: ${validation.data.campaign.locations.length}`);
    console.log(`Objectives: ${validation.data.session.current_objectives.length}`);
    console.log(`Discovered Pokémon: ${validation.data.continuity.discovered_pokemon.length}`);
  } else {
    console.error('❌ Migration failed validation:');
    console.error(JSON.stringify(validation.errors, null, 2));
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Migration error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
