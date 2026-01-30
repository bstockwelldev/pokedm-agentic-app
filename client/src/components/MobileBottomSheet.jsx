import React, { useEffect } from 'react';
import { cn } from '../lib/utils';

/**
 * MobileBottomSheet - Mobile-friendly bottom sheet panel
 * Phase 5: Mobile responsiveness improvements
 */
export default function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  ...props
}) {
  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'bg-background/90 border-t border-border/60',
          'rounded-t-xl shadow-xl backdrop-blur',
          'max-h-[80vh]',
          'lg:hidden',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        {...props}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-muted/60 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <h2 id="bottom-sheet-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-md',
                'text-muted hover:text-foreground hover:bg-muted/20',
                'transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4">
          {children}
        </div>
      </div>
    </>
  );
}
