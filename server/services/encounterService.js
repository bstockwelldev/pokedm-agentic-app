/**
 * Encounter Service
 * Generates deterministic battle encounters for DM flow and quick actions.
 */

const WILD_PROFILES = [
  {
    species: 'pidgey',
    displayName: 'Pidgey',
    typing: ['Normal', 'Flying'],
    ability: {
      name: 'keen-eye',
      description: "The Pokemon's keen eyes prevent its accuracy from being lowered.",
    },
    moves: [
      {
        name: 'tackle',
        type: 'Normal',
        category: 'physical',
        pp: 35,
        accuracy: 95,
        power: 40,
        simple_effect: 'A physical attack in which the user charges and slams into the target.',
      },
      {
        name: 'sand-attack',
        type: 'Ground',
        category: 'status',
        pp: 15,
        accuracy: 100,
        power: null,
        simple_effect: 'Throws sand in the target face to lower accuracy.',
      },
    ],
  },
  {
    species: 'mareep',
    displayName: 'Mareep',
    typing: ['Electric'],
    ability: {
      name: 'static',
      description: 'Contact with the Pokemon may cause paralysis.',
    },
    moves: [
      {
        name: 'thunder-shock',
        type: 'Electric',
        category: 'special',
        pp: 30,
        accuracy: 100,
        power: 40,
        simple_effect: 'A jolt of electricity is hurled at the target.',
      },
      {
        name: 'growl',
        type: 'Normal',
        category: 'status',
        pp: 40,
        accuracy: 100,
        power: null,
        simple_effect: "The user growls in an endearing way, making the foe less wary.",
      },
    ],
  },
];

const TRAINER_PROFILES = [
  {
    species: 'eevee',
    displayName: 'Eevee',
    typing: ['Normal'],
    trainerName: 'Scout Mira',
    ability: {
      name: 'run-away',
      description: 'Enables a sure getaway from wild Pokemon.',
    },
    moves: [
      {
        name: 'quick-attack',
        type: 'Normal',
        category: 'physical',
        pp: 30,
        accuracy: 100,
        power: 40,
        simple_effect: 'An almost invisibly fast attack that is certain to strike first.',
      },
      {
        name: 'tail-whip',
        type: 'Normal',
        category: 'status',
        pp: 30,
        accuracy: 100,
        power: null,
        simple_effect: "The user wags its tail cutely, making opposing Pokemon less wary.",
      },
    ],
  },
  {
    species: 'growlithe',
    displayName: 'Growlithe',
    typing: ['Fire'],
    trainerName: 'Cadet Rowan',
    ability: {
      name: 'intimidate',
      description: "Lowers opposing Pokemon's Attack stat.",
    },
    moves: [
      {
        name: 'ember',
        type: 'Fire',
        category: 'special',
        pp: 25,
        accuracy: 100,
        power: 40,
        simple_effect: 'The target is attacked with small flames.',
      },
      {
        name: 'leer',
        type: 'Normal',
        category: 'status',
        pp: 30,
        accuracy: 100,
        power: null,
        simple_effect: 'Frightens opposing Pokemon with a scary face to lower Defense.',
      },
    ],
  },
];

const ENCOUNTER_TRIGGER_KEYWORDS = [
  'battle',
  'encounter',
  'fight',
  'wild',
  'trainer',
  'duel',
  'challenge',
  'combat',
];

const PROGRESSION_KEYWORDS = [
  'continue',
  'explore',
  'proceed',
  'advance',
  'go',
  'travel',
  'route',
  'path',
  'next',
];

export function hasPartyPokemon(session) {
  return (
    Array.isArray(session?.characters) &&
    session.characters.some((character) => Array.isArray(character.pokemon_party) && character.pokemon_party.length > 0)
  );
}

export function detectEncounterType(text = '') {
  const normalizedText = String(text).toLowerCase();
  if (
    normalizedText.includes('trainer') ||
    normalizedText.includes('rival') ||
    normalizedText.includes('npc')
  ) {
    return 'trainer';
  }
  return 'wild';
}

export function shouldStartEncounter({ userInput = '', narration = '', session }) {
  if (!session?.session || session.session.battle_state?.active) {
    return false;
  }
  if (!hasPartyPokemon(session)) {
    return false;
  }

  const combinedText = `${userInput} ${narration}`.toLowerCase();
  if (ENCOUNTER_TRIGGER_KEYWORDS.some((keyword) => combinedText.includes(keyword))) {
    return true;
  }

  const hasEncounterHistory =
    (session.session.encounters?.length || 0) > 0 ||
    (session.session.event_log || []).some((entry) => entry.kind === 'encounter' || entry.kind === 'battle');

  if (hasEncounterHistory) {
    return false;
  }

  return PROGRESSION_KEYWORDS.some((keyword) => combinedText.includes(keyword));
}

export function createEncounterStateUpdate(session, options = {}) {
  const encounterType = options.encounterType === 'trainer' ? 'trainer' : 'wild';
  const encounterId = buildEncounterId();
  const profile = selectEncounterProfile(encounterType);
  const leadPokemon = getLeadPokemon(session);
  const leadLevel = leadPokemon?.level || 5;
  const opponentLevel = calculateOpponentLevel(leadLevel, encounterType);
  const opponentSlotId = `${encounterId}_slot_1`;
  const opponentSlot = buildOpponentSlot(profile, opponentSlotId, opponentLevel);
  const partyRefs = getPartyPokemonRefs(session);

  const participants = [
    ...partyRefs.map((ref, index) => ({
      participant_id: `${encounterId}_party_${index + 1}`,
      kind: 'party_pokemon',
      ref,
      notes: 'Player party participant',
    })),
  ];

  if (encounterType === 'trainer') {
    participants.push({
      participant_id: `${encounterId}_npc_trainer`,
      kind: 'npc_trainer',
      ref: `npc_${encounterId}`,
      notes: `${profile.trainerName} issued a battle challenge`,
    });
  }

  participants.push({
    participant_id: `${encounterId}_opponent_1`,
    kind: encounterType === 'trainer' ? 'npc_pokemon' : 'wild_pokemon',
    ref: opponentSlotId,
    notes: `${profile.displayName} enters the battle`,
  });

  const encounter = {
    encounter_id: encounterId,
    type: encounterType,
    difficulty: calculateEncounterDifficulty(session, opponentLevel),
    status: 'active',
    participants,
    wild_slots: [opponentSlot],
  };

  const turn_order = buildTurnOrder(partyRefs, opponentSlotId, encounterType);

  const battleState = {
    active: true,
    encounter_id: encounterId,
    round: 1,
    turn_order,
    field_effects: [],
    last_action_summary:
      encounterType === 'trainer'
        ? `${profile.trainerName} challenges the party. Battle begins now.`
        : `A wild ${profile.displayName} appears. Battle begins now.`,
  };

  const encounterNarration =
    encounterType === 'trainer'
      ? `${profile.trainerName} steps into your path and points forward. "${profile.displayName}, battle formation!" A trainer battle starts immediately (Round 1).`
      : `A wild ${profile.displayName} bursts into view and locks onto your team. The encounter shifts straight into battle (Round 1).`;

  const choices = buildBattleChoices(encounterType, profile.displayName);
  const safe_default = choices[0].option_id;

  const eventLogEntries = [
    {
      t: new Date().toISOString(),
      kind: 'encounter',
      summary:
        encounterType === 'trainer'
          ? `${profile.trainerName} initiated a trainer encounter`
          : `Wild ${profile.displayName} initiated an encounter`,
      details: `Encounter ID: ${encounterId}`,
    },
    {
      t: new Date().toISOString(),
      kind: 'battle',
      summary: `Battle started against ${profile.displayName}`,
      details: `Round 1 started with ${turn_order.length} participants`,
    },
  ];

  return {
    encounter,
    battleState,
    encounterNarration,
    choices,
    safe_default,
    eventLogEntries,
  };
}

function buildEncounterId() {
  const nonce = Math.random().toString(36).slice(2, 7);
  return `encounter_${Date.now()}_${nonce}`;
}

function selectEncounterProfile(encounterType) {
  const profiles = encounterType === 'trainer' ? TRAINER_PROFILES : WILD_PROFILES;
  const index = Math.floor(Math.random() * profiles.length);
  return profiles[index];
}

function getLeadPokemon(session) {
  for (const character of session?.characters || []) {
    if (Array.isArray(character.pokemon_party) && character.pokemon_party.length > 0) {
      return character.pokemon_party[0];
    }
  }
  return null;
}

function getPartyPokemonRefs(session) {
  const refs = [];
  for (const character of session?.characters || []) {
    for (const pokemon of character.pokemon_party || []) {
      if (pokemon.instance_id) {
        refs.push(pokemon.instance_id);
      }
    }
  }
  return refs;
}

function calculateOpponentLevel(leadLevel, encounterType) {
  const levelAdjustment = encounterType === 'trainer' ? 1 : 0;
  return Math.max(2, Math.min(100, leadLevel + levelAdjustment));
}

function calculateEncounterDifficulty(session, opponentLevel) {
  const recentFailures = session?.session?.fail_soft_flags?.recent_failures || 0;
  if (recentFailures >= 2) {
    return 'easy';
  }
  if (opponentLevel >= 15) {
    return 'hard';
  }
  return 'normal';
}

function buildOpponentSlot(profile, opponentSlotId, level) {
  const hp = Math.max(16, 12 + level * 2);
  return {
    encounter_slot_id: opponentSlotId,
    species_ref: {
      kind: 'canon',
      ref: `canon:${profile.species}`,
    },
    form_ref: {
      kind: 'none',
    },
    level,
    typing: profile.typing,
    ability: {
      kind: 'canon',
      name: profile.ability.name,
      description: profile.ability.description,
    },
    moves: profile.moves.map((move) => ({
      kind: 'canon',
      name: move.name,
      type: move.type,
      category: move.category,
      pp: move.pp,
      accuracy: move.accuracy,
      power: move.power,
      simple_effect: move.simple_effect,
    })),
    stats: {
      hp: {
        current: hp,
        max: hp,
      },
      attack: Math.max(10, 7 + level),
      defense: Math.max(10, 6 + level),
      special_attack: Math.max(10, 7 + level),
      special_defense: Math.max(10, 6 + level),
      speed: Math.max(10, 8 + level),
    },
    status_conditions: [],
    capture: {
      attempts: 0,
      result: 'not_attempted',
    },
  };
}

function buildTurnOrder(partyRefs, opponentSlotId, encounterType) {
  const turnOrder = partyRefs.map((ref, index) => ({
    slot: index + 1,
    participant_kind: 'party_pokemon',
    ref,
    fainted: false,
  }));

  turnOrder.push({
    slot: turnOrder.length + 1,
    participant_kind: encounterType === 'trainer' ? 'npc_pokemon' : 'wild_pokemon',
    ref: opponentSlotId,
    fainted: false,
  });

  return turnOrder;
}

function buildBattleChoices(encounterType, opponentName) {
  if (encounterType === 'trainer') {
    return [
      {
        option_id: 'battle_opening',
        label: 'Open with a safe move',
        description: `Command your lead Pokemon to open with a reliable move against ${opponentName}.`,
        risk_level: 'low',
      },
      {
        option_id: 'battle_defend',
        label: 'Defend and scout',
        description: `Take a defensive turn to read ${opponentName} before committing to a strategy.`,
        risk_level: 'low',
      },
      {
        option_id: 'battle_switch',
        label: 'Switch for matchup',
        description: 'Switch to another party Pokemon to improve your type matchup early.',
        risk_level: 'medium',
      },
    ];
  }

  return [
    {
      option_id: 'battle_opening',
      label: 'Open with a safe move',
      description: `Command your lead Pokemon to test ${opponentName} with a low-risk opening attack.`,
      risk_level: 'low',
    },
    {
      option_id: 'battle_defend',
      label: 'Defend and observe',
      description: `Use a defensive action first to observe ${opponentName}'s behavior and move style.`,
      risk_level: 'low',
    },
    {
      option_id: 'battle_capture_setup',
      label: 'Set up for capture',
      description: `Lower ${opponentName}'s HP carefully and prepare for a capture attempt later in the battle.`,
      risk_level: 'medium',
    },
  ];
}
