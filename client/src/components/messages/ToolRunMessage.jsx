import React from 'react';
import MessageCard from './MessageCard';
import { cn } from '../../lib/utils';

/**
 * ToolRunMessage - Component for displaying tool execution information
 * Placeholder for Phase 4 - will be enhanced when tool execution data is available
 */
export default function ToolRunMessage({ message, index, ...props }) {
  // For now, this is a placeholder
  // In Phase 4, this will display tool runs from message.steps array
  const toolInfo = message.tool || message.steps?.[0] || null;

  return (
    <MessageCard
      role="system"
      headerId={`message-${index}-header`}
      className={cn(
        'bg-purple-900/20 border border-purple-800/30',
        props.className
      )}
      {...props}
    >
      <div className="mt-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-purple-300">🔧</span>
          <strong className="text-purple-300">Tool Execution</strong>
        </div>
        {toolInfo ? (
          <div className="text-sm text-muted">
            <div>Tool: {toolInfo.name || toolInfo.tool || 'Unknown'}</div>
            {toolInfo.status && (
              <div className="mt-1">
                Status: <span className="text-foreground">{toolInfo.status}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted italic">
            Tool execution details will be displayed here in Phase 4
          </div>
        )}
      </div>
    </MessageCard>
  );
}
