import React from 'react';
import { cn } from '../lib/utils';

/**
 * Composer - Input area for user messages
 * Includes textarea and send button
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

  return (
    <div
      className={cn(
        'border-t border-border',
        'p-4',
        'bg-background',
        className
      )}
      {...props}
    >
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
