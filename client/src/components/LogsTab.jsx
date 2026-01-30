import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import JsonViewer from './JsonViewer';

/**
 * LogsTab - Display raw steps/logs data for debugging
 * Phase 4: Tool & Log Visibility
 */
export default function LogsTab({ messages = [] }) {
  const [expandedLogs, setExpandedLogs] = useState({});
  const [filterType, setFilterType] = useState('all'); // 'all', 'tool-call', 'tool-result', 'text'

  // Extract all steps from all messages
  const allSteps = useMemo(() => {
    const steps = [];
    messages.forEach((message, messageIndex) => {
      if (message.steps && Array.isArray(message.steps)) {
        message.steps.forEach((step, stepIndex) => {
          steps.push({
            ...step,
            messageIndex,
            stepIndex,
            id: `${messageIndex}-${stepIndex}`,
            timestamp: step.timestamp || message.timestamp || new Date().toISOString(),
          });
        });
      }
    });
    return steps;
  }, [messages]);

  // Filter steps by type
  const filteredSteps = useMemo(() => {
    if (filterType === 'all') return allSteps;
    return allSteps.filter(step => step.stepType === filterType);
  }, [allSteps, filterType]);

  const toggleLog = (logId) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  const getStepTypeBadge = (stepType) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (stepType) {
      case 'tool-call':
        return cn(baseClasses, 'bg-purple-900/30 text-purple-300 border border-purple-800/50');
      case 'tool-result':
        return cn(baseClasses, 'bg-blue-900/30 text-blue-300 border border-blue-800/50');
      case 'text':
        return cn(baseClasses, 'bg-green-900/30 text-green-300 border border-green-800/50');
      default:
        return cn(baseClasses, 'bg-muted text-muted-foreground');
    }
  };

  if (allSteps.length === 0) {
    return (
      <div className="text-muted italic text-sm">
        No logs available. Steps will appear here when agents execute actions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted">Filter:</span>
        {['all', 'tool-call', 'tool-result', 'text'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              'px-3 py-1 text-xs rounded-full transition-colors border',
              filterType === type
                ? 'bg-brand/90 text-background font-medium border-brand/40'
                : 'bg-background/60 border-border/60 text-muted hover:text-foreground hover:bg-muted/20'
            )}
          >
            {type.replace('-', ' ')}
            {type !== 'all' && (
              <span className="ml-1 opacity-75">
                ({allSteps.filter(s => s.stepType === type).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {filteredSteps.map((step) => (
          <div
            key={step.id}
            className={cn(
              'border border-border/60 rounded-xl p-3',
              'bg-background/60 text-xs shadow-[0_8px_24px_-20px_rgba(0,0,0,0.8)]',
              'hover:bg-muted/20 transition-colors'
            )}
          >
            {/* Log Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={getStepTypeBadge(step.stepType)}>
                    {step.stepType || 'unknown'}
                  </span>
                  {step.toolName && (
                    <span className="text-foreground font-medium">
                      {step.toolName}
                    </span>
                  )}
                  {step.toolCallId && (
                    <span className="text-muted text-xs">
                      ID: {step.toolCallId.substring(0, 8)}...
                    </span>
                  )}
                </div>
                <div className="text-muted">
                  Message #{step.messageIndex + 1}, Step #{step.stepIndex + 1} • {new Date(step.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <button
                onClick={() => toggleLog(step.id)}
                className={cn(
                  'px-2 py-1 text-xs rounded-full',
                  'bg-background/60 border border-border/60',
                  'text-muted hover:text-foreground',
                  'transition-colors'
                )}
                aria-label={expandedLogs[step.id] ? 'Collapse' : 'Expand'}
              >
                {expandedLogs[step.id] ? '▼' : '▶'}
              </button>
            </div>

            {/* Expanded Details */}
            {expandedLogs[step.id] && (
              <div className="mt-2 pt-2 border-t border-border/60">
                <JsonViewer data={step} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="text-xs text-muted pt-2 border-t border-border/60">
        Total: {allSteps.length} step(s)
        {filterType !== 'all' && ` (${filteredSteps.length} filtered)`}
      </div>
    </div>
  );
}
