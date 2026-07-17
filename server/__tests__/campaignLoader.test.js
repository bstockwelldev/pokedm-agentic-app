import { describe, test, expect } from '@jest/globals';
import {
  buildCampaignContext,
  loadCampaign,
  resolveCampaignDataDir,
  invalidateCampaignCache,
} from '../services/campaignLoader.js';
import { mergeCampaignCustomDex } from '../services/pokemonOverrideService.js';

describe('campaignLoader', () => {
  beforeEach(() => {
    invalidateCampaignCache();
  });

  test('resolveCampaignDataDir maps aurora-region-v1 to aurora-region folder', () => {
    expect(resolveCampaignDataDir('aurora-region-v1')).toBe('aurora-region');
  });

  test('buildCampaignContext uses schema field names from aurora-region bundle', () => {
    const ctx = buildCampaignContext('aurora-region', 'loc_frostholm_gym');
    expect(ctx).toContain('Campaign: Aurora Region');
    expect(ctx).toContain('Glacial Energy');
    expect(ctx).toContain('Team Permafrost');
    expect(ctx).toContain('(fanatical)');
    expect(ctx).toContain('Gym (badge_glacier)');
    expect(ctx).toContain('lv15');
    expect(ctx).toContain('Professor Glacielle');
    expect(ctx).not.toContain('undefined');
    expect(ctx).not.toMatch(/\(alignment\)/);
  });

  test('loadCampaign caches by resolved folder id', () => {
    const a = loadCampaign('aurora-region-v1');
    const b = loadCampaign('aurora-region');
    expect(a).toBe(b);
    expect(a?.meta?.title).toBeTruthy();
  });
});

describe('mergeCampaignCustomDex', () => {
  test('merges aurora custom pokemon into empty session dex', () => {
    const session = {
      session: { campaign_id: 'aurora-region-v1' },
      custom_dex: { pokemon: {}, ruleset_flags: { allow_new_species: false } },
    };
    const merged = mergeCampaignCustomDex(session);
    expect(Object.keys(merged.custom_dex.pokemon).length).toBeGreaterThan(0);
    expect(merged.custom_dex.pokemon.cstm_glacial_gyarados).toBeDefined();
  });

  test('session custom dex entries override campaign defaults', () => {
    const session = {
      session: { campaign_id: 'aurora-region' },
      custom_dex: {
        pokemon: {
          cstm_glacial_gyarados: { custom_species_id: 'cstm_glacial_gyarados', display_name: 'Override' },
        },
        ruleset_flags: { allow_new_species: false },
      },
    };
    const merged = mergeCampaignCustomDex(session);
    expect(merged.custom_dex.pokemon.cstm_glacial_gyarados.display_name).toBe('Override');
  });
});
