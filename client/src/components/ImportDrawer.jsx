import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import {
  parseImportFile,
  validateImportData,
  extractComponents,
  prepareSessionForImport,
  importSession,
  getAvailableImportComponents,
} from '../lib/importSession';
import MarkdownText from './MarkdownText';

/**
 * ImportDrawer Component
 * Modal drawer for importing session data
 */
export default function ImportDrawer({
  isOpen,
  onClose,
  onImportSuccess,
}) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const [importData, setImportData] = useState(null);
  const [selectedComponents, setSelectedComponents] = useState({});
  const [validation, setValidation] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Reset state when drawer opens/closes
  useEffect(() => {
    if (isOpen) {
      setImportData(null);
      setSelectedComponents({});
      setValidation(null);
      setImportError(null);
      
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

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

  const handleFileSelect = async (file) => {
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportError('Please select a JSON file');
      return;
    }

    try {
      const data = await parseImportFile(file);
      const validationResult = validateImportData(data);
      setValidation(validationResult);

      if (validationResult.valid) {
        setImportData(data);
        const available = getAvailableImportComponents(data);
        // Pre-select all available components
        setSelectedComponents(available);
        setImportError(null);
      } else {
        setImportError(`Validation failed: ${validationResult.errors.join(', ')}`);
        setImportData(null);
      }
    } catch (error) {
      setImportError(error.message || 'Failed to parse file');
      setImportData(null);
      setValidation(null);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleComponentToggle = (component) => {
    setSelectedComponents((prev) => ({
      ...prev,
      [component]: !prev[component],
    }));
  };

  const handleImport = async () => {
    if (!importData) {
      setImportError('No file selected');
      return;
    }

    const hasSelection = Object.values(selectedComponents).some((selected) => selected);
    if (!hasSelection) {
      setImportError('Please select at least one component to import');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const components = extractComponents(importData, selectedComponents);
      const importPayload = prepareSessionForImport(components);
      const result = await importSession(importPayload);

      // Call success callback with new session data
      if (onImportSuccess) {
        onImportSuccess(result);
      }

      // Close drawer after short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      setImportError(error.message || 'Failed to import session');
    } finally {
      setIsImporting(false);
    }
  };

  const availableComponents = importData ? getAvailableImportComponents(importData) : {};

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-drawer-title"
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
          <h2 id="import-drawer-title" className="text-xl font-semibold text-foreground">
            Import Session
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
            aria-label="Close import dialog"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* File Upload */}
          {!importData && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Select Export File
              </h3>
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center',
                  'transition-colors',
                  dragActive
                    ? 'border-brand bg-brand/10'
                    : 'border-border hover:border-brand/50'
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileInputChange}
                  className="hidden"
                  aria-label="Select JSON file to import"
                />
                <p className="text-foreground mb-2">
                  Drag and drop a JSON file here, or
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'px-4 py-2 rounded-md',
                    'bg-brand text-background font-medium',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                    'hover:opacity-90 active:opacity-80 transition-opacity'
                  )}
                >
                  Browse Files
                </button>
                <p className="text-xs text-muted mt-2">
                  Select a PokeDM export file (.json)
                </p>
              </div>
            </div>
          )}

          {/* Import Preview */}
          {importData && (
            <>
              {/* File Info */}
              <div className="p-3 rounded-md bg-muted/10 border border-border">
                <div className="text-sm text-foreground font-medium mb-1">
                  File Loaded Successfully
                </div>
                {importData.session_id && (
                  <div className="text-xs text-muted">
                    Original Session: {importData.session_id.substring(0, 20)}...
                  </div>
                )}
                {importData.exported_at && (
                  <div className="text-xs text-muted">
                    Exported: {new Date(importData.exported_at).toLocaleString()}
                  </div>
                )}
                {validation?.warnings && validation.warnings.length > 0 && (
                  <div className="mt-2 text-xs text-orange-300">
                    Warnings: {validation.warnings.join(', ')}
                  </div>
                )}
              </div>

              {/* Component Selection */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Select Components to Import
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
                        checked={selectedComponents[key] || false}
                        onChange={() => handleComponentToggle(key)}
                        disabled={!availableComponents[key]}
                        className="mt-1"
                        aria-label={`Import ${label}`}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{label}</div>
                        <div className="text-xs text-muted mt-0.5">{description}</div>
                        {!availableComponents[key] && (
                          <div className="text-xs text-muted mt-1 italic">Not available in file</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Change File Button */}
              <button
                onClick={() => {
                  setImportData(null);
                  setSelectedComponents({});
                  setValidation(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className={cn(
                  'w-full px-4 py-2 rounded-md',
                  'bg-input border border-border',
                  'text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                  'hover:bg-muted/20 transition-colors'
                )}
              >
                Select Different File
              </button>
            </>
          )}

          {/* Error Message */}
          {importError && (
            <div
              className="p-3 rounded-md bg-red-900/20 border border-red-800/30 text-sm"
              role="alert"
            >
              <MarkdownText variant="error">
                {importError}
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
            disabled={isImporting}
          >
            Cancel
          </button>
          {importData && (
            <button
              onClick={handleImport}
              disabled={isImporting || !Object.values(selectedComponents).some((s) => s)}
              className={cn(
                'px-4 py-2 rounded-md',
                'bg-brand text-background font-medium',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'hover:opacity-90 active:opacity-80 transition-opacity'
              )}
              aria-label="Import selected components"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
