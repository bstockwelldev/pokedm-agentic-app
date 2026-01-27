import React from 'react';
import MessageCard from './MessageCard';
import MarkdownText from '../MarkdownText';
import ChoiceButton from './ChoiceButton';

/**
 * ChoicesMessage - Component for messages with choices
 * Displays the message content and choice buttons
 */
export default function ChoicesMessage({
  message,
  index,
  onChoiceSelect = () => {},
  onChoiceKeyDown = () => {},
  focusedChoiceIndex = -1,
  setFocusedChoiceIndex = () => {},
  ...props
}) {
  if (!message.choices || message.choices.length === 0) {
    // Fallback to regular narration if no choices
    return (
      <MessageCard
        role="assistant"
        headerId={`message-${index}-header`}
        {...props}
      >
        <MarkdownText className="mt-1">
          {message.content}
        </MarkdownText>
        {message.intent && (
          <div
            aria-label={`Intent: ${message.intent}`}
            className="text-xs text-muted mt-1"
          >
            Intent: {message.intent}
          </div>
        )}
      </MessageCard>
    );
  }

  return (
    <>
      <MessageCard
        role="assistant"
        headerId={`message-${index}-header`}
        {...props}
      >
        <MarkdownText className="mt-1">
          {message.content}
        </MarkdownText>
        {message.intent && (
          <div
            aria-label={`Intent: ${message.intent}`}
            className="text-xs text-muted mt-1"
          >
            Intent: {message.intent}
          </div>
        )}
      </MessageCard>
      
      {/* Choices Section */}
      <div className="mb-4 mt-4">
        <h3 id={`choices-heading-${index}`} className="text-lg font-semibold mb-3 text-foreground">
          What would you like to do?
        </h3>
        <div
          role="group"
          aria-labelledby={`choices-heading-${index}`}
          className="flex flex-col gap-2"
        >
          {message.choices.map((choice, idx) => (
            <ChoiceButton
              key={choice.option_id || idx}
              choice={choice}
              index={idx}
              isFocused={focusedChoiceIndex === idx}
              isFirstChoice={idx === 0}
              onSelect={onChoiceSelect}
              onKeyDown={onChoiceKeyDown}
              onFocus={() => setFocusedChoiceIndex(idx)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
