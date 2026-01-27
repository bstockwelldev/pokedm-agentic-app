import React, { useState } from 'react';
import { cn } from '../lib/utils';
import StateTab from './StateTab';
import ToolsTab from './ToolsTab';
import LogsTab from './LogsTab';
import MobileBottomSheet from './MobileBottomSheet';

/**
 * RightPanel - Sidebar panel for session state, tools, and logs
 * Phase 5: Enhanced with mobile bottom sheet support
 */
export default function RightPanel({
  session,
  messages = [],
  className,
  ...props
}) {
  const [activeTab, setActiveTab] = useState('state');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const tabLabels = {
    state: 'Session State',
    tools: 'Tool Executions',
    logs: 'Logs',
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'state':
        return <StateTab session={session} />;
      case 'tools':
        return <ToolsTab messages={messages} />;
      case 'logs':
        return <LogsTab messages={messages} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
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
          {['state', 'tools', 'logs'].map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`${tab}-tabpanel`}
              id={`${tab}-tab`}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium',
                'border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="flex-1 overflow-y-auto p-4">
          <div
            role="tabpanel"
            id={`${activeTab}-tabpanel`}
            aria-labelledby={`${activeTab}-tab`}
          >
            {renderTabContent()}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Sheet */}
      <MobileBottomSheet
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        title={tabLabels[activeTab]}
      >
        {/* Mobile Tabs */}
        <div className="flex border-b border-border mb-4" role="tablist">
          {['state', 'tools', 'logs'].map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 px-3 py-2 text-sm font-medium',
                'border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-muted'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Mobile Tab Content */}
        {renderTabContent()}
      </MobileBottomSheet>

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className={cn(
          'lg:hidden',
          'fixed bottom-20 right-4 z-30',
          'p-3 rounded-full shadow-lg',
          'bg-brand text-background',
          'hover:opacity-90 active:opacity-80',
          'transition-opacity',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
        )}
        aria-label="Open session panel"
      >
        <span className="text-xl">📊</span>
      </button>
    </>
  );
}
