import React from 'react';
import MessageCard from './MessageCard';
import MarkdownText from '../MarkdownText';

/**
 * DmNarration - Component for DM narration messages (assistant role)
 */
export default function DmNarration({ message, index, ...props }) {
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
