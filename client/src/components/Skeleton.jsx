import React from 'react';
import { cn } from '../lib/utils';

/**
 * Skeleton - Loading placeholder component
 * Phase 5: Polish & Delight
 */
export default function Skeleton({
  className,
  variant = 'default', // 'default', 'text', 'circular', 'rectangular'
  width,
  height,
  ...props
}) {
  const baseClasses = 'animate-pulse bg-muted rounded';
  
  const variantClasses = {
    default: 'rounded',
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      style={{
        width: width || undefined,
        height: height || undefined,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * MessageSkeleton - Skeleton loader for chat messages
 */
export function MessageSkeleton({ variant = 'assistant' }) {
  return (
    <div
      className={cn(
        'p-4 mb-4 rounded-lg border border-border',
        variant === 'user' ? 'bg-blue-900/10 ml-auto max-w-[80%]' : 'bg-background max-w-[90%]'
      )}
    >
      <div className="flex items-start gap-3">
        {variant === 'assistant' && (
          <Skeleton variant="circular" width={32} height={32} />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="40%" />
        </div>
        {variant === 'user' && (
          <Skeleton variant="circular" width={32} height={32} />
        )}
      </div>
    </div>
  );
}

/**
 * PanelSkeleton - Skeleton loader for panel content
 */
export function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton variant="text" width="70%" height={24} />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" />
      <div className="space-y-2 pt-4">
        <Skeleton variant="text" width="50%" height={20} />
        <Skeleton variant="rectangular" width="100%" height={60} />
      </div>
      <div className="space-y-2 pt-4">
        <Skeleton variant="text" width="50%" height={20} />
        <Skeleton variant="rectangular" width="100%" height={60} />
      </div>
    </div>
  );
}
