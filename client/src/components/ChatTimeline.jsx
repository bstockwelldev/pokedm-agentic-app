import React from 'react';
import { cn } from '../lib/utils';
import { MessageSkeleton } from './Skeleton';

/**
 * ChatTimeline - Container for chat messages
 * Displays messages in a scrollable log format
 * Phase 5: Enhanced with skeleton loaders
 */
export default function ChatTimeline({
  messages,
  loading,
  children,
  className,
  ...props
}) {
  return (
    <div
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      aria-atomic="false"
      className={cn(
        'flex-1 overflow-y-auto min-h-0',
        'border border-border/60 rounded-xl',
        'p-5',
        'bg-background/60 backdrop-blur',
        'shadow-[0_12px_32px_-24px_rgba(0,0,0,0.8)]',
        className
      )}
      {...props}
    >
      {messages.length === 0 && !loading && (
        <div className="rounded-lg border border-border/60 bg-background/50 p-4 text-sm text-muted">
          Welcome to PokeDM! Start your adventure by describing what you would like to do.
        </div>
      )}
      
      {children}
      
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4"
        >
          <MessageSkeleton variant="assistant" />
        </div>
      )}
    </div>
  );
}
