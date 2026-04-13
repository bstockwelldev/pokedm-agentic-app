/**
 * PartySidebar — STO-35
 *
 * Right-panel section showing all trainers + their active Pokémon HP.
 * Highlights the currently active trainer in a multiplayer session.
 *
 * Props:
 *   session          — full session object (has .characters, .multiplayer)
 *   onPassTurn(id)   — host calls this to rotate active trainer
 *   isHostView       — shows Pass Turn button + encounter trigger
 *   onTriggerEncounter() — host-only: force a wild encounter
 */

import React, { useState } from 'react';
import { cn } from '../lib/utils';

export default function PartySidebar({
  session,
  onPassTurn,
  isHostView = false,
  onTriggerEncounter,
}) {
  const characters = session?.characters ?? [];
  const multiplayer = session?.multiplayer ?? {};
  const activeTrainerId = multiplayer.active_trainer_id;

  if (characters.length === 0) {
    return (
      <div className="p-4 text-sm text-muted text-center">
        No trainers in session yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {/* Active trainer badge */}
      {activeTrainerId && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-brand/10 border border-brand/25">
          <span className="text-xs text-brand font-medium">Active:</span>
          <span className="text-xs text-foreground font-semibold">
            {getTrainerName(characters, activeTrainerId)}
          </span>
        </div>
      )}

      {/* Trainer cards */}
      {characters.map((character) => (
        <TrainerCard
          key={character.trainer_id}
          character={character}
          isActive={character.trainer_id === activeTrainerId}
          isHostView={isHostView}
          onPassTurn={onPassTurn}
        />
      ))}

      {/* Host-only controls */}
      {isHostView && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <p className="text-xs text-muted font-medium uppercase tracking-wide">Host Controls</p>
          {onTriggerEncounter && (
            <button
              type="button"
              onClick={onTriggerEncounter}
              className={cn(
                'w-full py-2 text-xs rounded-lg',
                'border border-border/60 text-muted hover:text-foreground hover:bg-muted/20',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            >
              ⚔️ Trigger Encounter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── TrainerCard ────────────────────────────────────────────────────────────────

function TrainerCard({ character, isActive, isHostView, onPassTurn }) {
  const [expanded, setExpanded] = useState(isActive);
  const { trainer, pokemon_party = [], trainer_id, type_affinities = [] } = character;

  const totalPokemon = pokemon_party.length;
  const faintedCount = pokemon_party.filter((p) => p.current_hp === 0).length;
  const topAffinities = type_affinities.slice(0, 2);

  return (
    <div className={cn(
      'border rounded-xl overflow-hidden transition-all',
      isActive
        ? 'border-brand/40 bg-brand/5'
        : 'border-border/40 bg-background/50'
    )}>
      {/* Card header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse flex-shrink-0" aria-hidden="true" />
          )}
          <span className={cn('text-sm font-semibold', isActive ? 'text-brand' : 'text-foreground')}>
            {trainer?.name ?? 'Trainer'}
          </span>
          <span className="text-xs text-muted">
            {totalPokemon - faintedCount}/{totalPokemon} active
          </span>
        </div>
        <span className="text-xs text-muted">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Affinity badges */}
      {topAffinities.length > 0 && (
        <div className="flex gap-1 px-3 pb-1">
          {topAffinities.map((a) => (
            <span
              key={a.type}
              className="text-xs px-1.5 py-0.5 rounded bg-background/60 border border-border/40 text-muted"
            >
              {a.type} R{a.rank}
            </span>
          ))}
        </div>
      )}

      {/* Expanded party */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
          {pokemon_party.map((pokemon) => (
            <PartySlot key={pokemon.entity_id} pokemon={pokemon} />
          ))}
          {pokemon_party.length === 0 && (
            <p className="text-xs text-muted">No Pokémon in party.</p>
          )}

          {/* Pass turn (host-only, non-active trainers) */}
          {isHostView && !isActive && onPassTurn && (
            <button
              type="button"
              onClick={() => onPassTurn(trainer_id)}
              className={cn(
                'w-full mt-1 py-1.5 text-xs rounded-lg',
                'border border-brand/30 text-brand hover:bg-brand/10',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            >
              Pass turn to {trainer?.name}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── PartySlot ──────────────────────────────────────────────────────────────────

function PartySlot({ pokemon }) {
  const hpPct = pokemon.max_hp > 0 ? (pokemon.current_hp / pokemon.max_hp) * 100 : 0;
  const isFainted = pokemon.current_hp === 0;
  const hpColor = isFainted ? 'bg-gray-500'
    : hpPct > 50 ? 'bg-green-500'
    : hpPct > 25 ? 'bg-yellow-400'
    : 'bg-red-500';

  return (
    <div className={cn('flex items-center gap-2', isFainted && 'opacity-50')}>
      <span className="text-xs text-muted w-24 truncate capitalize">
        {pokemon.nickname ?? pokemon.species_ref?.name ?? pokemon.species_id}
      </span>
      <div className="flex-1 h-1.5 bg-background/60 rounded-full border border-border/30 overflow-hidden">
        <div
          className={cn('h-full rounded-full', hpColor)}
          style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
        />
      </div>
      <span className="text-xs text-muted w-14 text-right tabular-nums">
        {pokemon.current_hp}/{pokemon.max_hp}
      </span>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getTrainerName(characters, trainerId) {
  return characters.find((c) => c.trainer_id === trainerId)?.trainer?.name ?? 'Unknown';
}
