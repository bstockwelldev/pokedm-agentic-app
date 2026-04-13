/**
 * Affinity Engine — STO-25
 *
 * Pure JS engine for type affinity XP tracking, rank progression, and
 * milestone unlocks. No AI calls. Imported by the battle engine and the
 * session route to apply post-turn XP awards.
 *
 * Imports canonical thresholds and milestones from schemas/trainer.js so
 * there is a single source of truth.
 *
 * Z1: awardAffinityXp          — orchestrate XP award + rank-up check
 * Z2: applyXpToAffinity        — mutate xp + trigger rank checks
 *     checkRankUp              — determine if threshold crossed, unlock milestones
 *     getAffinityBonus         — derive battle damage multiplier from affinity rank
 * Z3: computeRankFromXp        — derive rank from cumulative XP
 *     buildMilestoneUnlocks    — collect newly unlocked milestones
 *     rankToAffinityMultiplier — translate rank to damage multiplier
 */

import {
  AFFINITY_XP_THRESHOLDS,
  AFFINITY_MILESTONES,
} from '../schemas/trainer.js';

// ── Constants ──────────────────────────────────────────────────────────────────

/**
 * XP awarded per battle action type.
 * Kept here rather than in trainer.js so the engine owns runtime behaviour.
 */
export const AFFINITY_XP_AWARDS = {
  move_used:        10,   // Used a move of this type
  super_effective:  20,   // Move was super-effective
  ko_with_type:     30,   // KO'd a Pokémon with this type's move
  caught_type:      25,   // Caught a Pokémon of this type
  resisted_type:    5,    // Took a hit of this type and survived
  type_sense_use:   15,   // Used Type Sense knowledge in action
};

// ── Z1: Orchestrator ───────────────────────────────────────────────────────────

/**
 * Award affinity XP to a trainer for a given type, handling rank-ups.
 *
 * @param {object} trainerProfile  Full PlayerProfile (from schemas/trainer.js)
 * @param {string} type            e.g. "fire", "ice"
 * @param {string} actionType      Key from AFFINITY_XP_AWARDS
 * @param {object} [opts]
 * @param {number} [opts.xpOverride]  Bypass AFFINITY_XP_AWARDS with an explicit amount
 * @returns {{ updatedProfile: object, rankUps: object[], newMilestones: object[] }}
 */
export function awardAffinityXp(trainerProfile, type, actionType, opts = {}) {
  const xpAmount = opts.xpOverride ?? (AFFINITY_XP_AWARDS[actionType] ?? 0);
  if (xpAmount === 0) return { updatedProfile: trainerProfile, rankUps: [], newMilestones: [] };

  const { updatedAffinities, rankUps, newMilestones } = applyXpToAffinities(
    trainerProfile.type_affinities,
    type,
    xpAmount
  );

  return {
    updatedProfile: { ...trainerProfile, type_affinities: updatedAffinities },
    rankUps,
    newMilestones,
  };
}

// ── Z2: Coordinators ───────────────────────────────────────────────────────────

/**
 * Apply XP to the matching type affinity in the affinities array.
 * If the type isn't tracked by this trainer, returns unchanged.
 *
 * @param {object[]} affinities  Array of TypeAffinity objects
 * @param {string}   type        Pokémon type name
 * @param {number}   xpAmount
 * @returns {{ updatedAffinities, rankUps, newMilestones }}
 */
function applyXpToAffinities(affinities, type, xpAmount) {
  const rankUps = [];
  const newMilestones = [];

  const updatedAffinities = affinities.map((affinity) => {
    if (affinity.type !== type.toLowerCase()) return affinity;

    const oldRank = affinity.rank;
    const updatedXp = affinity.xp + xpAmount;
    const { newRank, unlockedMilestones } = checkRankUp(affinity, updatedXp);

    if (newRank > oldRank) {
      rankUps.push({ type, oldRank, newRank, xpTotal: updatedXp });
      newMilestones.push(...unlockedMilestones);
    }

    return {
      ...affinity,
      xp: updatedXp,
      rank: newRank,
      unlocked_milestones: [
        ...new Set([...affinity.unlocked_milestones, ...unlockedMilestones.map((m) => m.id)]),
      ],
    };
  });

  return { updatedAffinities, rankUps, newMilestones };
}

/**
 * Determine the new rank from updated XP and collect any newly unlocked milestones.
 *
 * @param {object} affinity   Current TypeAffinity object (before XP applied)
 * @param {number} newXp      XP after award
 * @returns {{ newRank: number, unlockedMilestones: object[] }}
 */
export function checkRankUp(affinity, newXp) {
  const newRank = computeRankFromXp(newXp);
  const unlockedMilestones = buildMilestoneUnlocks(
    affinity.rank,
    newRank,
    affinity.unlocked_milestones
  );
  return { newRank, unlockedMilestones };
}

/**
 * Return the affinity damage multiplier for a trainer's affinity in the given type.
 * Used by battleEngine.computeDamage as `affinityMultiplier`.
 *
 * @param {object} trainerProfile
 * @param {string} moveType  The type of the move being used
 * @returns {number}  Multiplier (1.0 if no affinity, up to ~1.20 at rank 10)
 */
export function getAffinityBonus(trainerProfile, moveType) {
  if (!trainerProfile?.type_affinities) return 1.0;

  const affinity = trainerProfile.type_affinities.find(
    (a) => a.type === moveType?.toLowerCase()
  );
  if (!affinity) return 1.0;

  return rankToAffinityMultiplier(affinity.rank);
}

// ── Z3: Pure Functions ─────────────────────────────────────────────────────────

/**
 * Derive the rank (1–10) from cumulative XP.
 * Iterates thresholds descending to find the highest met threshold.
 *
 * @param {number} xp  Cumulative XP
 * @returns {number}   Rank 1–10
 */
export function computeRankFromXp(xp) {
  for (let rank = AFFINITY_XP_THRESHOLDS.length; rank >= 1; rank--) {
    if (xp >= AFFINITY_XP_THRESHOLDS[rank - 1]) return rank;
  }
  return 1;
}

/**
 * Build list of newly unlocked milestone objects for ranks between oldRank+1 and newRank.
 * Only returns milestones the trainer hasn't already unlocked.
 *
 * @param {number}   oldRank
 * @param {number}   newRank
 * @param {string[]} alreadyUnlocked  Milestone IDs already present
 * @returns {object[]}  Array of { id, label, rank }
 */
export function buildMilestoneUnlocks(oldRank, newRank, alreadyUnlocked = []) {
  const unlocked = [];
  for (let rank = oldRank + 1; rank <= newRank; rank++) {
    const milestone = AFFINITY_MILESTONES[rank];
    if (milestone && !alreadyUnlocked.includes(milestone.id)) {
      unlocked.push({ ...milestone, rank });
    }
  }
  return unlocked;
}

/**
 * Translate affinity rank to a battle damage multiplier.
 *
 * Scaling: rank 1 = 1.00× (no bonus), rank 10 = 1.20×
 * Linear interpolation: bonus = (rank - 1) × (0.20 / 9)
 *
 * @param {number} rank  1–10
 * @returns {number}     Multiplier
 */
export function rankToAffinityMultiplier(rank) {
  const clampedRank = Math.max(1, Math.min(10, rank));
  return 1 + ((clampedRank - 1) * (0.20 / 9));
}
