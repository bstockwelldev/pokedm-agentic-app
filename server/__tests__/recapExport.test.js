/**
 * Tests for session recap export (STO-506)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  buildDeterministicRecap,
  collectRecapSections,
  exportSessionRecap,
  parseRecapExport,
  isRecapExportDocument,
  attachRecapToSession,
} from '../services/recapExportService.js';
import { PokemonSessionSchema } from '../schemas/session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturePath = join(__dirname, '..', 'sessions', 'celestide-isles-family-session.json');
const familySession = JSON.parse(readFileSync(fixturePath, 'utf-8'));

describe('Session Recap Export (STO-506)', () => {
  describe('Celestide family session fixture', () => {
    test('fixture passes schema validation', () => {
      const result = PokemonSessionSchema.safeParse(familySession);
      expect(result.success).toBe(true);
    });

    test('collects required recap sections', () => {
      const sections = collectRecapSections(familySession);

      expect(sections.locations.length).toBeGreaterThan(0);
      expect(sections.locations).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/Skysong Harbor/i),
        ])
      );
      expect(sections.npcs).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/Professor Liora/i),
        ])
      );
      expect(sections.teamDrift.length).toBeGreaterThan(0);
      expect(sections.pokemon.length).toBeGreaterThan(0);
      expect(sections.hooks.length).toBeGreaterThan(0);
    });

    test('exports human-readable markdown without internal IDs', async () => {
      const result = await exportSessionRecap(familySession, { format: 'md', polish: false });

      expect(result.content).toContain('# Session Recap');
      expect(result.content).toContain('## Locations Visited');
      expect(result.content).toContain('## People Met');
      expect(result.content).toContain('## Team Drift');
      expect(result.content).toContain('## Pokémon Discovered & Bonded');
      expect(result.content).toContain('## Badges & Achievements');
      expect(result.content).toContain("## What's Still Open");
      expect(result.content).toContain('pokedm-recap-export');
      expect(result.content).not.toMatch(/\btrainer_alex\b/);
      expect(result.content).not.toMatch(/\bskysong_harbor\b/);
      expect(result.polished).toBe(false);
    });

    test('exports plain text format', async () => {
      const result = await exportSessionRecap(familySession, { format: 'txt', polish: false });

      expect(result.format).toBe('txt');
      expect(result.content).toContain('Session Recap');
      expect(result.content).not.toContain('##');
    });

    test('builds family-friendly narrative paragraphs', () => {
      const { narrative } = buildDeterministicRecap(familySession);

      expect(narrative.length).toBeGreaterThanOrEqual(2);
      expect(narrative.join(' ')).toMatch(/Celestide Isles/i);
      expect(narrative.join(' ')).toMatch(/Alex/i);
    });
  });

  describe('recap re-import', () => {
    test('detects recap export documents', async () => {
      const exported = await exportSessionRecap(familySession, { format: 'md' });
      expect(isRecapExportDocument(exported.content)).toBe(true);
    });

    test('parses exported recap for continuity attachment', async () => {
      const exported = await exportSessionRecap(familySession, { format: 'md' });
      const parsed = parseRecapExport(exported.content);

      expect(parsed).not.toBeNull();
      expect(parsed.text).toContain('Session Recap');
      expect(parsed.metadata.pokedm_recap_export).toBe('1.0');
    });

    test('attaches parsed recap to continuity.recaps', async () => {
      const exported = await exportSessionRecap(familySession, { format: 'md' });
      const parsed = parseRecapExport(exported.content);
      const updated = attachRecapToSession(familySession, parsed.text);

      expect(updated.continuity.recaps).toHaveLength(1);
      expect(updated.continuity.recaps[0].text).toContain('Session Recap');
      expect(updated.continuity.recaps[0].scope).toBe('campaign');

      const validated = PokemonSessionSchema.safeParse(updated);
      expect(validated.success).toBe(true);
    });
  });

  describe('sparse data fallback', () => {
    test('gracefully handles empty session', async () => {
      const emptySession = {
        campaign: { campaign_id: 'test', region: { name: 'Test Region' } },
        characters: [],
        session: {
          session_id: 'empty',
          campaign_id: 'test',
          character_ids: [],
          episode_title: 'New Adventure',
          scene: { location_id: '', description: '', mood: 'calm' },
          current_objectives: [],
          encounters: [],
          battle_state: { active: false, round: 0, turn_order: [], field_effects: [] },
          fail_soft_flags: {
            recent_failures: 0,
            recent_successes: 0,
            difficulty_adjusted: false,
            party_confidence: 'medium',
            auto_scaled_last_encounter: false,
          },
          player_choices: { options_presented: [] },
          controls: { pause_requested: false, skip_requested: false, explain_requested: false },
          event_log: [],
        },
        continuity: {
          timeline: [],
          discovered_pokemon: [],
          unresolved_hooks: [],
          recaps: [],
        },
      };

      const result = await exportSessionRecap(emptySession, { format: 'md' });
      expect(result.content).toContain('No locations recorded yet');
      expect(result.content).toContain('No Pokémon discoveries recorded yet');
    });
  });
});
