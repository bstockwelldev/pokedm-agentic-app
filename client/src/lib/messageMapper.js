/**
 * Message Mapper Utility
 * Determines which message component to use based on message properties
 */

import React from 'react';
import {
  UserMessage,
  DmNarration,
  DmDialogue,
  SystemMessage,
  ChoicesMessage,
  ToolRunMessage,
} from '../components/messages';

/**
 * Get the appropriate message component for a message
 * @param {Object} message - Message object with role, content, choices, etc.
 * @returns {React.Component} - The appropriate message component
 */
export function getMessageComponent(message) {
  // Tool execution messages (Phase 4 - placeholder for now)
  if (message.tool || message.steps) {
    return ToolRunMessage;
  }

  // System messages
  if (message.role === 'system') {
    return SystemMessage;
  }

  // User messages
  if (message.role === 'user') {
    return UserMessage;
  }

  // Assistant messages with choices
  if (message.role === 'assistant' && message.choices && message.choices.length > 0) {
    return ChoicesMessage;
  }

  // Assistant dialogue (can be detected by content patterns or a dialogue flag)
  // For now, we'll use DmDialogue if there's a dialogue indicator
  // Otherwise default to DmNarration
  if (message.role === 'assistant' && message.dialogue) {
    return DmDialogue;
  }

  // Default: Assistant narration
  if (message.role === 'assistant') {
    return DmNarration;
  }

  // Fallback to narration
  return DmNarration;
}

/**
 * Render a message using the appropriate component
 * @param {Object} message - Message object
 * @param {number} index - Message index
 * @param {Object} props - Additional props to pass to the component
 * @returns {React.Element} - Rendered message component
 */
export function renderMessage(message, index, props = {}) {
  const Component = getMessageComponent(message);
  return React.createElement(Component, {
    key: index,
    message: message,
    index: index,
    ...props,
  });
}
