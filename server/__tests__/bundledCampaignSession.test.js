import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  listBundledCampaigns,
  invalidateCampaignCache,
} from '../services/campaignLoader.js';
import {
  createBundledCampaignSession,
  BundledCampaignSessionError,
} from '../services/bundledCampaignSessionService.js';
import { loadSession } from '../storage/sessionStore.js';

describe('listBundledCampaigns', () => {
  beforeEach(() => {
    invalidateCampaignCache();
  });

  test('returns aurora-region and celestide-isles with picker metadata', () => {
    const campaigns = listBundledCampaigns();
    const slugs = campaigns.map((c) => c.slug);

    expect(slugs).toContain('aurora-region');
    expect(slugs).toContain('celestide-isles');

    const aurora = campaigns.find((c) => c.slug === 'aurora-region');
    expect(aurora.title).toMatch(/Aurora Region/i);
    expect(aurora.region_name).toBe('Aurora Region');
    expect(aurora.tone).toBe('adventure');
    expect(aurora.blurb).toMatch(/Team Permafrost|glacial/i);
    expect(aurora.episode_number).toBe(1);

    const celestide = campaigns.find((c) => c.slug === 'celestide-isles');
    expect(celestide.title).toMatch(/Celestide/i);
    expect(celestide.region_name).toBe('Celestide Isles');
    expect(celestide.episode_number).toBe(3);
    expect(celestide.episode_title).toBe("Zephyra's Trial");
  });
});

describe('createBundledCampaignSession', () => {
  beforeEach(() => {
    invalidateCampaignCache();
  });

  test('creates aurora-region session with seeded campaign data and persists campaign_id', async () => {
    const { sessionId, session } = await createBundledCampaignSession({
      campaign_id: 'aurora-region',
      host_name: 'Ash',
    });

    expect(sessionId).toBeTruthy();
    expect(session.schema_version).toBe('1.1.0');
    expect(session.session.campaign_id).toBe('aurora-region-v1');
    expect(session.campaign.region.name).toBe('Aurora Region');
    expect(session.campaign.factions.some((f) => f.name === 'Team Permafrost')).toBe(true);
    expect(session.campaign.locations.length).toBeGreaterThan(0);
    expect(session.session.episode_title).toBe('Arrival at Frostholm');
    expect(session.session.scene.location_id).toBe('loc_frostholm_south_gate');
    expect(session.session.scene.description).toMatch(/Professor Glacielle/i);
    expect(session.characters[0].trainer.name).toBe('Ash');

    const reloaded = await loadSession(sessionId);
    expect(reloaded).not.toBeNull();
    expect(reloaded.session.campaign_id).toBe('aurora-region-v1');
    expect(reloaded.campaign.region.name).toBe('Aurora Region');
  });

  test('creates celestide-isles session with Episode 3 session-brief context', async () => {
    const { sessionId, session } = await createBundledCampaignSession({
      campaign_id: 'celestide-isles',
      host_name: 'Misty',
      session_brief_id: 'session-03-zephyras-trial',
    });

    expect(session.session.campaign_id).toBe('celestide-isles-v1');
    expect(session.session_brief_id).toBe('session-03-zephyras-trial');
    expect(session.session.episode_title).toBe("Zephyra's Trial");
    expect(session.session.scene.location_id).toBe('breeze_path');
    expect(session.session.current_objectives.some((o) => o.objective_id === 'obj_earn_badge_gale')).toBe(true);
    expect(session.campaign.region.name).toBe('Celestide Isles');

    const reloaded = await loadSession(sessionId);
    expect(reloaded.session.episode_title).toBe("Zephyra's Trial");
    expect(reloaded.session.scene.location_id).toBe('breeze_path');
    expect(reloaded.session.campaign_id).toBe('celestide-isles-v1');
  });

  test('throws for unknown campaign', async () => {
    await expect(
      createBundledCampaignSession({ campaign_id: 'missing-region', host_name: 'Test' })
    ).rejects.toBeInstanceOf(BundledCampaignSessionError);
  });
});
