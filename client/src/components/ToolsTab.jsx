import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import MarkdownText from './MarkdownText';
import JsonViewer from './JsonViewer';

/**
 * ToolsTab - Display tool executions from agent steps
 * Phase 4: Tool & Log Visibility
 */
export default function ToolsTab({ messages = [] }) {
  const [expandedTools, setExpandedTools] = useState({});
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'running', 'done', 'failed', 'awaiting'

  // Extract and pair tool executions from all messages
  const toolExecutions = useMemo(() => {
    const executions = [];
    
    messages.forEach((message, messageIndex) => {
      if (!message.steps || !Array.isArray(message.steps)) return;
      
      // Pair tool-call steps with their tool-result steps
      const toolCalls = message.steps.filter(s => s.stepType === 'tool-call');
      
      toolCalls.forEach((call) => {
        const result = message.steps.find(
          s => s.stepType === 'tool-result' && s.toolCallId === call.toolCallId
        );
        
        executions.push({
          id: call.toolCallId || `tool-${messageIndex}-${executions.length}`,
          messageIndex,
          toolName: call.toolName || 'Unknown Tool',
          parameters: call.args || call.parameters || {},
          result: result?.result || null,
          error: result?.error || null,
          status: result 
            ? (result.error ? 'failed' : 'done')
            : 'running',
          timestamp: call.timestamp || message.timestamp || new Date().toISOString(),
        });
      });
    });
    
    return executions;
  }, [messages]);

  // Filter executions by status
  const filteredExecutions = useMemo(() => {
    if (filterStatus === 'all') return toolExecutions;
    return toolExecutions.filter(exec => exec.status === filterStatus);
  }, [toolExecutions, filterStatus]);

  const toggleTool = (toolId) => {
    setExpandedTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const getStatusBadge = (status) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (status) {
      case 'running':
        return cn(baseClasses, 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50');
      case 'done':
        return cn(baseClasses, 'bg-green-900/30 text-green-300 border border-green-800/50');
      case 'failed':
        return cn(baseClasses, 'bg-red-900/30 text-red-300 border border-red-800/50');
      case 'awaiting':
        return cn(baseClasses, 'bg-blue-900/30 text-blue-300 border border-blue-800/50');
      default:
        return cn(baseClasses, 'bg-muted text-muted-foreground');
    }
  };

  if (toolExecutions.length === 0) {
    return (
      <div className="text-muted italic text-sm">
        No tool executions yet. Tools will appear here when agents use them.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted">Filter:</span>
        {['all', 'running', 'done', 'failed', 'awaiting'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={cn(
              'px-3 py-1 text-xs rounded-md transition-colors',
              filterStatus === status
                ? 'bg-brand text-background font-medium'
                : 'bg-input border border-border text-muted hover:text-foreground hover:bg-muted/20'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1 opacity-75">
                ({toolExecutions.filter(e => e.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tool Executions List */}
      <div className="space-y-3">
        {filteredExecutions.map((execution) => (
          <div
            key={execution.id}
            className={cn(
              'border border-border rounded-lg p-3',
              'bg-background',
              execution.status === 'failed' && 'border-red-800/50 bg-red-900/10',
              execution.status === 'running' && 'border-yellow-800/50 bg-yellow-900/10',
              execution.status === 'done' && 'border-green-800/50 bg-green-900/10'
            )}
          >
            {/* Tool Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔧</span>
                  <h4 className="font-semibold text-foreground truncate">
                    {execution.toolName}
                  </h4>
                  <span className={getStatusBadge(execution.status)}>
                    {execution.status}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {new Date(execution.timestamp).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => toggleTool(execution.id)}
                className={cn(
                  'px-2 py-1 text-xs rounded',
                  'bg-input border border-border',
                  'text-muted hover:text-foreground',
                  'transition-colors'
                )}
                aria-label={expandedTools[execution.id] ? 'Collapse' : 'Expand'}
              >
                {expandedTools[execution.id] ? '▼' : '▶'}
              </button>
            </div>

            {/* Expanded Details */}
            {expandedTools[execution.id] && (
              <div className="mt-3 space-y-3 pt-3 border-t border-border">
                {/* Parameters */}
                {Object.keys(execution.parameters).length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-foreground mb-2">
                      Parameters:
                    </h5>
                    <div className="bg-muted/20 rounded p-2">
                      <JsonViewer data={execution.parameters} />
                    </div>
                  </div>
                )}

                {/* Result */}
                {execution.result && (
                  <div>
                    <h5 className="text-sm font-medium text-foreground mb-2">
                      Result:
                    </h5>
                    <div className="bg-muted/20 rounded p-2">
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
                    <h5 className="text-sm font-medium text-red-300 mb-2">
                      Error:
                    </h5>
                    <div className="bg-red-900/20 border border-red-800/50 rounded p-2">
                      <MarkdownText variant="error">
                        {typeof execution.error === 'string' 
                          ? execution.error 
                          : JSON.stringify(execution.error, null, 2)}
                      </MarkdownText>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {execution.status === 'failed' && (
                  <div className="flex gap-2 pt-2">
                    <button
                      className={cn(
                        'px-3 py-1.5 text-xs rounded-md',
                        'bg-brand text-background font-medium',
                        'hover:opacity-90 transition-opacity'
                      )}
                      onClick={() => {
                        // TODO: Implement retry functionality
                        console.log('Retry tool:', execution.id);
                      }}
                    >
                      Retry Tool
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="text-xs text-muted pt-2 border-t border-border">
        Total: {toolExecutions.length} tool execution(s)
        {filterStatus !== 'all' && ` (${filteredExecutions.length} filtered)`}
      </div>
    </div>
  );
}
