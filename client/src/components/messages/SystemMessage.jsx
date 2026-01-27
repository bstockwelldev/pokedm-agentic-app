import React from 'react';
import MessageCard from './MessageCard';
import MarkdownText from '../MarkdownText';

/**
 * SystemMessage - Component for system notifications
 */
export default function SystemMessage({ message, index, ...props }) {
  return (
    <MessageCard
      role="system"
      headerId={`message-${index}-header`}
      {...props}
    >
      <MarkdownText className="mt-1">
        {message.content}
      </MarkdownText>
    </MessageCard>
  );
}
