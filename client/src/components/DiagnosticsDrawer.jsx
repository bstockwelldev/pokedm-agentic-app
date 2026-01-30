import React, { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import MarkdownText from './MarkdownText';

/**
 * DiagnosticsDrawer Component
 * Displays detailed error diagnostics in a modal drawer
 * Includes copy-to-clipboard functionality
 */
export default function DiagnosticsDrawer({ isOpen, onClose, diagnostics }) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button when drawer opens
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Trap focus within drawer
      if (e.key === 'Tab') {
        const focusableElements = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const diagnosticsJson = JSON.stringify(diagnostics, null, 2);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticsJson);
      // Could show a toast notification here
      alert('Diagnostics copied to clipboard');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = diagnosticsJson;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Diagnostics copied to clipboard');
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
        alert('Failed to copy. Please select and copy manually.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-title"
      onClick={handleOverlayClick}
      className={cn(
        'fixed inset-0 z-50',
        'flex items-end justify-center',
        'bg-black/60 backdrop-blur-sm',
        'p-4'
      )}
    >
      <div
        ref={drawerRef}
        className={cn(
          'w-full max-w-2xl max-h-[80vh]',
          'bg-background/95 text-foreground',
          'border border-border/60 rounded-t-xl',
          'shadow-2xl flex flex-col'
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
          <h2 id="diagnostics-title" className="text-lg font-semibold">
            Error Diagnostics
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close diagnostics drawer"
            className={cn(
              'rounded-md p-2 text-muted',
              'hover:text-foreground hover:bg-muted/20',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="text-sm font-semibold text-foreground mb-2">Request Details</div>
            <div className="text-xs text-muted font-mono space-y-1">
              {diagnostics.requestId && (
                <div>
                  <strong>Request ID:</strong> {diagnostics.requestId}
                </div>
              )}
              {diagnostics.timestamp && (
                <div>
                  <strong>Timestamp:</strong> {new Date(diagnostics.timestamp).toLocaleString()}
                </div>
              )}
              {diagnostics.endpoint && (
                <div>
                  <strong>Endpoint:</strong> {diagnostics.method || 'POST'} {diagnostics.endpoint}
                </div>
              )}
              {diagnostics.statusCode && (
                <div>
                  <strong>Status Code:</strong> {diagnostics.statusCode}
                </div>
              )}
            </div>
          </div>

          {diagnostics.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <div className="mb-2 text-sm font-semibold text-red-100">Error Message</div>
              <MarkdownText variant="error" className="text-sm">
                {diagnostics.error}
              </MarkdownText>
            </div>
          )}

          {diagnostics.details && (
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="mb-2 text-sm font-semibold text-foreground">Details</div>
              <MarkdownText variant="compact" className="text-muted">
                {diagnostics.details}
              </MarkdownText>
            </div>
          )}

          {diagnostics.stack && (
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="mb-2 text-sm font-semibold text-foreground">Stack Trace</div>
              <pre className="text-xs text-muted bg-background/80 p-3 rounded-md overflow-x-auto font-mono whitespace-pre-wrap break-words">
                {diagnostics.stack}
              </pre>
            </div>
          )}

          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="mb-2 text-sm font-semibold text-foreground">Full Diagnostics JSON</div>
            <pre
              role="textbox"
              aria-readonly="true"
              aria-label="Full diagnostics JSON"
              className="text-xs text-muted bg-background/80 p-3 rounded-md overflow-auto font-mono whitespace-pre-wrap break-words max-h-[200px]"
            >
              {diagnosticsJson}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/60 flex gap-2 justify-end">
          <button
            onClick={handleCopyToClipboard}
            aria-label="Copy diagnostics to clipboard"
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-brand/90 text-background shadow-sm',
              'hover:opacity-90 transition-opacity',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
            )}
          >
            Copy to Clipboard
          </button>
          <button
            onClick={onClose}
            aria-label="Close diagnostics"
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-background/60 text-foreground border border-border/60',
              'hover:bg-muted/20 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
            )}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
