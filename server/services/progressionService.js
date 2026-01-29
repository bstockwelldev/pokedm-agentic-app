/**
 * Character Progression Service
 * Handles XP calculation, level-ups, badges, and milestones
 */

import { PokemonSessionSchema } from '../schemas/session.js';

/**
 * XP calculation constants
 */
const XP_CONSTANTS = {
  BASE_XP_PER_BATTLE: 100,
  XP_PER_LEVEL: 1000,
  XP_MULTIPLIER_WIN: 1.5,
  XP_MULTIPLIER_LOSS: 0.5,
  XP_BONUS_FIRST_TIME: 200,
  XP_BONUS_TYPE_ADVANTAGE: 50,
};

/**
 * Badge completion criteria
 */
const BADGE_CRITERIA = {
  FIRST_BATTLE: 'first_battle',
  FIRST_CAPTURE: 'first_capture',
  TYPE_MASTER: 'type_master', // Used all 18 types
  EXPLORER: 'explorer', // Visited 10 locations
  COLLECTOR: 'collector', // Caught 10 different Pokemon
  CHAMPION: 'champion', // Won 10 battles
};

/**
 * Milestone definitions
 */
const MILESTONE_DEFINITIONS = [
  {
    milestone_id: 'first_pokemon',
    title: 'First Pokémon',
    description: 'Caught your first Pokémon',
    check: (session) => {
      const totalPokemon = session.characters?.reduce(
        (sum, char) => sum + (char.pokemon_party?.length || 0),
        0
      ) || 0;
      return totalPokemon >= 1;
    },
  },
  {
    milestone_id: 'first_badge',
    title: 'First Badge',
    description: 'Earned your first badge',
    check: (session) => {
      const totalBadges = session.characters?.reduce(
        (sum, char) => sum + (char.progression?.badges || 0),
        0
      ) || 0;
      return totalBadges >= 1;
    },
  },
  {
    milestone_id: 'party_of_six',
    title: 'Full Party',
    description: 'Have a full party of 6 Pokémon',
    check: (session) => {
      const maxPartySize = Math.max(
        ...(session.characters?.map((char) => char.pokemon_party?.length || 0) || [0])
      );
      return maxPartySize >= 6;
    },
  },
];

/**
 * Calculate XP gained from a battle
 * @param {object} battleResult - Battle result with outcome, participants, etc.
 * @param {object} session - Current session
 * @returns {number} XP gained
 */
export function calculateXP(battleResult, session) {
  const {
    outcome = 'unknown',
    participants = [],
    firstTime = false,
    typeAdvantageUsed = false,
  } = battleResult;

  let baseXP = XP_CONSTANTS.BASE_XP_PER_BATTLE;

  // Apply multipliers
  if (outcome === 'win' || outcome === 'victory') {
    baseXP *= XP_CONSTANTS.XP_MULTIPLIER_WIN;
  } else if (outcome === 'loss' || outcome === 'defeat') {
    baseXP *= XP_CONSTANTS.XP_MULTIPLIER_LOSS;
  }

  // Add bonuses
  if (firstTime) {
    baseXP += XP_CONSTANTS.XP_BONUS_FIRST_TIME;
  }
  if (typeAdvantageUsed) {
    baseXP += XP_CONSTANTS.XP_BONUS_TYPE_ADVANTAGE;
  }

  // Scale by number of participants (more participants = more XP)
  const participantCount = participants.length || 1;
  baseXP = Math.floor(baseXP * (1 + participantCount * 0.1));

  return Math.max(0, Math.floor(baseXP));
}

/**
 * Check if a Pokémon should level up
 * @param {object} pokemon - Pokémon instance
 * @param {number} xpGained - XP gained from battle/event
 * @returns {boolean} True if should level up
 */
export function checkLevelUp(pokemon, xpGained) {
  // Simple level-up check: level up every 1000 XP
  // In a full implementation, this would track cumulative XP
  const currentLevel = pokemon.level || 1;
  const xpPerLevel = XP_CONSTANTS.XP_PER_LEVEL;
  
  // For now, level up if XP gained is >= one level's worth
  // In production, track cumulative XP per Pokémon
  return xpGained >= xpPerLevel && currentLevel < 100;
}

/**
 * Apply level-up to a Pokémon
 * @param {object} pokemon - Pokémon instance
 * @param {number} levelsGained - Number of levels to gain (default: 1)
 * @returns {object} Updated Pokémon instance
 */
export function applyLevelUp(pokemon, levelsGained = 1) {
  const updated = { ...pokemon };
  const currentLevel = updated.level || 1;
  const newLevel = Math.min(100, currentLevel + levelsGained);

  // Increase stats by 10% per level (simplified)
  const statMultiplier = 1 + (newLevel - currentLevel) * 0.1;
  updated.level = newLevel;

  if (updated.stats) {
        updated.stats = {
          ...updated.stats,
          hp: {
            ...updated.stats.hp,
            max: Math.floor(updated.stats.hp.max * statMultiplier),
            current: Math.floor(updated.stats.hp.current * statMultiplier),
          },
          attack: Math.floor(updated.stats.attack * statMultiplier),
          defense: Math.floor(updated.stats.defense * statMultiplier),
          special_attack: Math.floor(updated.stats.special_attack * statMultiplier),
          special_defense: Math.floor(updated.stats.special_defense * statMultiplier),
          speed: Math.floor(updated.stats.speed * statMultiplier),
        };
  }

  return updated;
}

/**
 * Check badge completion based on session events
 * @param {object} session - Current session
 * @param {object} event - Event that might trigger badge completion
 * @returns {string[]} Array of badge IDs that should be awarded
 */
export function checkBadgeCompletion(session, event) {
  const badgesToAward = [];
  const characters = session.characters || [];

  for (const character of characters) {
    const currentBadges = character.progression?.badges || 0;
    const achievements = character.achievements || [];

    // Check if already has 8 badges (max)
    if (currentBadges >= 8) {
      continue;
    }

    // Check event-based badges
    if (event.type === 'battle' && event.outcome === 'win') {
      const battleCount = achievements.filter((a) =>
        a.title.toLowerCase().includes('battle')
      ).length;
      if (battleCount === 0 && !achievements.some((a) => a.achievement_id === BADGE_CRITERIA.FIRST_BATTLE)) {
        badgesToAward.push({
          character_id: character.character_id,
          badge_id: BADGE_CRITERIA.FIRST_BATTLE,
        });
      }
    }

    if (event.type === 'capture' && event.success) {
      const captureCount = achievements.filter((a) =>
        a.title.toLowerCase().includes('capture')
      ).length;
      if (captureCount === 0 && !achievements.some((a) => a.achievement_id === BADGE_CRITERIA.FIRST_CAPTURE)) {
        badgesToAward.push({
          character_id: character.character_id,
          badge_id: BADGE_CRITERIA.FIRST_CAPTURE,
        });
      }
    }

    // Check cumulative badges
    const totalBattlesWon = achievements.filter((a) =>
      a.title.toLowerCase().includes('battle') && a.title.toLowerCase().includes('win')
    ).length;
    if (totalBattlesWon >= 10 && currentBadges < 8) {
      badgesToAward.push({
        character_id: character.character_id,
        badge_id: BADGE_CRITERIA.CHAMPION,
      });
    }

    const totalCaptures = character.pokemon_party?.length || 0;
    if (totalCaptures >= 10 && currentBadges < 8) {
      badgesToAward.push({
        character_id: character.character_id,
        badge_id: BADGE_CRITERIA.COLLECTOR,
      });
    }
  }

  return badgesToAward;
}

/**
 * Check milestone completion
 * @param {object} session - Current session
 * @returns {object[]} Array of milestones that should be marked as completed
 */
export function checkMilestoneCompletion(session) {
  const completedMilestones = [];

  for (const milestoneDef of MILESTONE_DEFINITIONS) {
    // Check if milestone is already completed
    const allMilestones = session.characters?.flatMap(
      (char) => char.progression?.milestones || []
    ) || [];
    const existingMilestone = allMilestones.find(
      (m) => m.milestone_id === milestoneDef.milestone_id
    );

    if (existingMilestone?.completed) {
      continue;
    }

    // Check if milestone criteria are met
    if (milestoneDef.check(session)) {
      completedMilestones.push({
        milestone_id: milestoneDef.milestone_id,
        title: milestoneDef.title,
        description: milestoneDef.description,
        completed: true,
      });
    }
  }

  return completedMilestones;
}

/**
 * Apply progression updates to session after a battle or event
 * @param {object} session - Current session
 * @param {object} event - Event that triggered progression (battle, capture, etc.)
 * @returns {object} Updated session with progression applied
 */
export function applyProgression(session, event) {
  const updated = JSON.parse(JSON.stringify(session));

  // Calculate XP if it's a battle event
  if (event.type === 'battle' || event.type === 'encounter') {
    const xpGained = calculateXP(event, session);
    const characters = updated.characters || [];

    for (const character of characters) {
      const party = character.pokemon_party || [];
      for (let i = 0; i < party.length; i++) {
        const pokemon = party[i];
        if (checkLevelUp(pokemon, xpGained)) {
          party[i] = applyLevelUp(pokemon, 1);
        }
      }
    }
  }

  // Check for badge completion
  const badgesToAward = checkBadgeCompletion(updated, event);
  for (const badge of badgesToAward) {
    const character = updated.characters?.find(
      (c) => c.character_id === badge.character_id
    );
    if (character) {
      character.progression = character.progression || { badges: 0, milestones: [] };
      character.progression.badges = Math.min(8, (character.progression.badges || 0) + 1);
      
      // Add achievement
      character.achievements = character.achievements || [];
      character.achievements.push({
        achievement_id: badge.badge_id,
        title: `Badge: ${badge.badge_id}`,
        description: `Earned ${badge.badge_id} badge`,
        earned_in_session_id: updated.session.session_id,
      });
    }
  }

  // Check for milestone completion
  const completedMilestones = checkMilestoneCompletion(updated);
  for (const milestone of completedMilestones) {
    // Add milestone to all characters (milestones are campaign-wide)
    for (const character of updated.characters || []) {
      character.progression = character.progression || { badges: 0, milestones: [] };
      const existingMilestone = character.progression.milestones.find(
        (m) => m.milestone_id === milestone.milestone_id
      );
      if (!existingMilestone) {
        character.progression.milestones.push(milestone);
      } else {
        existingMilestone.completed = true;
        existingMilestone.title = milestone.title;
        existingMilestone.description = milestone.description;
      }
    }
  }

  // Validate updated session
  return PokemonSessionSchema.parse(updated);
}

export default {
  calculateXP,
  checkLevelUp,
  applyLevelUp,
  checkBadgeCompletion,
  checkMilestoneCompletion,
  applyProgression,
};
