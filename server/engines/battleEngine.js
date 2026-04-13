/**
 * Battle Engine — STO-23 + STO-24
 *
 * Pure JS game math. Zero AI involvement. Fully unit-testable without API calls.
 *
 * Implements:
 *   - Pokémon damage formula (Gen V+ with D&D hit check overlay)
 *   - d20 hit check: natural 20 = always hits + crit, natural 1 = always misses
 *   - Catch resolution (modified Gen I formula)
 *   - Flee resolution
 *   - All 5 battle types: wild | trainer | grunt | gym | pvp
 *   - Stat stage modifier application
 *   - Type affinity damage multiplier hook (populated by affinityEngine)
 *
 * Exports consumed by:
 *   - POST /api/battle (server.js) — run a full turn
 *   - agents/dm.js — receives BattleResult for narration context
 *   - engines/affinityEngine.js — reads turn result for XP events
 */

import { getTypeEffectiveness } from '../tools/typeChart.js';

// ── Nature modifiers ─────────────────────────────────────────────────────────

const NATURE_MODIFIERS = {
  hardy:   { atk: 1,    def: 1,    spa: 1,    spd: 1,    spe: 1    },
  lonely:  { atk: 1.1,  def: 0.9,  spa: 1,    spd: 1,    spe: 1    },
  brave:   { atk: 1.1,  def: 1,    spa: 1,    spd: 1,    spe: 0.9  },
  adamant: { atk: 1.1,  def: 1,    spa: 0.9,  spd: 1,    spe: 1    },
  naughty: { atk: 1.1,  def: 1,    spa: 1,    spd: 0.9,  spe: 1    },
  bold:    { atk: 0.9,  def: 1.1,  spa: 1,    spd: 1,    spe: 1    },
  docile:  { atk: 1,    def: 1,    spa: 1,    spd: 1,    spe: 1    },
  relaxed: { atk: 1,    def: 1.1,  spa: 1,    spd: 1,    spe: 0.9  },
  impish:  { atk: 1,    def: 1.1,  spa: 0.9,  spd: 1,    spe: 1    },
  lax:     { atk: 1,    def: 1.1,  spa: 1,    spd: 0.9,  spe: 1    },
  timid:   { atk: 0.9,  def: 1,    spa: 1,    spd: 1,    spe: 1.1  },
  hasty:   { atk: 1,    def: 0.9,  spa: 1,    spd: 1,    spe: 1.1  },
  serious: { atk: 1,    def: 1,    spa: 1,    spd: 1,    spe: 1    },
  jolly:   { atk: 1,    def: 1,    spa: 0.9,  spd: 1,    spe: 1.1  },
  naive:   { atk: 1,    def: 1,    spa: 1,    spd: 0.9,  spe: 1.1  },
  modest:  { atk: 0.9,  def: 1,    spa: 1.1,  spd: 1,    spe: 1    },
  mild:    { atk: 1,    def: 0.9,  spa: 1.1,  spd: 1,    spe: 1    },
  quiet:   { atk: 1,    def: 1,    spa: 1.1,  spd: 1,    spe: 0.9  },
  bashful: { atk: 1,    def: 1,    spa: 1,    spd: 1,    spe: 1    },
  rash:    { atk: 1,    def: 1,    spa: 1.1,  spd: 0.9,  spe: 1    },
  calm:    { atk: 0.9,  def: 1,    spa: 1,    spd: 1.1,  spe: 1    },
  gentle:  { atk: 1,    def: 0.9,  spa: 1,    spd: 1.1,  spe: 1    },
  sassy:   { atk: 1,    def: 1,    spa: 1,    spd: 1.1,  spe: 0.9  },
  careful: { atk: 1,    def: 1,    spa: 0.9,  spd: 1.1,  spe: 1    },
  quirky:  { atk: 1,    def: 1,    spa: 1,    spd: 1,    spe: 1    },
};

// Stat stage multipliers (−6 to +6)
const STAGE_MULTIPLIERS = [
  2/8, 2/7, 2/6, 2/5, 2/4, 2/3, // -6 to -1
  1,                               // 0
  3/2, 4/2, 5/2, 6/2, 7/2, 8/2,  // +1 to +6
];

// ── Z1: Top-level turn resolver ───────────────────────────────────────────────

/**
 * Resolve a complete battle turn.
 * Returns { log entry, updated participants, outcome }.
 * This is the only function external callers need for a standard turn.
 *
 * @param {object} params
 * @param {object} params.attacker  BattleParticipant + resolved species data
 * @param {object} params.defender  BattleParticipant + resolved species data
 * @param {object} params.move      MoveSchema object
 * @param {number} params.round
 * @param {number} params.turn
 * @param {object} params.battleState  Current BattleStateSchema object
 * @param {string} params.sessionId    For PokeAPI cache
 * @returns {Promise<TurnResult>}
 */
export async function resolveTurn({ attacker, defender, move, round, turn, battleState, sessionId }) {
  const d20 = rollD20();
  const hitResult = resolveHitCheck(move, attacker, defender, d20);

  if (!hitResult.hit) {
    return buildMissResult({ attacker, defender, move, round, turn, d20 });
  }

  const typeEff = await getTypeEffectiveness(defender.typing, sessionId);
  const typeMultiplier = typeEff[move.type.toLowerCase()] ?? 1;

  const damage = computeDamage({
    attacker,
    defender,
    move,
    typeMultiplier,
    isCritical: hitResult.critical,
    affinityMultiplier: attacker.affinityMultiplier ?? 1,
  });

  return buildHitResult({
    attacker, defender, move, round, turn,
    d20, damage, typeMultiplier,
    isCritical: hitResult.critical,
  });
}

// ── Z2: Hit resolution ────────────────────────────────────────────────────────

/**
 * Determine whether a move hits and whether it crits.
 * D&D overlay: natural 20 = always hit + crit, natural 1 = always miss.
 *
 * @param {object} move        MoveSchema
 * @param {object} attacker    Has stage_modifiers.accuracy
 * @param {object} defender    Has stage_modifiers.evasion
 * @param {number} d20         1–20
 * @returns {{ hit: boolean, critical: boolean }}
 */
export function resolveHitCheck(move, attacker, defender, d20) {
  if (d20 === 20) return { hit: true, critical: true };
  if (d20 === 1)  return { hit: false, critical: false };

  // Status moves with null accuracy always hit (unless blocked by evasion extremes)
  if (move.accuracy === null) return { hit: true, critical: false };

  const accStage = (attacker.stage_modifiers?.accuracy ?? 0);
  const evaStage = (defender.stage_modifiers?.evasion ?? 0);
  const netStage = Math.max(-6, Math.min(6, accStage - evaStage));
  const stageIdx = netStage + 6; // offset to 0-based index

  const effectiveAccuracy = move.accuracy * STAGE_MULTIPLIERS[stageIdx];
  // Hit threshold: scale d20 against accuracy (0–100 → 1–20 range)
  const hitThreshold = Math.ceil((1 - effectiveAccuracy / 100) * 20);
  const hit = d20 > hitThreshold;
  return { hit, critical: false };
}

// ── Z2: Damage computation ────────────────────────────────────────────────────

/**
 * Pokémon damage formula (Gen V+) with D&D modifiers.
 *
 * damage = floor(
 *   ((2×level/5 + 2) × power × (atkStat / defStat)) / 50 + 2
 * ) × typeEff × STAB × nature × affinity × crit × random(85–100/100)
 *
 * @returns {number} Final damage (always ≥ 1)
 */
export function computeDamage({ attacker, defender, move, typeMultiplier, isCritical, affinityMultiplier = 1 }) {
  if (!move.power || move.power === 0) return 0; // status move

  const level = attacker.level ?? 5;

  // Choose atk/def stat based on move category
  const isSpecial = move.category === 'special';
  const rawAtk = isSpecial ? attacker.stats.special_attack : attacker.stats.attack;
  const rawDef = isSpecial ? defender.stats.special_defense : defender.stats.defense;

  // Apply stat stage modifiers
  const atkStage = isSpecial
    ? (attacker.stage_modifiers?.special_attack ?? 0)
    : (attacker.stage_modifiers?.attack ?? 0);
  const defStage = isSpecial
    ? (defender.stage_modifiers?.special_defense ?? 0)
    : (defender.stage_modifiers?.defense ?? 0);

  const atk = Math.floor(rawAtk * STAGE_MULTIPLIERS[atkStage + 6]);
  const def = Math.max(1, Math.floor(rawDef * STAGE_MULTIPLIERS[defStage + 6]));

  // Nature modifier
  const natureMod = isSpecial
    ? (NATURE_MODIFIERS[attacker.nature]?.spa ?? 1)
    : (NATURE_MODIFIERS[attacker.nature]?.atk ?? 1);

  // STAB (Same-Type Attack Bonus)
  const attackerTyping = attacker.typing ?? [];
  const stab = attackerTyping.includes(move.type.toLowerCase()) ? 1.5 : 1;

  // Core formula
  let damage = Math.floor(
    ((2 * level / 5 + 2) * move.power * (atk / def)) / 50
  ) + 2;

  // Modifiers (applied in sequence per gen mechanics)
  damage = Math.floor(damage * typeMultiplier);
  damage = Math.floor(damage * stab);
  damage = Math.floor(damage * natureMod);
  damage = Math.floor(damage * affinityMultiplier);
  damage = Math.floor(damage * (isCritical ? 1.5 : 1));
  // Random variance last: 85–100%
  damage = Math.floor(damage * (85 + Math.random() * 15) / 100);

  return Math.max(1, damage);
}

// ── Z2: Catch resolution ──────────────────────────────────────────────────────

/**
 * Resolve a catch attempt using a modified Gen I catch formula.
 *
 * catchRate = ((3 × hpMax - 2 × hpCurrent) × catchRateBase × ballModifier) / (3 × hpMax)
 * Catch succeeds if random(0, 255) < catchRate.
 * Guaranteed catch if catchRate ≥ 255.
 *
 * @param {object} params
 * @param {number} params.hpMax         Wild Pokémon max HP
 * @param {number} params.hpCurrent     Wild Pokémon current HP
 * @param {number} [params.catchRateBase=45]  Species base catch rate (PokeAPI: capture_rate)
 * @param {number} [params.ballModifier=1]    Ball multiplier (Poké Ball=1, Great=1.5, Ultra=2)
 * @param {boolean} [params.statusBonus=false]  Sleep/freeze: 2× bonus
 * @returns {{ caught: boolean, shakeCount: number }}
 */
export function resolveCatch({ hpMax, hpCurrent, catchRateBase = 45, ballModifier = 1, statusBonus = false }) {
  const a = Math.floor(
    ((3 * hpMax - 2 * hpCurrent) * catchRateBase * ballModifier * (statusBonus ? 2 : 1))
    / (3 * hpMax)
  );

  if (a >= 255) return { caught: true, shakeCount: 3 };

  // Each shake check: succeed if random(0, 65535) < floor(65536 / (255/a)^0.1875)
  const b = Math.floor(65536 / Math.pow(255 / a, 0.1875));
  let shakeCount = 0;
  for (let i = 0; i < 3; i++) {
    if (Math.floor(Math.random() * 65536) < b) {
      shakeCount++;
    } else {
      return { caught: false, shakeCount };
    }
  }
  return { caught: true, shakeCount: 3 };
}

// ── Z2: Flee resolution ───────────────────────────────────────────────────────

/**
 * Resolve a flee attempt.
 * fleeChance = floor((escaperSpeed × 128 / pursuerSpeed) + 30 × fleeAttempts) mod 256
 * Flee succeeds if random(0, 255) < fleeChance, or always if escaperSpeed > pursuerSpeed × 2.
 *
 * @param {number} escaperSpeed   Fleeing Pokémon speed stat
 * @param {number} pursuerSpeed   Opposing Pokémon speed stat
 * @param {number} fleeAttempts   Number of previous flee attempts this battle
 * @returns {{ fled: boolean }}
 */
export function resolveFlee(escaperSpeed, pursuerSpeed, fleeAttempts) {
  if (escaperSpeed > pursuerSpeed * 2) return { fled: true };
  if (pursuerSpeed === 0) return { fled: true };

  const fleeChance = (Math.floor(escaperSpeed * 128 / pursuerSpeed) + 30 * fleeAttempts) % 256;
  return { fled: Math.floor(Math.random() * 256) < fleeChance };
}

// ── Z2: Battle initializer ────────────────────────────────────────────────────

/**
 * Initialize a new battle state from a BattleTypeDataSchema object + participants.
 * Sets turn order by effective speed.
 *
 * @param {object} typeData   Discriminated union (wild/trainer/grunt/gym/pvp)
 * @param {Array}  participants  Array of resolved Pokémon entities with owner_id
 * @param {string} battleId   UUID
 * @returns {object} Initial BattleStateSchema-compatible object
 */
export function initBattle(typeData, participants, battleId) {
  const turnOrder = [...participants]
    .map((p, slot) => ({
      slot,
      effective_speed: computeEffectiveSpeed(p),
    }))
    .sort((a, b) => b.effective_speed - a.effective_speed);

  return {
    active: true,
    battle_id: battleId,
    round: 1,
    turn: 0,
    turn_order: turnOrder,
    participants: participants.map((p, slot) => ({
      slot,
      kind: p.kind ?? 'party_pokemon',
      ref: p.instance_id ?? p.encounter_slot_id,
      owner_id: p.owner_id,
      fainted: false,
      stage_modifiers: emptyStageModifiers(),
    })),
    field_effects: [],
    log: [],
    type_data: typeData,
    last_action_summary: null,
  };
}

// ── Z2: Gym/grunt level scaling ───────────────────────────────────────────────

/**
 * Scale an NPC Pokémon's level to the party average.
 * Used for gym, boss, and grunt battles.
 *
 * @param {number[]} partyLevels   Player party levels
 * @param {number}   baseLeval     NPC's defined level in challenges.json
 * @param {number}   scaleFactor   level_scale_factor from ChallengeSchema (0.8–1.5)
 * @returns {number} Scaled level (1–100)
 */
export function scaleNpcLevel(partyLevels, baseLevel, scaleFactor = 1.0) {
  if (!partyLevels.length) return baseLevel;
  const partyAvg = partyLevels.reduce((s, l) => s + l, 0) / partyLevels.length;
  const scaled = Math.round(partyAvg * scaleFactor);
  return Math.max(1, Math.min(100, scaled));
}

// ── Z3: Pure helpers ──────────────────────────────────────────────────────────

/** Roll a d20 (1–20). */
export function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function computeEffectiveSpeed(pokemon) {
  const baseSpeed = pokemon.stats?.speed ?? 50;
  const stage = pokemon.stage_modifiers?.speed ?? 0;
  const paralyzed = (pokemon.status_conditions ?? []).includes('paralysis');
  return Math.floor(baseSpeed * STAGE_MULTIPLIERS[stage + 6] * (paralyzed ? 0.5 : 1));
}

function emptyStageModifiers() {
  return { attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0, accuracy: 0, evasion: 0 };
}

function buildHitResult({ attacker, defender, move, round, turn, d20, damage, typeMultiplier, isCritical }) {
  const effectiveness = typeMultiplier === 0 ? 'immune'
    : typeMultiplier >= 4 ? 'super effective ×4'
    : typeMultiplier >= 2 ? 'super effective'
    : typeMultiplier <= 0.25 ? 'not very effective ×¼'
    : typeMultiplier < 1 ? 'not very effective'
    : 'normal';

  const summary = [
    `${attacker.name} used ${move.name}.`,
    isCritical ? 'Critical hit!' : null,
    typeMultiplier !== 1 ? `It's ${effectiveness}!` : null,
    typeMultiplier === 0 ? "It doesn't affect the target." : `Dealt ${damage} damage.`,
  ].filter(Boolean).join(' ');

  return {
    hit: true,
    critical: isCritical,
    damage,
    type_effectiveness: typeMultiplier,
    d20_roll: d20,
    move_name: move.name,
    summary,
    log_entry: {
      round, turn,
      actor_slot: attacker.slot ?? 0,
      action: 'move',
      move_name: move.name,
      d20_roll: d20,
      hit: true,
      critical: isCritical,
      damage_dealt: damage,
      type_effectiveness: typeMultiplier,
      summary,
    },
  };
}

function buildMissResult({ attacker, move, round, turn, d20 }) {
  const summary = d20 === 1
    ? `${attacker.name} used ${move.name}, but it failed! (Natural 1)`
    : `${attacker.name} used ${move.name}, but it missed!`;

  return {
    hit: false,
    critical: false,
    damage: 0,
    type_effectiveness: 1,
    d20_roll: d20,
    move_name: move.name,
    summary,
    log_entry: {
      round, turn,
      actor_slot: attacker.slot ?? 0,
      action: 'move',
      move_name: move.name,
      d20_roll: d20,
      hit: false,
      critical: false,
      damage_dealt: 0,
      summary,
    },
  };
}
