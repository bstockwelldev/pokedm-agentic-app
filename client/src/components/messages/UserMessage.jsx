import React from 'react';
import MessageCard from './MessageCard';
import MarkdownText from '../MarkdownText';

/**
 * UserMessage - Component for user messages
 */
export default function UserMessage({ message, index, ...props }) {
  return (
    <MessageCard
      role="user"
      headerId={`message-${index}-header`}
      {...props}
    >
      <MarkdownText className="mt-1">
        {message.content}
      </MarkdownText>
    </MessageCard>
  );
}
