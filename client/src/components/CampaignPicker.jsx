import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { getLastCampaignId } from '../lib/campaignPreferences';

function toneLabel(tone) {
  if (!tone) return 'Adventure';
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}

function CampaignCard({
  campaign,
  selected,
  onSelect,
  onKeyDown,
  tabIndex,
  cardRef,
}) {
  return (
    <button
      ref={cardRef}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      onClick={() => onSelect(campaign)}
      onKeyDown={onKeyDown}
      className={cn(
        'group relative w-full min-h-[11rem] rounded-2xl border p-5 text-left transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'min-h-[44px]',
        selected
          ? 'border-brand bg-brand/10 shadow-[0_0_0_1px_rgba(0,217,255,0.35)]'
          : 'border-border/70 bg-background/50 hover:border-brand/50 hover:bg-background/70'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {campaign.region_name}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">
            {campaign.title}
          </h2>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            selected ? 'border-brand/60 bg-brand/15 text-brand' : 'border-border/70 text-muted'
          )}
        >
          {toneLabel(campaign.tone)}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-foreground/85 line-clamp-4">
        {campaign.blurb}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(campaign.tags ?? []).slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border/60 bg-input/60 px-2.5 py-1 text-[0.7rem] font-medium text-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">
        Episode {campaign.episode_number}: {campaign.episode_title}
      </p>
    </button>
  );
}

export default function CampaignPicker({ onSessionCreated, onError }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [hostName, setHostName] = useState('Trainer');
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCampaigns() {
      setLoadingCampaigns(true);
      setFetchError(null);

      try {
        const response = await fetch('/api/v1/campaigns/available');
        if (!response.ok) {
          throw new Error(`Failed to load campaigns (${response.status})`);
        }

        const data = await response.json();
        if (cancelled) return;

        const list = data.campaigns ?? [];
        setCampaigns(list);

        const lastUsed = getLastCampaignId();
        const defaultCampaign = list.find((c) => c.slug === lastUsed || c.campaign_id === lastUsed)
          ?? list[0]
          ?? null;
        setSelectedSlug(defaultCampaign?.slug ?? null);
      } catch (err) {
        if (!cancelled) {
          setFetchError(err.message || 'Failed to load campaigns');
          onError?.(err.message || 'Failed to load campaigns');
        }
      } finally {
        if (!cancelled) {
          setLoadingCampaigns(false);
        }
      }
    }

    loadCampaigns();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const selectedIndex = campaigns.findIndex((c) => c.slug === selectedSlug);

  const handleCardKeyDown = useCallback((event, index) => {
    if (!campaigns.length) return;

    let nextIndex = index;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        nextIndex = (index + 1) % campaigns.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        nextIndex = (index - 1 + campaigns.length) % campaigns.length;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = campaigns.length - 1;
        break;
      default:
        return;
    }

    setSelectedSlug(campaigns[nextIndex].slug);
    cardRefs.current[nextIndex]?.focus();
  }, [campaigns]);

  async function handleStart() {
    const selected = campaigns.find((c) => c.slug === selectedSlug);
    if (!selected || submitting) return;

    setSubmitting(true);
    setFetchError(null);

    try {
      const response = await fetch('/api/v1/sessions/bundled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selected.slug,
          host_name: hostName.trim() || 'Trainer',
          session_brief_id: selected.default_session_brief_id,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Failed to create session (${response.status})`);
      }

      onSessionCreated({
        sessionId: data.session_id,
        session: data.session,
        campaign: selected,
      });
    } catch (err) {
      const message = err.message || 'Failed to start session';
      setFetchError(message);
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-4xl">
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
            PokeDM
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            Choose Your Campaign
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted sm:text-base">
            Select a region to begin a new adventure. Your choice is saved to this session
            and can be resumed after reload.
          </p>
        </header>

        {loadingCampaigns && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-border/60 bg-background/40 p-8 text-center text-muted"
          >
            Loading campaigns…
          </div>
        )}

        {!loadingCampaigns && fetchError && campaigns.length === 0 && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-200"
          >
            {fetchError}
          </div>
        )}

        {!loadingCampaigns && campaigns.length > 0 && (
          <>
            <div
              role="radiogroup"
              aria-label="Available campaigns"
              className="grid gap-4 sm:grid-cols-2"
            >
              {campaigns.map((campaign, index) => (
                <CampaignCard
                  key={campaign.slug}
                  campaign={campaign}
                  selected={selectedSlug === campaign.slug}
                  onSelect={(item) => setSelectedSlug(item.slug)}
                  onKeyDown={(event) => handleCardKeyDown(event, index)}
                  tabIndex={selectedSlug === campaign.slug ? 0 : -1}
                  cardRef={(el) => {
                    cardRefs.current[index] = el;
                  }}
                />
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-border/60 bg-background/40 p-5 sm:p-6">
              <label htmlFor="host-name" className="block text-sm font-semibold text-foreground">
                Host name
              </label>
              <p className="mt-1 text-xs text-muted">
                Used as your trainer name for this session.
              </p>
              <input
                id="host-name"
                type="text"
                value={hostName}
                onChange={(event) => setHostName(event.target.value)}
                maxLength={60}
                autoComplete="nickname"
                className={cn(
                  'mt-3 w-full rounded-xl border border-border/70 bg-input/70 px-4 py-3 text-base text-foreground',
                  'min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
                )}
              />
            </div>

            {fetchError && (
              <p role="alert" className="mt-4 text-center text-sm text-red-300">
                {fetchError}
              </p>
            )}

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleStart}
                disabled={!selectedSlug || submitting}
                className={cn(
                  'inline-flex min-h-[44px] min-w-[12rem] items-center justify-center rounded-xl px-6 py-3',
                  'text-base font-semibold transition-colors',
                  'bg-brand text-background hover:bg-brand/90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {submitting ? 'Starting…' : 'Begin Adventure'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
