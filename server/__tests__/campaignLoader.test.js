import { describe, test, expect } from '@jest/globals';
import {
  buildCampaignContext,
  loadCampaign,
  resolveCampaignDataDir,
  resolveSessionBrief,
  invalidateCampaignCache,
} from '../services/campaignLoader.js';
import { mergeCampaignCustomDex } from '../services/pokemonOverrideService.js';
import { SessionBriefSchema } from '../schemas/campaign.js';

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

  test('loadCampaign loads celestide-isles with Episode 3 session brief', () => {
    const bundle = loadCampaign('celestide-isles');
    expect(bundle).not.toBeNull();
    expect(bundle.meta?.title).toMatch(/Celestide/i);
    expect(bundle.sessionBrief?.episode_number).toBe(3);
    expect(bundle.sessionBrief?.episode_title).toBe("Zephyra's Trial");
    expect(bundle.sessionBriefs?.length).toBeGreaterThanOrEqual(2);
  });

  test('resolveSessionBrief loads episode-indexed celestide briefs', () => {
    const ep2 = resolveSessionBrief('celestide-isles', 'session-02-skyfall-expanse');
    const ep3 = resolveSessionBrief('celestide-isles', 'session-03-zephyras-trial');
    const byNumber = resolveSessionBrief('celestide-isles', 3);

    expect(ep2?.episode_number).toBe(2);
    expect(ep2?.episode_title).toBe('Skyfall Expanse');
    expect(ep3?.episode_number).toBe(3);
    expect(byNumber?.id).toBe('session-03-zephyras-trial');
  });

  test('celestide Episode 3 brief validates and includes gym encounter + badge objective', () => {
    const brief = resolveSessionBrief('celestide-isles', 'session-03-zephyras-trial');
    const parsed = SessionBriefSchema.safeParse(brief);
    expect(parsed.success).toBe(true);

    expect(brief.starting_location_id).toBe('breeze_path');
    expect(brief.dm_notes).toMatch(/FAIL-SOFT/i);
    expect(brief.dm_notes).toMatch(/wind initiative/i);
    expect(brief.objectives.some((o) => o.objective_id === 'obj_earn_badge_gale')).toBe(true);

    const gymEncounter = brief.planned_encounters.find((e) => e.encounter_id === 'enc_gym_zephyra_wind');
    expect(gymEncounter).toBeDefined();
    expect(gymEncounter.type).toBe('gym');
    expect(gymEncounter.location_id).toBe('zephyra_gym');
    expect(gymEncounter.notes).toMatch(/gym_zephyra_wind/);
    expect(gymEncounter.notes).toMatch(/Flying \+1 initiative/);
  });

  test('buildCampaignContext surfaces Zephyra gym challenge for celestide-isles', () => {
    const ctx = buildCampaignContext('celestide-isles', 'zephyra_gym', 'session-03-zephyras-trial');
    expect(ctx).toContain("Zephyra's Trial");
    expect(ctx).toContain('gym_zephyra_wind');
    expect(ctx).toContain('badge_gale');
    expect(ctx).toContain('Gym (badge_gale)');
    expect(ctx).toContain('enc_gym_zephyra_wind');
    expect(ctx).not.toContain('undefined');
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
