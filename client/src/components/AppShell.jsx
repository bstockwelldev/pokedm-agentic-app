import React from 'react';
import { cn } from '../lib/utils';

/**
 * AppShell - Main layout wrapper for the application
 * Provides responsive grid layout: TopBar, ChatTimeline, Composer, RightPanel
 */
export default function AppShell({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'min-h-screen text-foreground',
        'flex flex-col',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
