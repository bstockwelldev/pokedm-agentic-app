import React, { useState } from 'react';
import { cn } from '../lib/utils';
import StateTab from './StateTab';
import ToolsTab from './ToolsTab';
import LogsTab from './LogsTab';

/**
 * RightPanel - Sidebar panel for session state, tools, and logs
 * Phase 4: Enhanced with ToolsTab and LogsTab
 */
export default function RightPanel({
  session,
  messages = [],
  className,
  ...props
}) {
  const [activeTab, setActiveTab] = useState('state');

  return (
    <aside
      aria-label="Session information panel"
      className={cn(
        'border-l border-border',
        'bg-background',
        'overflow-hidden',
        'hidden lg:flex lg:flex-col', // Hide on mobile, show on desktop
        className
      )}
      role="complementary"
      {...props}
    >
      {/* Tabs */}
      <div className="flex border-b border-border" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'state'}
          aria-controls="state-tabpanel"
          id="state-tab"
          onClick={() => setActiveTab('state')}
          className={cn(
            'px-4 py-2 text-sm font-medium',
            'border-b-2 transition-colors',
            activeTab === 'state'
              ? 'border-brand text-foreground'
              : 'border-transparent text-muted hover:text-foreground'
          )}
        >
          State
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'tools'}
          aria-controls="tools-tabpanel"
          id="tools-tab"
          onClick={() => setActiveTab('tools')}
          className={cn(
            'px-4 py-2 text-sm font-medium',
            'border-b-2 transition-colors',
            activeTab === 'tools'
              ? 'border-brand text-foreground'
              : 'border-transparent text-muted hover:text-foreground'
          )}
        >
          Tools
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'logs'}
          aria-controls="logs-tabpanel"
          id="logs-tab"
          onClick={() => setActiveTab('logs')}
          className={cn(
            'px-4 py-2 text-sm font-medium',
            'border-b-2 transition-colors',
            activeTab === 'logs'
              ? 'border-brand text-foreground'
              : 'border-transparent text-muted hover:text-foreground'
          )}
        >
          Logs
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* State Tab */}
        <div
          role="tabpanel"
          id="state-tabpanel"
          aria-labelledby="state-tab"
          hidden={activeTab !== 'state'}
        >
          <StateTab session={session} />
        </div>

        {/* Tools Tab */}
        <div
          role="tabpanel"
          id="tools-tabpanel"
          aria-labelledby="tools-tab"
          hidden={activeTab !== 'tools'}
        >
          <ToolsTab messages={messages} />
        </div>

        {/* Logs Tab */}
        <div
          role="tabpanel"
          id="logs-tabpanel"
          aria-labelledby="logs-tab"
          hidden={activeTab !== 'logs'}
        >
          <LogsTab messages={messages} />
        </div>
      </div>
    </aside>
  );
}
