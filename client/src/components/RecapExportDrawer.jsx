import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import {
  generateRecapExport,
  downloadTextFile,
  copyToClipboard,
  generateRecapFilename,
  attachRecapToSession,
} from '../lib/recapExport';

/**
 * RecapExportDrawer — export session recap for family read-aloud between play nights.
 */
export default function RecapExportDrawer({
  isOpen,
  onClose,
  session,
  sessionId,
  model,
  onRecapAttached,
}) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [format, setFormat] = useState('md');
  const [polish, setPolish] = useState(false);
  const [preview, setPreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saveToSession, setSaveToSession] = useState(true);

  useEffect(() => {
    if (!isOpen || !session) {
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    generateRecapExport(session, { format, polish, model })
      .then((result) => {
        if (!cancelled) {
          setPreview(result.content);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to generate recap');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, session, format, polish, model]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  const handleDownload = async () => {
    if (!preview) {
      return;
    }

    try {
      if (saveToSession && sessionId) {
        const response = await attachRecapToSession(sessionId, preview);
        onRecapAttached?.(response.session);
      }

      const mimeType = format === 'txt' ? 'text/plain' : 'text/markdown';
      downloadTextFile(
        preview,
        generateRecapFilename(sessionId, format),
        mimeType
      );
      setSuccess('Recap downloaded successfully.');
    } catch (err) {
      setError(err.message || 'Failed to download recap');
    }
  };

  const handleCopy = async () => {
    if (!preview) {
      return;
    }

    try {
      await copyToClipboard(preview);

      if (saveToSession && sessionId) {
        const response = await attachRecapToSession(sessionId, preview);
        onRecapAttached?.(response.session);
      }

      setSuccess('Recap copied to clipboard.');
    } catch (err) {
      setError(err.message || 'Failed to copy recap');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recap-export-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={drawerRef}
        className={cn(
          'bg-background border border-border rounded-lg shadow-lg',
          'w-full max-w-2xl max-h-[90vh] overflow-hidden',
          'flex flex-col m-4'
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="recap-export-title" className="text-xl font-semibold text-foreground">
            Export Session Recap
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close recap export dialog"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-muted">
            Create a family-friendly recap to read aloud before your next play night.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset>
              <legend className="text-sm font-semibold text-foreground mb-2">Format</legend>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="recapFormat"
                    value="md"
                    checked={format === 'md'}
                    onChange={() => setFormat('md')}
                  />
                  Markdown (.md)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="recapFormat"
                    value="txt"
                    checked={format === 'txt'}
                    onChange={() => setFormat('txt')}
                  />
                  Plain text (.txt)
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-foreground mb-2">Options</legend>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={polish}
                  onChange={(event) => setPolish(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  AI-polished narrative
                  <span className="block text-xs text-muted">Uses your selected model when available; falls back offline.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm mt-2">
                <input
                  type="checkbox"
                  checked={saveToSession}
                  onChange={(event) => setSaveToSession(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Save to session continuity
                  <span className="block text-xs text-muted">Attaches recap for resume on next load.</span>
                </span>
              </label>
            </fieldset>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Preview</h3>
            <pre
              className={cn(
                'p-3 rounded-md border border-border bg-muted/10',
                'text-xs text-foreground whitespace-pre-wrap max-h-64 overflow-y-auto'
              )}
              aria-live="polite"
            >
              {isLoading ? 'Generating recap…' : preview || 'No recap content yet.'}
            </pre>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-900/20 border border-red-800/30 text-sm text-red-200" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-md bg-green-900/20 border border-green-800/30 text-sm text-green-200" role="status">
              {success}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-input border border-border text-foreground hover:bg-muted/20"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={isLoading || !preview}
            className="px-4 py-2 rounded-md bg-input border border-border text-foreground hover:bg-muted/20 disabled:opacity-50"
          >
            Copy
          </button>
          <button
            onClick={handleDownload}
            disabled={isLoading || !preview}
            className="px-4 py-2 rounded-md bg-brand text-background font-medium hover:opacity-90 disabled:opacity-50"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
