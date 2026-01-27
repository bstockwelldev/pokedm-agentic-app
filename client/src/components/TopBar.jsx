import React from 'react';
import { cn } from '../lib/utils';

/**
 * TopBar - Header component with model picker, session controls, and branding
 */
export default function TopBar({
  model,
  onModelChange,
  availableModels = [],
  sessionId,
  onExportClick,
  onImportClick,
  className,
  ...props
}) {
  return (
    <header
      className={cn(
        'border-b border-border',
        'px-4 py-3',
        'flex items-center justify-between flex-wrap gap-4',
        'bg-background',
        className
      )}
      role="banner"
      {...props}
    >
      <h1 id="app-title" className="text-xl font-bold text-foreground">
        PokeDM - Pokémon TTRPG Adventure
      </h1>
      
      <div className="flex items-center gap-4 flex-wrap">
        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="model-select" className="text-sm text-muted">
            Model:
          </label>
                <select
                  id="model-select"
                  aria-label="Select AI model"
                  value={model}
                  onChange={(e) => onModelChange(e.target.value)}
                  className={cn(
                    'px-3 py-1.5',
                    'bg-input border border-border rounded-md',
                    'text-foreground text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                    'cursor-pointer'
                  )}
                >
                  {availableModels.length > 0 ? (
                    availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    </>
                  )}
                </select>
        </div>

        {/* Session ID Display */}
        {sessionId && (
          <div
            aria-label={`Session identifier: ${sessionId}`}
            className="text-sm text-muted"
          >
            Session: {sessionId.substring(0, 20)}...
          </div>
        )}

        {/* Export/Import Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onImportClick}
            aria-label="Import session"
            className={cn(
              'px-3 py-1.5 rounded-md text-sm',
              'bg-input border border-border',
              'text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              'hover:bg-muted/20 transition-colors'
            )}
            title="Import session from file"
          >
            Import
          </button>
          <button
            onClick={onExportClick}
            disabled={!sessionId}
            aria-label="Export session"
            className={cn(
              'px-3 py-1.5 rounded-md text-sm',
              'bg-brand text-background font-medium',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:opacity-90 active:opacity-80 transition-opacity'
            )}
            title="Export session to file"
          >
            Export
          </button>
        </div>
      </div>
    </header>
  );
}
