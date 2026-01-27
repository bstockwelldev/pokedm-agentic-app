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
        'border border-border rounded-lg',
        'p-4',
        'bg-background',
        className
      )}
      {...props}
    >
      {messages.length === 0 && !loading && (
        <div className="text-muted italic">
          Welcome to PokeDM! Start your adventure by describing what you'd like to do.
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
