import React, { useEffect } from 'react';
import { cn } from '../lib/utils';

/**
 * ErrorBanner Component
 * Displays error messages in a non-intrusive banner at the top of the chat area
 * Includes retry, diagnostics, and dismiss actions
 */
export default function ErrorBanner({
  error,
  details,
  requestId,
  statusCode,
  timestamp,
  endpoint,
  onRetry,
  onDismiss,
  onCopyDiagnostics,
  autoDismissSeconds = 10,
  retryAfter,
  errorType,
  availableModels,
}) {
  // Auto-dismiss after specified seconds
  useEffect(() => {
    if (error && autoDismissSeconds > 0) {
      const timer = setTimeout(() => {
        if (onDismiss) {
          onDismiss();
        }
      }, autoDismissSeconds * 1000);

      return () => clearTimeout(timer);
    }
  }, [error, autoDismissSeconds, onDismiss]);

  if (!error) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onKeyDown={handleKeyDown}
      className={cn(
        'bg-red-500/10 text-red-100',
        'p-4 rounded-xl mb-4',
        'border border-red-500/40',
        'relative shadow-sm backdrop-blur'
      )}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="font-semibold mb-2 text-base">
            Error{statusCode ? ` (${statusCode})` : ''}
          </div>
          <p className="mb-2 text-sm whitespace-pre-wrap break-words">
            {error}
          </p>
          {details && (
            <pre className="text-xs opacity-90 mb-2 whitespace-pre-wrap break-words font-sans">
              {details}
            </pre>
          )}
          {retryAfter && (
            <div className="text-xs opacity-90 mb-2 font-medium">
              ⏱️ Please retry in {Math.ceil(retryAfter)} seconds
            </div>
          )}
          {errorType === 'model_not_found' && availableModels && availableModels.length > 0 && (
            <div className="text-xs opacity-90 mb-2">
              💡 Available models: {availableModels.slice(0, 5).join(', ')}
              {availableModels.length > 5 ? '...' : ''}
            </div>
          )}
          {requestId && (
            <div className="text-xs opacity-80 font-mono">
              Request ID: {requestId}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error"
            className={cn(
              'bg-transparent border-none text-red-100',
              'cursor-pointer text-2xl leading-none p-1',
              'opacity-80 hover:opacity-100 transition-opacity'
            )}
          >
            ×
          </button>
        )}
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        {onRetry && (
          <button
            onClick={onRetry}
            aria-label="Retry last request"
            className={cn(
              'bg-red-500/20 text-red-100 border border-red-400/40',
              'px-4 py-2 rounded-lg',
              'cursor-pointer font-medium text-sm',
              'hover:bg-red-500/30 transition-colors'
            )}
          >
            Retry
          </button>
        )}
        {onCopyDiagnostics && (
          <button
            onClick={onCopyDiagnostics}
            aria-label="View diagnostics"
            className={cn(
              'bg-transparent text-red-100',
              'border border-red-300/50 px-4 py-2 rounded-lg',
              'font-medium text-sm',
              'hover:bg-red-500/20 transition-colors'
            )}
          >
            View Diagnostics
          </button>
        )}
      </div>
    </div>
  );
}
