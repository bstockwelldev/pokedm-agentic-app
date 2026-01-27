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
    user: 'bg-blue-900/20 border border-blue-800/30',
    system: 'bg-orange-900/20 border border-orange-800/30',
    assistant: 'bg-muted/10 border border-border',
  };

  const roleHeaderStyles = {
    user: 'text-blue-300',
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
        'mb-4 p-3 rounded-md',
        roleStyles[role] || roleStyles.assistant,
        className
      )}
      {...props}
    >
      <strong
        id={headerId}
        className={cn(
          'block',
          roleHeaderStyles[role] || roleHeaderStyles.assistant
        )}
      >
        {roleLabels[role] || 'DM'}:
      </strong>
      {children}
    </article>
  );
}
