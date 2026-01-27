import React from 'react';
import MessageCard from './MessageCard';
import MarkdownText from '../MarkdownText';

/**
 * DmDialogue - Component for DM dialogue messages
 * Similar to narration but can be styled differently if needed
 */
export default function DmDialogue({ message, index, ...props }) {
  return (
    <MessageCard
      role="assistant"
      headerId={`message-${index}-header`}
      className="italic" // Dialogue can be italicized
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
