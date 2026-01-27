import React, { useEffect } from 'react';
import { cn } from '../lib/utils';
import MarkdownText from './MarkdownText';

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
        'bg-red-600 text-white',
        'p-4 rounded-lg mb-4',
        'border border-red-800',
        'relative'
      )}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="font-semibold mb-2 text-base">
            Error{statusCode ? ` (${statusCode})` : ''}
          </div>
          <MarkdownText variant="error" className="mb-2 text-sm">
            {error}
          </MarkdownText>
          {details && (
            <MarkdownText variant="error" className="text-xs opacity-90 mb-2">
              {details}
            </MarkdownText>
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
              'bg-transparent border-none text-white',
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
              'bg-white text-red-600 border-none',
              'px-4 py-2 rounded',
              'cursor-pointer font-medium text-sm',
              'hover:bg-gray-100 transition-colors'
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
              'bg-transparent text-white',
              'border border-white px-4 py-2 rounded',
              'font-medium text-sm',
              'hover:bg-white/10 transition-colors'
            )}
          >
            View Diagnostics
          </button>
        )}
      </div>
    </div>
  );
}
