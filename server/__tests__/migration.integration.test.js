/**
 * Integration Tests for Migration System
 * 
 * Tests the complete migration flow:
 * - Legacy format detection
 * - Migration execution
 * - Validation
 * - Import API integration
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PokemonSessionSchema } from '../schemas/session.js';
import { migrateExampleToSchema, validateMigratedSession, isLegacyFormat } from '../lib/migrateSession.js';
import { loadSession, saveSession } from '../storage/sessionStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load legacy session fixture
const legacyPath = join(__dirname, '..', '..', 'legacy-session-example.json');
const legacySession = JSON.parse(readFileSync(legacyPath, 'utf-8'));

// Load migrated session fixture
const migratedPath = join(__dirname, '..', '..', 'migrated-legacy-session.json');
const migratedSession = JSON.parse(readFileSync(migratedPath, 'utf-8'));

describe('Migration Integration Tests', () => {
  describe('Legacy Format Detection', () => {
    test('should detect legacy format correctly', () => {
      expect(isLegacyFormat(legacySession)).toBe(true);
      expect(isLegacyFormat(migratedSession)).toBe(false);
    });

    test('should detect legacy indicators', () => {
      expect(legacySession).toHaveProperty('trainers');
      expect(legacySession).toHaveProperty('world_state');
      expect(legacySession).toHaveProperty('known_species_flags');
      expect(legacySession).toHaveProperty('next_actions');
    });
  });

  describe('Migration Execution', () => {
    test('should migrate legacy session successfully', () => {
      expect(() => {
        const migrated = migrateExampleToSchema(legacySession);
        expect(migrated).toBeDefined();
        expect(migrated).toHaveProperty('schema_version');
        expect(migrated).toHaveProperty('dex');
        expect(migrated).toHaveProperty('characters');
        expect(migrated).not.toHaveProperty('trainers');
      }).not.toThrow();
    });

    test('should transform trainers to characters', () => {
      const migrated = migrateExampleToSchema(legacySession);
      
      expect(migrated).toHaveProperty('characters');
      expect(Array.isArray(migrated.characters)).toBe(true);
      expect(migrated.characters.length).toBe(legacySession.trainers.length);
      
      // Verify structure transformation
      migrated.characters.forEach((char, idx) => {
        const originalTrainer = legacySession.trainers[idx];
        expect(char.character_id).toBe(originalTrainer.trainer_id);
        expect(char.trainer.name).toBe(originalTrainer.name);
        expect(char.trainer.background).toBe(originalTrainer.class);
      });
    });

    test('should transform world_state to campaign locations', () => {
      const migrated = migrateExampleToSchema(legacySession);
      
      expect(migrated.campaign).toHaveProperty('locations');
      expect(Array.isArray(migrated.campaign.locations)).toBe(true);
      
      const originalLocationCount = Object.keys(legacySession.world_state.locations).length;
      expect(migrated.campaign.locations.length).toBe(originalLocationCount);
    });

    test('should transform narrative_flags to objectives', () => {
      const migrated = migrateExampleToSchema(legacySession);
      
      expect(migrated.session).toHaveProperty('current_objectives');
      expect(Array.isArray(migrated.session.current_objectives)).toBe(true);
      
      const originalFlagCount = Object.keys(legacySession.session.narrative_flags).filter(
        (_, val) => legacySession.session.narrative_flags[val] === true
      ).length;
      
      // Should have at least as many objectives as true flags
      expect(migrated.session.current_objectives.length).toBeGreaterThanOrEqual(originalFlagCount);
    });

    test('should transform known_species_flags to discovered_pokemon', () => {
      const migrated = migrateExampleToSchema(legacySession);
      
      expect(migrated.continuity).toHaveProperty('discovered_pokemon');
      expect(Array.isArray(migrated.continuity.discovered_pokemon)).toBe(true);
      
      const originalFlagCount = Object.values(legacySession.known_species_flags).filter(
        val => val === true
      ).length;
      
      expect(migrated.continuity.discovered_pokemon.length).toBeGreaterThanOrEqual(originalFlagCount);
    });
  });

  describe('Migration Validation', () => {
    test('migrated session should pass schema validation', () => {
      const migrated = migrateExampleToSchema(legacySession);
      const validation = validateMigratedSession(migrated, PokemonSessionSchema);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeNull();
    });

    test('migrated session should be idempotent (re-migration safe)', () => {
      const migrated1 = migrateExampleToSchema(legacySession);
      const migrated2 = migrateExampleToSchema(migrated1); // Try to migrate already-migrated
      
      // Should not be detected as legacy
      expect(isLegacyFormat(migrated1)).toBe(false);
      expect(isLegacyFormat(migrated2)).toBe(false);
      
      // Both should validate
      const validation1 = validateMigratedSession(migrated1, PokemonSessionSchema);
      const validation2 = validateMigratedSession(migrated2, PokemonSessionSchema);
      
      expect(validation1.valid).toBe(true);
      expect(validation2.valid).toBe(true);
    });
  });

  describe('Data Preservation', () => {
    test('should preserve session_id', () => {
      const migrated = migrateExampleToSchema(legacySession);
      expect(migrated.session.session_id).toBe(legacySession.session.session_id);
    });

    test('should preserve campaign_id', () => {
      const migrated = migrateExampleToSchema(legacySession);
      expect(migrated.campaign.campaign_id).toBe(legacySession.campaign.campaign_id);
    });

    test('should preserve character/trainer names', () => {
      const migrated = migrateExampleToSchema(legacySession);
      
      legacySession.trainers.forEach((trainer) => {
        const migratedChar = migrated.characters.find(c => c.character_id === trainer.trainer_id);
        expect(migratedChar).toBeDefined();
        expect(migratedChar.trainer.name).toBe(trainer.name);
      });
    });

    test('should preserve pokemon data', () => {
      const migrated = migrateExampleToSchema(legacySession);
      
      legacySession.trainers.forEach((trainer) => {
        const migratedChar = migrated.characters.find(c => c.character_id === trainer.trainer_id);
        
        trainer.party.forEach((pokemon) => {
          const migratedPokemon = migratedChar.pokemon_party.find(
            p => p.instance_id === pokemon.pokemon_id
          );
          
          expect(migratedPokemon).toBeDefined();
          expect(migratedPokemon.nickname).toBe(pokemon.nickname);
          expect(migratedPokemon.level).toBe(pokemon.level);
          expect(migratedPokemon.stats.hp.current).toBe(pokemon.hp.current);
          expect(migratedPokemon.stats.hp.max).toBe(pokemon.hp.max);
        });
      });
    });
  });

  describe('Storage Integration', () => {
    const testSessionId = `test_migration_${Date.now()}`;

    test('should save migrated session to storage', () => {
      const migrated = migrateExampleToSchema(legacySession);
      
      expect(() => {
        saveSession(testSessionId, migrated);
      }).not.toThrow();
    });

    test('should load migrated session from storage', () => {
      const loaded = loadSession(testSessionId);
      
      expect(loaded).not.toBeNull();
      expect(loaded.session.session_id).toBe(legacySession.session.session_id);
      
      // Should still validate after load
      const validation = validateMigratedSession(loaded, PokemonSessionSchema);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Fixture Comparison', () => {
    test('migrated fixture should match fresh migration', () => {
      const freshMigration = migrateExampleToSchema(legacySession);
      
      // Compare key fields (ignoring timestamps and generated IDs)
      expect(freshMigration.schema_version).toBe(migratedSession.schema_version);
      expect(freshMigration.campaign.campaign_id).toBe(migratedSession.campaign.campaign_id);
      expect(freshMigration.session.session_id).toBe(migratedSession.session.session_id);
      expect(freshMigration.characters.length).toBe(migratedSession.characters.length);
      expect(freshMigration.campaign.locations.length).toBe(migratedSession.campaign.locations.length);
    });

    test('both fixture and fresh migration should validate', () => {
      const freshMigration = migrateExampleToSchema(legacySession);
      
      const fixtureValidation = validateMigratedSession(migratedSession, PokemonSessionSchema);
      const freshValidation = validateMigratedSession(freshMigration, PokemonSessionSchema);
      
      expect(fixtureValidation.valid).toBe(true);
      expect(freshValidation.valid).toBe(true);
    });
  });
});
