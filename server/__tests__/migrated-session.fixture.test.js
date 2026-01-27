/**
 * Tests for Migrated Session Fixture
 * 
 * Tests the migrated-legacy-session.json as a fixture for:
 * - Schema validation
 * - Import functionality
 * - Session storage
 * - Data integrity
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PokemonSessionSchema } from '../schemas/session.js';
import { loadSession, saveSession } from '../storage/sessionStore.js';
import { validateMigratedSession, isLegacyFormat } from '../lib/migrateSession.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load migrated session fixture
const fixturePath = join(__dirname, '..', '..', 'migrated-legacy-session.json');
const migratedSession = JSON.parse(readFileSync(fixturePath, 'utf-8'));

describe('Migrated Session Fixture', () => {
  describe('Schema Validation', () => {
    test('should pass PokemonSessionSchema validation', () => {
      const result = PokemonSessionSchema.safeParse(migratedSession);
      
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors:', result.error.errors);
      }
    });

    test('should have all required root fields', () => {
      expect(migratedSession).toHaveProperty('schema_version');
      expect(migratedSession).toHaveProperty('dex');
      expect(migratedSession).toHaveProperty('custom_dex');
      expect(migratedSession).toHaveProperty('campaign');
      expect(migratedSession).toHaveProperty('characters');
      expect(migratedSession).toHaveProperty('session');
      expect(migratedSession).toHaveProperty('continuity');
      expect(migratedSession).toHaveProperty('state_versioning');
    });

    test('should have valid dex structure', () => {
      expect(migratedSession.dex).toHaveProperty('canon_cache');
      expect(migratedSession.dex).toHaveProperty('cache_policy');
      expect(migratedSession.dex.cache_policy.source).toBe('pokeapi');
      expect(migratedSession.dex.cache_policy.gen_range).toMatch(/^\d+-\d+$/);
    });

    test('should have valid custom_dex structure', () => {
      expect(migratedSession.custom_dex).toHaveProperty('pokemon');
      expect(migratedSession.custom_dex).toHaveProperty('ruleset_flags');
      expect(migratedSession.custom_dex.ruleset_flags).toHaveProperty('allow_new_species');
      expect(typeof migratedSession.custom_dex.ruleset_flags.allow_new_species).toBe('boolean');
    });

    test('should have valid campaign structure', () => {
      expect(migratedSession.campaign).toHaveProperty('campaign_id');
      expect(migratedSession.campaign).toHaveProperty('region');
      expect(migratedSession.campaign).toHaveProperty('locations');
      expect(migratedSession.campaign).toHaveProperty('factions');
      expect(migratedSession.campaign).toHaveProperty('recurring_npcs');
      expect(migratedSession.campaign).toHaveProperty('world_facts');
      expect(Array.isArray(migratedSession.campaign.locations)).toBe(true);
      expect(Array.isArray(migratedSession.campaign.factions)).toBe(true);
      expect(Array.isArray(migratedSession.campaign.recurring_npcs)).toBe(true);
      expect(Array.isArray(migratedSession.campaign.world_facts)).toBe(true);
    });

    test('should have valid characters array', () => {
      expect(Array.isArray(migratedSession.characters)).toBe(true);
      expect(migratedSession.characters.length).toBeGreaterThan(0);
      
      migratedSession.characters.forEach((character) => {
        expect(character).toHaveProperty('character_id');
        expect(character).toHaveProperty('trainer');
        expect(character).toHaveProperty('inventory');
        expect(character).toHaveProperty('pokemon_party');
        expect(character).toHaveProperty('achievements');
        expect(character).toHaveProperty('progression');
      });
    });

    test('should have valid session structure', () => {
      expect(migratedSession.session).toHaveProperty('session_id');
      expect(migratedSession.session).toHaveProperty('campaign_id');
      expect(migratedSession.session).toHaveProperty('character_ids');
      expect(migratedSession.session).toHaveProperty('episode_title');
      expect(migratedSession.session).toHaveProperty('scene');
      expect(migratedSession.session).toHaveProperty('current_objectives');
      expect(migratedSession.session).toHaveProperty('encounters');
      expect(migratedSession.session).toHaveProperty('battle_state');
      expect(migratedSession.session).toHaveProperty('fail_soft_flags');
      expect(migratedSession.session).toHaveProperty('player_choices');
      expect(migratedSession.session).toHaveProperty('controls');
      expect(migratedSession.session).toHaveProperty('event_log');
    });

    test('should have valid continuity structure', () => {
      expect(migratedSession.continuity).toHaveProperty('timeline');
      expect(migratedSession.continuity).toHaveProperty('discovered_pokemon');
      expect(migratedSession.continuity).toHaveProperty('unresolved_hooks');
      expect(migratedSession.continuity).toHaveProperty('recaps');
      expect(Array.isArray(migratedSession.continuity.timeline)).toBe(true);
      expect(Array.isArray(migratedSession.continuity.discovered_pokemon)).toBe(true);
      expect(Array.isArray(migratedSession.continuity.unresolved_hooks)).toBe(true);
      expect(Array.isArray(migratedSession.continuity.recaps)).toBe(true);
    });

    test('should have valid state_versioning structure', () => {
      expect(migratedSession.state_versioning).toHaveProperty('current_version');
      expect(migratedSession.state_versioning).toHaveProperty('previous_versions');
      expect(Array.isArray(migratedSession.state_versioning.previous_versions)).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    test('character_ids in session should match character.character_id values', () => {
      const characterIds = migratedSession.characters.map(c => c.character_id);
      const sessionCharacterIds = migratedSession.session.character_ids;
      
      expect(sessionCharacterIds.length).toBe(characterIds.length);
      characterIds.forEach(id => {
        expect(sessionCharacterIds).toContain(id);
      });
    });

    test('campaign_id in session should match campaign.campaign_id', () => {
      expect(migratedSession.session.campaign_id).toBe(migratedSession.campaign.campaign_id);
    });

    test('scene.location_id should reference a valid campaign location', () => {
      const locationIds = migratedSession.campaign.locations.map(l => l.location_id);
      expect(locationIds).toContain(migratedSession.session.scene.location_id);
    });

    test('recurring_npcs should have valid home_location_id references', () => {
      const locationIds = migratedSession.campaign.locations.map(l => l.location_id);
      
      migratedSession.campaign.recurring_npcs.forEach((npc) => {
        if (npc.home_location_id) {
          expect(locationIds).toContain(npc.home_location_id);
        }
      });
    });

    test('pokemon_party should have valid species_ref and form_ref', () => {
      migratedSession.characters.forEach((character) => {
        character.pokemon_party.forEach((pokemon) => {
          expect(pokemon).toHaveProperty('species_ref');
          expect(pokemon.species_ref).toHaveProperty('kind');
          expect(pokemon.species_ref).toHaveProperty('ref');
          expect(pokemon).toHaveProperty('form_ref');
          expect(pokemon.form_ref).toHaveProperty('kind');
        });
      });
    });

    test('discovered_pokemon should have valid species_ref and form_ref', () => {
      migratedSession.continuity.discovered_pokemon.forEach((discovered) => {
        expect(discovered).toHaveProperty('species_ref');
        expect(discovered.species_ref).toHaveProperty('kind');
        expect(discovered.species_ref).toHaveProperty('ref');
        expect(discovered).toHaveProperty('form_ref');
        expect(discovered.form_ref).toHaveProperty('kind');
      });
    });
  });

  describe('Migration Verification', () => {
    test('should NOT be detected as legacy format', () => {
      const isLegacy = isLegacyFormat(migratedSession);
      expect(isLegacy).toBe(false);
    });

    test('should pass validation via validateMigratedSession', () => {
      const validation = validateMigratedSession(migratedSession, PokemonSessionSchema);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeNull();
    });
  });

  describe('Session Storage Integration', () => {
    const testSessionId = `test_fixture_${Date.now()}`;

    test('should save and load successfully', () => {
      // Save migrated session
      expect(() => {
        saveSession(testSessionId, migratedSession);
      }).not.toThrow();

      // Load and validate
      const loaded = loadSession(testSessionId);
      expect(loaded).not.toBeNull();
      expect(loaded.session.session_id).toBe(migratedSession.session.session_id);
      expect(loaded.campaign.campaign_id).toBe(migratedSession.campaign.campaign_id);
      expect(loaded.characters.length).toBe(migratedSession.characters.length);
    });

    test('loaded session should pass schema validation', () => {
      const loaded = loadSession(testSessionId);
      const result = PokemonSessionSchema.safeParse(loaded);
      expect(result.success).toBe(true);
    });

    test('should maintain data integrity after save/load cycle', () => {
      const loaded = loadSession(testSessionId);
      
      // Compare key fields
      expect(loaded.characters.length).toBe(migratedSession.characters.length);
      expect(loaded.session.character_ids.length).toBe(migratedSession.session.character_ids.length);
      expect(loaded.campaign.locations.length).toBe(migratedSession.campaign.locations.length);
      expect(loaded.continuity.discovered_pokemon.length).toBe(migratedSession.continuity.discovered_pokemon.length);
    });
  });

  describe('Fixture Usage Scenarios', () => {
    test('should be usable as a test fixture for agent operations', () => {
      // Simulate agent receiving session
      const session = migratedSession;
      
      // Verify agent can access required fields
      expect(session.session.session_id).toBeDefined();
      expect(session.session.scene.location_id).toBeDefined();
      expect(session.characters.length).toBeGreaterThan(0);
      expect(session.session.current_objectives.length).toBeGreaterThan(0);
    });

    test('should support session updates without breaking schema', () => {
      const updated = { ...migratedSession };
      
      // Simulate adding an objective
      updated.session.current_objectives.push({
        objective_id: 'test_objective',
        description: 'Test objective',
        status: 'active',
      });

      // Should still validate
      const result = PokemonSessionSchema.safeParse(updated);
      expect(result.success).toBe(true);
    });

    test('should support character updates without breaking schema', () => {
      const updated = { ...migratedSession };
      
      // Simulate updating a character's pokemon party
      if (updated.characters[0].pokemon_party.length > 0) {
        updated.characters[0].pokemon_party[0].level = 6;
        updated.characters[0].pokemon_party[0].stats.hp.current = 25;
        updated.characters[0].pokemon_party[0].stats.hp.max = 25;
      }

      // Should still validate
      const result = PokemonSessionSchema.safeParse(updated);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty arrays correctly', () => {
      expect(Array.isArray(migratedSession.campaign.factions)).toBe(true);
      expect(Array.isArray(migratedSession.session.encounters)).toBe(true);
      expect(Array.isArray(migratedSession.continuity.timeline)).toBe(true);
    });

    test('should handle optional fields correctly', () => {
      // Optional fields should be present or undefined, not null
      const parsed = PokemonSessionSchema.parse(migratedSession);
      
      // Check that optional fields are handled correctly
      if (parsed.session.player_choices.safe_default === null) {
        expect(parsed.session.player_choices.safe_default).toBeUndefined();
      }
    });

    test('should have valid enum values', () => {
      // Scene mood
      expect(['calm', 'tense', 'adventurous']).toContain(migratedSession.session.scene.mood);
      
      // Trainer age_group
      migratedSession.characters.forEach((char) => {
        expect(['child', 'teen', 'adult']).toContain(char.trainer.age_group);
      });

      // Location types
      migratedSession.campaign.locations.forEach((loc) => {
        expect(['town', 'route', 'dungeon', 'landmark']).toContain(loc.type);
      });

      // NPC roles
      migratedSession.campaign.recurring_npcs.forEach((npc) => {
        expect(['researcher', 'merchant', 'antagonist', 'ranger', 'guide']).toContain(npc.role);
      });

      // NPC disposition
      migratedSession.campaign.recurring_npcs.forEach((npc) => {
        expect(['friendly', 'neutral', 'tense']).toContain(npc.disposition);
      });
    });
  });
});
