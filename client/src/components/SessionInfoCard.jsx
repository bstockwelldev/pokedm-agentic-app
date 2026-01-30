import React from 'react';
import { cn } from '../lib/utils';

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.65rem] uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="text-sm text-foreground truncate" title={value}>
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
      <div className="rounded-lg border border-border bg-input/40 p-3">
        <div className="text-xs font-semibold text-foreground">
          Current Session
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <InfoItem label="Campaign" value={campaignLabel} />
          <InfoItem label="Session" value={sessionLabel} />
          <InfoItem label="Episode" value={episodeLabel} />
          <InfoItem label="Location" value={locationLabel} />
          <InfoItem label="Party" value={partyLabel} />
        </div>
      </div>
    </section>
  );
}
