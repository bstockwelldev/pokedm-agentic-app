import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { fetchPokemonMedia } from '../lib/pokemonMedia';

function formatPokemonName(value) {
  if (!value) return 'Unknown Pokemon';
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function Sprite({ label, src }) {
  if (!src) return null;
  return (
    <div className="flex items-center gap-1">
      <img
        src={src}
        alt={`${label} sprite`}
        loading="lazy"
        decoding="async"
        className="h-8 w-8 rounded bg-background/60 border border-border/60"
      />
      <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted">
        {label}
      </span>
    </div>
  );
}

export default function PokemonMedia({
  idOrName,
  sessionId,
  label,
  showOfficial = true,
  showSprites = false,
  className,
}) {
  const [media, setMedia] = useState(null);
  const [status, setStatus] = useState('idle');

  const displayName = useMemo(() => {
    const base = label || idOrName;
    return formatPokemonName(base);
  }, [label, idOrName]);

  useEffect(() => {
    let isMounted = true;
    if (!idOrName) {
      setMedia(null);
      setStatus('idle');
      return undefined;
    }

    setStatus('loading');
    fetchPokemonMedia(idOrName, sessionId)
      .then((data) => {
        if (!isMounted) return;
        setMedia(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [idOrName, sessionId]);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showOfficial && (
        <div className="h-14 w-14 rounded-lg border border-border/60 bg-background/60 overflow-hidden">
          {status === 'ready' && media?.officialArt ? (
            <img
              src={media.officialArt}
              alt={`Official art of ${media?.name || displayName}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="h-full w-full bg-muted/10" aria-hidden="true" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground truncate">
          {media?.name ? formatPokemonName(media.name) : displayName}
        </div>
        {showSprites && (
          <div className="mt-2 flex flex-wrap gap-3">
            <Sprite label="Battle" src={media?.battleSprite} />
            <Sprite label="Overworld" src={media?.overworldSprite} />
          </div>
        )}
        {status === 'error' && (
          <div className="text-xs text-muted mt-1">Art unavailable</div>
        )}
      </div>
    </div>
  );
}
