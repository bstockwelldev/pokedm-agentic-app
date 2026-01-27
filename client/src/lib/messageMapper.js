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
 * Check if message has actual tool call executions
 * @param {Object} message - Message object
 * @returns {boolean} - True if message contains tool-call steps
 */
function hasToolCalls(message) {
  if (!message.steps || !Array.isArray(message.steps)) {
    return false;
  }
  // Check if any step has stepType === 'tool-call'
  return message.steps.some(step => step.stepType === 'tool-call');
}

/**
 * Get the appropriate message component for a message
 * @param {Object} message - Message object with role, content, choices, etc.
 * @returns {React.Component} - The appropriate message component
 */
export function getMessageComponent(message) {
  // System messages (highest priority)
  if (message.role === 'system') {
    return SystemMessage;
  }

  // User messages
  if (message.role === 'user') {
    return UserMessage;
  }

  // Assistant messages with choices (primary content - prioritize over tool executions)
  if (message.role === 'assistant' && message.choices && message.choices.length > 0) {
    return ChoicesMessage;
  }

  // Assistant dialogue (can be detected by content patterns or a dialogue flag)
  if (message.role === 'assistant' && message.dialogue) {
    return DmDialogue;
  }

  // Assistant narration (primary content - prioritize over tool executions)
  if (message.role === 'assistant' && message.content) {
    return DmNarration;
  }

  // Tool execution messages (only if actual tool calls exist, and no primary content)
  // This should only show if there are tool calls but no narration/choices
  if (message.tool || hasToolCalls(message)) {
    return ToolRunMessage;
  }

  // Default: Assistant narration
  if (message.role === 'assistant') {
    return DmNarration;
  }

  // Fallback to narration
  return DmNarration;
}

/**
 * Render a message using the appropriate component(s)
 * If message has both narration/choices AND tool executions, render both
 * @param {Object} message - Message object
 * @param {number} index - Message index
 * @param {Object} props - Additional props to pass to the component
 * @returns {React.Element|Array} - Rendered message component(s)
 */
export function renderMessage(message, index, props = {}) {
  const hasPrimaryContent = (message.role === 'assistant' && (message.content || (message.choices && message.choices.length > 0)));
  const hasToolExecutions = hasToolCalls(message) || message.tool;
  
  // If message has both primary content (narration/choices) AND tool executions,
  // render both components
  if (hasPrimaryContent && hasToolExecutions) {
    const PrimaryComponent = getMessageComponent(message);
    return React.createElement(React.Fragment, { key: index }, [
      React.createElement(PrimaryComponent, {
        key: `${index}-primary`,
        message: message,
        index: index,
        ...props,
      }),
      React.createElement(ToolRunMessage, {
        key: `${index}-tools`,
        message: message,
        index: `${index}-tools`,
        ...props,
      }),
    ]);
  }
  
  // Otherwise, render the single appropriate component
  const Component = getMessageComponent(message);
  return React.createElement(Component, {
    key: index,
    message: message,
    index: index,
    ...props,
  });
}
