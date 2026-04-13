/**
 * BattlePanel — STO-35
 *
 * Shown only during an active battle. Displays:
 *   - Both active Pokémon with HP bars (green > 50%, yellow 25–50%, red < 25%)
 *   - Type badges, status condition icons
 *   - Move buttons (max 4) with PP tracking + type colour coding
 *   - Switch / Item / Flee buttons
 *   - Turn indicator: "Waiting for [Trainer]..." or "Your turn!"
 *
 * Props:
 *   battleState      — session.session.battle_state
 *   activeTrainerId  — multiplayer.active_trainer_id
 *   trainers         — session.characters array
 *   onMoveSelect(move)   — player chose a move
 *   onSwitch()           — player wants to switch
 *   onItem()             — player wants to use an item
 *   onFlee()             — player wants to flee (wild only)
 *   isHostView           — shows extra debug info
 */

import React from 'react';
import { cn } from '../lib/utils';

// ── Type colour map ────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  normal: 'bg-gray-400', fire: 'bg-orange-500', water: 'bg-blue-500',
  electric: 'bg-yellow-400', grass: 'bg-green-500', ice: 'bg-cyan-400',
  fighting: 'bg-red-700', poison: 'bg-purple-500', ground: 'bg-yellow-700',
  flying: 'bg-indigo-400', psychic: 'bg-pink-500', bug: 'bg-lime-500',
  rock: 'bg-yellow-600', ghost: 'bg-purple-800', dragon: 'bg-violet-600',
  dark: 'bg-gray-800', steel: 'bg-gray-500', fairy: 'bg-pink-300',
};

// ── Status icons ───────────────────────────────────────────────────────────────
const STATUS_ICONS = {
  burn: '🔥', freeze: '🧊', paralysis: '⚡', poison: '💜', badly_poisoned: '☠️',
  sleep: '💤', confusion: '😵',
};

export default function BattlePanel({
  battleState,
  activeTrainerId,
  trainers = [],
  onMoveSelect,
  onSwitch,
  onItem,
  onFlee,
  isHostView = false,
}) {
  if (!battleState?.active) return null;

  const { participants = [], type_data, turn } = battleState;
  const playerSide = participants.find((p) => p.side === 'player') ?? participants[0];
  const opponentSide = participants.find((p) => p.side === 'opponent') ?? participants[1];

  const isWild = type_data?.battle_type === 'wild';
  const isPlayerTurn = battleState.turn_order?.[0] === activeTrainerId;

  return (
    <div
      role="region"
      aria-label="Active battle"
      className={cn(
        'border border-border/60 rounded-xl',
        'bg-background/80 backdrop-blur',
        'p-4 space-y-4',
      )}
    >
      {/* Turn indicator */}
      <div className={cn(
        'text-center text-sm font-medium py-1.5 rounded-lg',
        isPlayerTurn
          ? 'bg-brand/15 text-brand border border-brand/30'
          : 'bg-muted/20 text-muted border border-border/40'
      )}>
        {isPlayerTurn ? '⚔️ Your turn!' : `⏳ Waiting for ${getActiveTrainerName(trainers, activeTrainerId)}...`}
        <span className="ml-2 text-xs opacity-60">Turn {turn ?? 1}</span>
      </div>

      {/* Pokémon matchup */}
      <div className="grid grid-cols-2 gap-3">
        <PokemonCard pokemon={playerSide?.active_pokemon} label="Your Pokémon" side="player" />
        <PokemonCard pokemon={opponentSide?.active_pokemon} label="Opponent" side="opponent" />
      </div>

      {/* Move buttons */}
      {isPlayerTurn && playerSide?.active_pokemon?.moves && (
        <div className="grid grid-cols-2 gap-2">
          {playerSide.active_pokemon.moves.slice(0, 4).map((move) => (
            <MoveButton
              key={move.move_id}
              move={move}
              disabled={!isPlayerTurn || (move.pp_current === 0)}
              onClick={() => onMoveSelect?.(move)}
            />
          ))}
        </div>
      )}

      {/* Action buttons row */}
      {isPlayerTurn && (
        <div className="flex gap-2">
          <ActionButton onClick={onSwitch} label="Switch" icon="🔄" />
          <ActionButton onClick={onItem} label="Item" icon="🎒" />
          {isWild && (
            <ActionButton onClick={onFlee} label="Flee" icon="🏃" variant="danger" />
          )}
        </div>
      )}

      {/* Host debug */}
      {isHostView && (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer hover:text-foreground">Battle state (host)</summary>
          <pre className="mt-1 overflow-auto max-h-32 bg-background/40 p-2 rounded">
            {JSON.stringify(type_data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PokemonCard({ pokemon, label, side }) {
  if (!pokemon) {
    return (
      <div className="border border-border/40 rounded-lg p-3 text-center text-muted text-sm">
        No active Pokémon
      </div>
    );
  }

  const hpPct = pokemon.max_hp > 0 ? (pokemon.current_hp / pokemon.max_hp) * 100 : 0;
  const hpColor = hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-yellow-400' : 'bg-red-500';
  const types = pokemon.types ?? [pokemon.species_ref?.type].filter(Boolean);

  return (
    <div className={cn(
      'border border-border/40 rounded-lg p-3 space-y-2',
      side === 'player' ? 'bg-blue-500/5' : 'bg-red-500/5'
    )}>
      {/* Name + status */}
      <div className="flex items-center justify-between gap-1">
        <span className="font-medium text-sm truncate">
          {pokemon.nickname ?? pokemon.species_ref?.name ?? pokemon.species_id}
          <span className="ml-1 text-xs text-muted">lv{pokemon.level}</span>
        </span>
        {pokemon.status_condition && (
          <span
            title={pokemon.status_condition}
            aria-label={`Status: ${pokemon.status_condition}`}
            className="text-base"
          >
            {STATUS_ICONS[pokemon.status_condition] ?? '❓'}
          </span>
        )}
      </div>

      {/* Type badges */}
      {types.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {types.map((t) => (
            <span
              key={t}
              className={cn(
                'px-1.5 py-0.5 rounded text-white text-xs font-medium',
                TYPE_COLORS[t?.toLowerCase()] ?? 'bg-gray-400'
              )}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* HP bar */}
      <div>
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>HP</span>
          <span>{pokemon.current_hp}/{pokemon.max_hp}</span>
        </div>
        <div className="h-2 bg-background/60 rounded-full border border-border/40 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', hpColor)}
            style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
            role="progressbar"
            aria-valuenow={pokemon.current_hp}
            aria-valuemin={0}
            aria-valuemax={pokemon.max_hp}
            aria-label={`${pokemon.species_ref?.name ?? 'Pokémon'} HP`}
          />
        </div>
      </div>
    </div>
  );
}

function MoveButton({ move, disabled, onClick }) {
  const typeKey = move.type?.toLowerCase();
  const colorClass = TYPE_COLORS[typeKey];
  const ppEmpty = move.pp_current === 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex flex-col items-start px-3 py-2 rounded-lg text-left',
        'border transition-colors text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        disabled
          ? 'opacity-40 cursor-not-allowed border-border/30 bg-background/40'
          : 'border-border/60 bg-background/60 hover:border-brand/50 hover:bg-brand/5 active:scale-[0.98]'
      )}
    >
      <span className="font-medium capitalize">{move.move_id?.replace(/-/g, ' ')}</span>
      <div className="flex items-center gap-1.5 mt-0.5">
        {typeKey && (
          <span className={cn('px-1 py-0 rounded text-white text-xs', colorClass ?? 'bg-gray-400')}>
            {typeKey}
          </span>
        )}
        <span className={cn('text-xs', ppEmpty ? 'text-red-400' : 'text-muted')}>
          {move.pp_current}/{move.pp_max} PP
        </span>
      </div>
    </button>
  );
}

function ActionButton({ onClick, label, icon, variant = 'default' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
        'border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variant === 'danger'
          ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
          : 'border-border/60 text-foreground hover:bg-muted/20'
      )}
    >
      {icon} {label}
    </button>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getActiveTrainerName(trainers, trainerId) {
  return trainers.find((t) => t.trainer_id === trainerId)?.trainer?.name ?? 'Trainer';
}
