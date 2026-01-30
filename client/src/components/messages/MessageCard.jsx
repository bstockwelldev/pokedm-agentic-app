import React from 'react';
import { cn } from '../../lib/utils';

/**
 * MessageCard - Base component for all message types
 * Provides common structure and styling
 */
export default function MessageCard({
  role,
  children,
  className,
  headerId,
  ...props
}) {
  const roleStyles = {
    user: 'bg-brand/10 border border-brand/30',
    system: 'bg-orange-500/10 border border-orange-400/30',
    assistant: 'bg-background/50 border border-border/60',
  };

  const roleHeaderStyles = {
    user: 'text-brand',
    system: 'text-orange-300',
    assistant: 'text-foreground',
  };

  const roleLabels = {
    user: 'You',
    system: 'System',
    assistant: 'DM',
  };

  return (
    <article
      role="article"
      aria-labelledby={headerId}
      className={cn(
        'mb-4 p-4 rounded-xl',
        'shadow-[0_8px_24px_-20px_rgba(0,0,0,0.8)]',
        roleStyles[role] || roleStyles.assistant,
        className
      )}
      {...props}
    >
      <strong
        id={headerId}
        className={cn(
          'block text-xs uppercase tracking-[0.18em] mb-2',
          roleHeaderStyles[role] || roleHeaderStyles.assistant
        )}
      >
        {roleLabels[role] || 'DM'}:
      </strong>
      {children}
    </article>
  );
}
