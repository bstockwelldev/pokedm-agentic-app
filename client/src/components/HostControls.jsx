/**
 * HostControls — STO-35
 *
 * Collapsible host-only panel. Provides:
 *   - Pass Turn dropdown (rotate activeTrainerId)
 *   - Trigger Encounter button (wild / trainer)
 *   - Override DM text input (host speaks as DM directly, bypasses AI)
 *
 * Props:
 *   session           — full session object
 *   onPassTurn(id)    — rotate active trainer
 *   onSendDmOverride(text) — host overrides DM narration with typed text
 *   onTriggerEncounter(type) — force encounter ('wild' | 'trainer')
 *   disabled          — disables all controls while AI is processing
 */

import React, { useState } from 'react';
import { cn } from '../lib/utils';

export default function HostControls({
  session,
  onPassTurn,
  onSendDmOverride,
  onTriggerEncounter,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [dmOverride, setDmOverride] = useState('');

  const characters = session?.characters ?? [];
  const multiplayer = session?.multiplayer ?? {};
  const activeTrainerId = multiplayer.active_trainer_id;
  const turnOrder = multiplayer.turn_order ?? characters.map((c) => c.trainer_id);

  const handleOverrideSubmit = (e) => {
    e.preventDefault();
    const text = dmOverride.trim();
    if (!text) return;
    onSendDmOverride?.(text);
    setDmOverride('');
  };

  return (
    <div className={cn('border border-border/50 rounded-xl overflow-hidden', !open && 'cursor-pointer')}>
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'bg-background/60 hover:bg-muted/10 transition-colors',
          'text-sm font-medium text-muted hover:text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset'
        )}
        aria-expanded={open}
        aria-label="Toggle host controls"
      >
        <span>🎮 Host Controls</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 py-3 space-y-4 border-t border-border/40 bg-background/40">

          {/* Pass turn */}
          {characters.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted font-medium">Pass Turn To</label>
              <div className="flex flex-wrap gap-2">
                {turnOrder.map((trainerId) => {
                  const character = characters.find((c) => c.trainer_id === trainerId);
                  if (!character) return null;
                  const isActive = trainerId === activeTrainerId;
                  return (
                    <button
                      key={trainerId}
                      type="button"
                      disabled={disabled || isActive}
                      onClick={() => onPassTurn?.(trainerId)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs transition-colors',
                        'border focus:outline-none focus:ring-2 focus:ring-ring',
                        isActive
                          ? 'border-brand/40 bg-brand/10 text-brand cursor-default'
                          : 'border-border/60 text-foreground hover:border-brand/40 hover:bg-brand/5',
                        disabled && !isActive && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      {isActive && '✓ '}{character.trainer.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trigger encounter */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted font-medium">Trigger Encounter</label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onTriggerEncounter?.('wild')}
                className={cn(
                  'flex-1 py-2 text-xs rounded-lg border transition-colors',
                  'border-border/60 hover:border-green-500/50 hover:text-green-400',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                🌿 Wild
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onTriggerEncounter?.('trainer')}
                className={cn(
                  'flex-1 py-2 text-xs rounded-lg border transition-colors',
                  'border-border/60 hover:border-red-500/50 hover:text-red-400',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                ⚔️ Trainer
              </button>
            </div>
          </div>

          {/* DM override */}
          <form onSubmit={handleOverrideSubmit} className="space-y-1.5">
            <label htmlFor="dm-override-input" className="text-xs text-muted font-medium">
              Override DM (host speaks directly)
            </label>
            <div className="flex gap-2">
              <input
                id="dm-override-input"
                type="text"
                value={dmOverride}
                onChange={(e) => setDmOverride(e.target.value)}
                disabled={disabled}
                placeholder="Type DM narration..."
                maxLength={500}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg text-sm',
                  'bg-background/60 border border-border/60',
                  'text-foreground placeholder:text-muted',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  disabled && 'opacity-40 cursor-not-allowed'
                )}
              />
              <button
                type="submit"
                disabled={disabled || !dmOverride.trim()}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-medium',
                  'bg-brand/90 text-background hover:opacity-90',
                  'transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
                  (disabled || !dmOverride.trim()) && 'opacity-40 cursor-not-allowed'
                )}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
