import React from 'react';
import { cn } from '../lib/utils';

function InfoItem({ label, value, emphasis = false }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-lg border px-3 py-2',
        'bg-background/40 border-border/60',
        emphasis && 'bg-brand/10 border-brand/40'
      )}
    >
      <div className="text-[0.7rem] uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-sm font-semibold text-foreground truncate',
          emphasis && 'text-foreground'
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

export default function SessionInfoCard({ session, sessionId, className, ...props }) {
  const campaignName = session?.campaign?.region?.name?.trim();
  const campaignId = session?.campaign?.campaign_id || session?.session?.campaign_id;
  const episodeTitle = session?.session?.episode_title?.trim();
  const locationId = session?.session?.scene?.location_id?.trim();
  const partySize = Array.isArray(session?.characters)
    ? session.characters.reduce((sum, character) => sum + (character.pokemon_party?.length || 0), 0)
    : 0;

  const campaignLabel = campaignName || (campaignId ? `Campaign ${campaignId.slice(0, 8)}...` : 'No campaign yet');
  const episodeLabel = episodeTitle || 'Untitled episode';
  const locationLabel = locationId || 'Unknown location';
  const sessionLabel = sessionId ? `${sessionId.slice(0, 8)}...` : 'No session';
  const partyLabel = `${partySize} Pokemon`;

  return (
    <section
      className={cn('px-4 pt-4 lg:hidden', className)}
      role="region"
      aria-label="Current session information"
      {...props}
    >
      <div
        className={cn(
          'rounded-xl border border-border/60 p-4 shadow-sm',
          'bg-gradient-to-br from-background/70 via-background/40 to-input/50'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Current Session
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">
              Session
            </span>
            <span
              className={cn(
                'rounded-full border border-border/60 px-2 py-0.5',
                'bg-background/70 text-xs font-semibold text-foreground'
              )}
              title={sessionId || 'No session'}
            >
              {sessionLabel}
            </span>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <InfoItem label="Campaign" value={campaignLabel} emphasis />
          <InfoItem label="Episode" value={episodeLabel} />
          <InfoItem label="Location" value={locationLabel} emphasis />
          <InfoItem label="Party" value={partyLabel} />
        </div>
      </div>
    </section>
  );
}
