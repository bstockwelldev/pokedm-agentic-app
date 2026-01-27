import React, { useState } from 'react';
import { cn } from '../lib/utils';

/**
 * Composer - Input area for user messages
 * Phase 5: Enhanced with quick action chips
 * Includes textarea, send button, and quick action chips
 */
export default function Composer({
  input,
  onInputChange,
  onSend,
  onKeyDown,
  loading,
  disabled,
  className,
  ...props
}) {
  const canSend = !loading && input.trim() && !disabled;
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Quick action commands
  const quickActions = [
    { command: '/pause', label: 'Pause', description: 'Pause the current scene' },
    { command: '/skip', label: 'Skip', description: 'Skip to next scene' },
    { command: '/recap', label: 'Recap', description: 'Get a recap of what happened' },
    { command: '/hint', label: 'Hint', description: 'Get a hint about what to do' },
    { command: '/save', label: 'Save', description: 'Save current progress' },
  ];

  const handleQuickAction = (command) => {
    onInputChange(command + ' ');
    // Focus the textarea after setting the command
    setTimeout(() => {
      const textarea = document.getElementById('message-input');
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(command.length + 1, command.length + 1);
      }
    }, 0);
    setShowQuickActions(false);
  };

  return (
    <div
      className={cn(
        'border-t border-border',
        'p-4',
        'bg-background',
        'relative',
        className
      )}
      {...props}
    >
      {/* Quick Actions Toggle */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowQuickActions(!showQuickActions)}
          className={cn(
            'px-2 py-1 text-xs rounded',
            'bg-input border border-border',
            'text-muted hover:text-foreground',
            'transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
          )}
          aria-label="Toggle quick actions"
          aria-expanded={showQuickActions}
        >
          {showQuickActions ? '▼' : '▶'} Quick Actions
        </button>
      </div>

      {/* Quick Action Chips */}
      {showQuickActions && (
        <div
          className="mb-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Quick action commands"
        >
          {quickActions.map((action) => (
            <button
              key={action.command}
              type="button"
              onClick={() => handleQuickAction(action.command)}
              disabled={loading || disabled}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md',
                'bg-input border border-border',
                'text-foreground',
                'hover:bg-muted/20 hover:border-brand/50',
                'transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'group'
              )}
              title={action.description}
            >
              <span className="font-medium text-brand">{action.command}</span>
              <span className="ml-1 text-muted group-hover:text-foreground">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}

      <label htmlFor="message-input" className="sr-only">
        Message input
      </label>
      <textarea
        id="message-input"
        rows={3}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Type your message or action here and press Enter to send"
        aria-describedby="input-help"
        disabled={loading || disabled}
        placeholder="Type your message or action here and press Enter to send"
        className={cn(
          'w-full mb-2 p-3',
          'bg-input border border-border rounded-md',
          'text-foreground',
          'resize-none',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      />
      <div
        id="input-help"
        className="text-xs text-muted mb-2"
      >
        Press Enter to send, Shift+Enter for new line
      </div>
      <button
        onClick={onSend}
        disabled={!canSend}
        aria-label="Send message"
        className={cn(
          'px-4 py-2',
          'bg-brand text-background',
          'rounded-md',
          'font-medium',
          'transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'hover:opacity-90 active:opacity-80'
        )}
      >
        {loading ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}
