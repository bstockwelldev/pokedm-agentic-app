import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CampaignPicker from './CampaignPicker';

const mockCampaigns = [
  {
    slug: 'aurora-region',
    campaign_id: 'aurora-region-v1',
    title: 'Aurora Region: Glacial Chronicles',
    region_name: 'Aurora Region',
    tone: 'adventure',
    blurb: 'Seed campaign for PokeDM development.',
    tags: ['ice', 'dragon'],
    default_session_brief_id: 'session-brief',
    episode_number: 1,
    episode_title: 'Arrival at Frostholm',
  },
  {
    slug: 'celestide-isles',
    campaign_id: 'celestide-isles-v1',
    title: 'Celestide Isles',
    region_name: 'Celestide Isles',
    tone: 'adventure',
    blurb: 'Family-friendly campaign on floating islands.',
    tags: ['wind', 'floating-islands'],
    default_session_brief_id: 'session-brief',
    episode_number: 3,
    episode_title: "Zephyra's Trial",
  },
];

describe('CampaignPicker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders both campaigns and creates aurora-region session on selection', async () => {
    const onSessionCreated = vi.fn();

    vi.spyOn(global, 'fetch').mockImplementation(async (url, options = {}) => {
      if (url === '/api/v1/campaigns/available') {
        return {
          ok: true,
          json: async () => ({ campaigns: mockCampaigns }),
        };
      }

      if (url === '/api/v1/sessions/bundled' && options.method === 'POST') {
        const body = JSON.parse(options.body);
        expect(body.campaign_id).toBe('aurora-region');
        return {
          ok: true,
          json: async () => ({
            session_id: 'session-aurora-1',
            session: {
              session: {
                campaign_id: 'aurora-region-v1',
                scene: { description: 'Aurora opening scene' },
              },
              campaign: { region: { name: 'Aurora Region' } },
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<CampaignPicker onSessionCreated={onSessionCreated} />);

    expect(await screen.findByRole('heading', { name: /choose your campaign/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /aurora region: glacial chronicles/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /celestide isles/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /begin adventure/i }));

    await waitFor(() => {
      expect(onSessionCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-aurora-1',
          campaign: expect.objectContaining({ slug: 'aurora-region' }),
        })
      );
    });
  });

  it('creates celestide-isles session when that campaign is selected', async () => {
    const onSessionCreated = vi.fn();

    vi.spyOn(global, 'fetch').mockImplementation(async (url, options = {}) => {
      if (url === '/api/v1/campaigns/available') {
        return {
          ok: true,
          json: async () => ({ campaigns: mockCampaigns }),
        };
      }

      if (url === '/api/v1/sessions/bundled' && options.method === 'POST') {
        const body = JSON.parse(options.body);
        expect(body.campaign_id).toBe('celestide-isles');
        return {
          ok: true,
          json: async () => ({
            session_id: 'session-celestide-1',
            session: {
              session: {
                campaign_id: 'celestide-isles-v1',
                episode_title: "Zephyra's Trial",
                scene: { description: 'Celestide opening scene' },
              },
              campaign: { region: { name: 'Celestide Isles' } },
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<CampaignPicker onSessionCreated={onSessionCreated} />);

    await screen.findByRole('radio', { name: /celestide isles/i });
    fireEvent.click(screen.getByRole('radio', { name: /celestide isles/i }));
    fireEvent.click(screen.getByRole('button', { name: /begin adventure/i }));

    await waitFor(() => {
      expect(onSessionCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-celestide-1',
          campaign: expect.objectContaining({ slug: 'celestide-isles' }),
        })
      );
    });
  });
});
