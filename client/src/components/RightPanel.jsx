import React, { useState } from 'react';
import { cn } from '../lib/utils';
import StateTab from './StateTab';

/**
 * RightPanel - Sidebar panel for session state, tools, and logs
 * Phase 3: Enhanced with tabs and structured StateTab
 */
export default function RightPanel({
  session,
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

        {/* Tools Tab - Phase 4 Placeholder */}
        <div
          role="tabpanel"
          id="tools-tabpanel"
          aria-labelledby="tools-tab"
          hidden={activeTab !== 'tools'}
        >
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            Tool Executions
          </h3>
          <div className="text-muted italic text-sm">
            Tool execution history will be displayed here in Phase 4.
            {session?.steps && session.steps.length > 0 && (
              <div className="mt-2 text-xs">
                {session.steps.length} tool execution(s) available
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
