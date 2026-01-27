import React, { useState } from 'react';
import MessageCard from './MessageCard';
import { cn } from '../../lib/utils';
import MarkdownText from '../MarkdownText';
import JsonViewer from '../JsonViewer';

/**
 * ToolRunMessage - Component for displaying tool execution information
 * Phase 4: Enhanced to display tool executions from message.steps array
 */
export default function ToolRunMessage({ message, index, ...props }) {
  const [expanded, setExpanded] = useState(false);

  // Extract tool executions from steps
  const toolExecutions = React.useMemo(() => {
    if (!message.steps || !Array.isArray(message.steps)) return [];
    
    const executions = [];
    const toolCalls = message.steps.filter(s => s.stepType === 'tool-call');
    
    toolCalls.forEach((call) => {
      const result = message.steps.find(
        s => s.stepType === 'tool-result' && s.toolCallId === call.toolCallId
      );
      
      executions.push({
        toolName: call.toolName || 'Unknown Tool',
        parameters: call.args || call.parameters || {},
        result: result?.result || null,
        error: result?.error || null,
        status: result 
          ? (result.error ? 'failed' : 'done')
          : 'running',
      });
    });
    
    return executions;
  }, [message.steps]);

  if (toolExecutions.length === 0) {
    // Fallback for old message format
    const toolInfo = message.tool || null;
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
              No tool execution data available
            </div>
          )}
        </div>
      </MessageCard>
    );
  }

  const getStatusBadge = (status) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (status) {
      case 'running':
        return cn(baseClasses, 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50');
      case 'done':
        return cn(baseClasses, 'bg-green-900/30 text-green-300 border border-green-800/50');
      case 'failed':
        return cn(baseClasses, 'bg-red-900/30 text-red-300 border border-red-800/50');
      default:
        return cn(baseClasses, 'bg-muted text-muted-foreground');
    }
  };

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
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-purple-300">🔧</span>
            <strong className="text-purple-300">
              {toolExecutions.length} Tool Execution{toolExecutions.length !== 1 ? 's' : ''}
            </strong>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'px-2 py-1 text-xs rounded',
              'bg-purple-900/30 border border-purple-800/50',
              'text-purple-300 hover:text-purple-200',
              'transition-colors'
            )}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>

        {/* Tool Executions List */}
        <div className="space-y-2">
          {toolExecutions.map((execution, execIndex) => (
            <div
              key={execIndex}
              className={cn(
                'border border-purple-800/30 rounded p-2',
                'bg-purple-900/10',
                execution.status === 'failed' && 'border-red-800/50 bg-red-900/10',
                execution.status === 'running' && 'border-yellow-800/50 bg-yellow-900/10'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-purple-200">
                  {execution.toolName}
                </span>
                <span className={getStatusBadge(execution.status)}>
                  {execution.status}
                </span>
              </div>

              {/* Expanded Details */}
              {expanded && (
                <div className="mt-2 space-y-2 pt-2 border-t border-purple-800/30">
                  {/* Parameters */}
                  {Object.keys(execution.parameters).length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-purple-300 mb-1">
                        Parameters:
                      </div>
                      <div className="bg-purple-900/20 rounded p-1.5 text-xs">
                        <JsonViewer data={execution.parameters} />
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {execution.result && (
                    <div>
                      <div className="text-xs font-medium text-purple-300 mb-1">
                        Result:
                      </div>
                      <div className="bg-purple-900/20 rounded p-1.5 text-xs">
                        {typeof execution.result === 'string' ? (
                          <MarkdownText variant="compact">
                            {execution.result}
                          </MarkdownText>
                        ) : (
                          <JsonViewer data={execution.result} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {execution.error && (
                    <div>
                      <div className="text-xs font-medium text-red-300 mb-1">
                        Error:
                      </div>
                      <div className="bg-red-900/20 border border-red-800/50 rounded p-1.5 text-xs">
                        <MarkdownText variant="error">
                          {typeof execution.error === 'string' 
                            ? execution.error 
                            : JSON.stringify(execution.error, null, 2)}
                        </MarkdownText>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MessageCard>
  );
}
