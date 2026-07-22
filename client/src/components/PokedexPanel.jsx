import React, { useMemo } from 'react';
import { cn } from '../lib/utils';
import {
  buildPokedexRows,
  isPokedexTrackingEnabled,
} from '../lib/pokedexTracking';

function StatusBadge({ status }) {
  const isCaught = status === 'caught';
  const label = isCaught ? 'Caught' : 'Seen';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        isCaught
          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
          : 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
      )}
      aria-label={`Discovery status: ${label}`}
    >
      {label}
    </span>
  );
}

function RegionalVariantBadge() {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30'
      )}
      aria-label="Regional variant"
    >
      Regional
    </span>
  );
}

function PokedexEmptyState({ campaignName }) {
  return (
    <div
      className="rounded-xl border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground"
      role="status"
    >
      <p className="font-medium text-foreground">No Pokédex entries yet</p>
      <p className="mt-2">
        During play, the DM records sightings and catches in session continuity.
        Explore routes, battle wild Pokémon, and talk to Professor Liora — new
        discoveries appear here automatically after each turn.
      </p>
      {campaignName && (
        <p className="mt-2 text-xs text-muted">
          Tracking active for {campaignName}.
        </p>
      )}
    </div>
  );
}

/**
 * Pokédex tracking panel — Celestide Expansion §10.
 * Lists continuity.discovered_pokemon with Species | Form | Location | Notes.
 */
export default function PokedexPanel({ session }) {
  const enabled = isPokedexTrackingEnabled(session);
  const rows = useMemo(() => buildPokedexRows(session), [session]);
  const campaignName = session?.campaign?.region?.name || session?.campaign?.campaign_id;

  if (!session) {
    return (
      <div className="text-sm text-muted-foreground" role="status">
        Pokédex entries appear once your session is active.
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="text-sm text-muted-foreground" role="status">
        Pokédex tracking is available for supported campaigns (Celestide Isles,
        Aurora Region).
      </div>
    );
  }

  if (rows.length === 0) {
    return <PokedexEmptyState campaignName={campaignName} />;
  }

  const seenCount = rows.filter((row) => row.status === 'seen').length;
  const caughtCount = rows.filter((row) => row.status === 'caught').length;
  const regionalCount = rows.filter((row) => row.isRegionalVariant).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Pokédex</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {rows.length} discovered · {seenCount} seen · {caughtCount} caught
          {regionalCount > 0 ? ` · ${regionalCount} regional` : ''}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <caption className="sr-only">
            Pokédex discoveries for {campaignName || 'current campaign'}
          </caption>
          <thead className="bg-background/80 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Species
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Form
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Location
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row) => (
              <tr key={row.id} className="bg-background/40">
                <td className="px-3 py-2 align-top">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-foreground">{row.species}</span>
                    <StatusBadge status={row.status} />
                    {row.isRegionalVariant && <RegionalVariantBadge />}
                  </div>
                </td>
                <td className="px-3 py-2 align-top text-muted-foreground">
                  {row.form}
                </td>
                <td className="px-3 py-2 align-top text-muted-foreground">
                  {row.location}
                </td>
                <td className="px-3 py-2 align-top text-muted-foreground">
                  {row.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
