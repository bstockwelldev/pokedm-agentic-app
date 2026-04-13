/**
 * NarrationImage — STO-36
 *
 * Displays a DALL-E 3 generated image above a DM narration block.
 * Click to expand full-size in a lightbox.
 * Host-only "Regenerate" button (calls onRegenerate prop).
 *
 * Props:
 *   url           — image URL from DALL-E 3
 *   revisedPrompt — the prompt DALL-E actually used (shown in alt/title)
 *   onRegenerate  — callback for host regenerate button (optional)
 *   isHostView    — shows regenerate button
 *   loading       — shows skeleton while generating
 */

import React, { useState } from 'react';
import { cn } from '../lib/utils';

export default function NarrationImage({
  url,
  revisedPrompt,
  onRegenerate,
  isHostView = false,
  loading = false,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Skeleton while loading
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Generating image..."
        className={cn(
          'w-full rounded-xl overflow-hidden',
          'bg-background/60 border border-border/40',
          'animate-pulse',
          'aspect-[16/9]'
        )}
      >
        <div className="w-full h-full flex items-center justify-center text-xs text-muted">
          🎨 Generating scene...
        </div>
      </div>
    );
  }

  if (!url || imgError) return null;

  return (
    <>
      {/* Thumbnail */}
      <div className="relative group w-full rounded-xl overflow-hidden border border-border/40">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="w-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Click to expand image"
        >
          <img
            src={url}
            alt={revisedPrompt ?? 'DM scene illustration'}
            title={revisedPrompt}
            className="w-full object-cover max-h-72 transition-transform duration-300 group-hover:scale-[1.01]"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          {/* Expand hint */}
          <div className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-black/0 group-hover:bg-black/20 transition-colors',
            'pointer-events-none'
          )}>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
              🔍 Expand
            </span>
          </div>
        </button>

        {/* Host regenerate */}
        {isHostView && onRegenerate && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
            className={cn(
              'absolute top-2 right-2',
              'px-2 py-1 text-xs rounded-lg',
              'bg-black/60 text-white border border-white/20',
              'hover:bg-black/80 transition-colors',
              'opacity-0 group-hover:opacity-100',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:opacity-100'
            )}
            aria-label="Regenerate image"
          >
            🔄 Regen
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full-size image"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image"
          >
            ✕
          </button>
          <img
            src={url}
            alt={revisedPrompt ?? 'DM scene illustration'}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {revisedPrompt && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60 bg-black/40 px-3 py-1 rounded-full max-w-md text-center truncate">
              {revisedPrompt}
            </p>
          )}
        </div>
      )}
    </>
  );
}
