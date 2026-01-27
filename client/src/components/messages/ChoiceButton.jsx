import React from 'react';
import { cn } from '../../lib/utils';
import MarkdownText from '../MarkdownText';

/**
 * ChoiceButton - Accessible choice button component
 * Highlights safe defaults and supports keyboard navigation
 */
export default function ChoiceButton({
  choice,
  index,
  isFocused,
  isFirstChoice,
  onSelect,
  onKeyDown,
  onFocus,
}) {
  const fullDescription = choice.description
    ? `${choice.label}: ${choice.description}`
    : choice.label;

  return (
    <button
      onClick={() => onSelect(choice)}
      onKeyDown={(e) => onKeyDown(e, choice, index)}
      onFocus={onFocus}
      aria-label={fullDescription}
      aria-current={isFirstChoice ? 'true' : undefined}
      className={cn(
        'p-3 text-left rounded-md',
        'border-2 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
        isFocused
          ? 'border-brand bg-brand/10'
          : isFirstChoice
          ? 'border-border bg-brand/5'
          : 'border-border bg-input',
        'hover:bg-brand/10'
      )}
    >
      <strong className="text-foreground">{choice.label}</strong>
      {choice.description && (
        <MarkdownText variant="compact" className="mt-1">
          {choice.description}
        </MarkdownText>
      )}
    </button>
  );
}
