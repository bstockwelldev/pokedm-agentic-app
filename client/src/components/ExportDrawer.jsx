import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { exportSessionData, getAvailableComponents } from '../lib/exportSession';

/**
 * ExportDrawer Component
 * Modal drawer for exporting session data
 */
export default function ExportDrawer({
  isOpen,
  onClose,
  session,
  messages,
}) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [selectedComponents, setSelectedComponents] = useState({
    session: true,
    messages: true,
    characters: true,
    campaign: true,
    customPokemon: true,
    continuity: true,
  });
  const [exportFormat, setExportFormat] = useState('single');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const availableComponents = getAvailableComponents(session, messages);

  // Reset state when drawer opens/closes
  useEffect(() => {
    if (isOpen) {
      // Initialize selections based on available data
      setSelectedComponents({
        session: availableComponents.session,
        messages: availableComponents.messages,
        characters: availableComponents.characters,
        campaign: availableComponents.campaign,
        customPokemon: availableComponents.customPokemon,
        continuity: availableComponents.continuity,
      });
      setExportError(null);
      setExportSuccess(false);
      
      // Focus close button when drawer opens
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, availableComponents]);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Trap focus within drawer
      if (e.key === 'Tab') {
        const focusableElements = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleComponentToggle = (component) => {
    setSelectedComponents((prev) => ({
      ...prev,
      [component]: !prev[component],
    }));
  };

  const handleExport = () => {
    const hasSelection = Object.values(selectedComponents).some((selected) => selected);
    if (!hasSelection) {
      setExportError('Please select at least one component to export');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const result = exportSessionData(session, messages, {
        includeSession: selectedComponents.session,
        includeMessages: selectedComponents.messages,
        includeCharacters: selectedComponents.characters,
        includeCampaign: selectedComponents.campaign,
        includeCustomPokemon: selectedComponents.customPokemon,
        includeContinuity: selectedComponents.continuity,
        format: exportFormat,
      });

      setExportSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setExportError(error.message || 'Failed to export session');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={drawerRef}
        className={cn(
          'bg-background border border-border rounded-lg shadow-lg',
          'w-full max-w-2xl max-h-[90vh] overflow-hidden',
          'flex flex-col',
          'm-4'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="export-drawer-title" className="text-xl font-semibold text-foreground">
            Export Session
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className={cn(
              'px-3 py-1.5 rounded-md',
              'text-muted hover:text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              'transition-colors'
            )}
            aria-label="Close export dialog"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Component Selection */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Select Components to Export
            </h3>
            <div className="space-y-2">
              {[
                { key: 'session', label: 'Session State', description: 'Current scene, objectives, battle state' },
                { key: 'messages', label: 'Chat Messages', description: 'All conversation history' },
                { key: 'characters', label: 'Characters', description: 'Trainers, inventory, Pokémon party' },
                { key: 'campaign', label: 'Campaign/Lore', description: 'Region, locations, NPCs, world facts' },
                { key: 'customPokemon', label: 'Custom Pokémon', description: 'All custom Pokémon created' },
                { key: 'continuity', label: 'Continuity', description: 'Timeline, discovered Pokémon, hooks' },
              ].map(({ key, label, description }) => (
                <label
                  key={key}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-md border cursor-pointer',
                    'transition-colors',
                    availableComponents[key]
                      ? selectedComponents[key]
                        ? 'border-brand bg-brand/10'
                        : 'border-border hover:border-brand/50'
                      : 'border-border/50 bg-muted/10 opacity-50 cursor-not-allowed'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedComponents[key]}
                    onChange={() => handleComponentToggle(key)}
                    disabled={!availableComponents[key]}
                    className="mt-1"
                    aria-label={`Export ${label}`}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{label}</div>
                    <div className="text-xs text-muted mt-0.5">{description}</div>
                    {!availableComponents[key] && (
                      <div className="text-xs text-muted mt-1 italic">Not available</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Export Format
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-md border border-border cursor-pointer hover:border-brand/50 transition-colors">
                <input
                  type="radio"
                  name="exportFormat"
                  value="single"
                  checked={exportFormat === 'single'}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className=""
                />
                <div>
                  <div className="font-medium text-foreground">Single JSON File</div>
                  <div className="text-xs text-muted mt-0.5">All components in one file</div>
                </div>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {exportError && (
            <div
              className="p-3 rounded-md bg-red-900/20 border border-red-800/30 text-sm"
              role="alert"
            >
              <MarkdownText variant="error">
                {exportError}
              </MarkdownText>
            </div>
          )}

          {/* Success Message */}
          {exportSuccess && (
            <div
              className="p-3 rounded-md bg-green-900/20 border border-green-800/30 text-sm"
              role="status"
              aria-live="polite"
            >
              <MarkdownText variant="success">
                Export successful! File downloaded.
              </MarkdownText>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 rounded-md',
              'bg-input border border-border',
              'text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              'hover:bg-muted/20 transition-colors'
            )}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !Object.values(selectedComponents).some((s) => s)}
            className={cn(
              'px-4 py-2 rounded-md',
              'bg-brand text-background font-medium',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:opacity-90 active:opacity-80 transition-opacity'
            )}
            aria-label="Export selected components"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
