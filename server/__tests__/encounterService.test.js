import {
  createEncounterStateUpdate,
  detectEncounterType,
  hasPartyPokemon,
  shouldStartEncounter,
} from '../services/encounterService.js';

function createSessionFixture({ activeBattle = false } = {}) {
  return {
    session: {
      session_id: 'session_test_001',
      scene: {
        location_id: 'breeze_route_1',
        description: 'A gentle route used for training',
        mood: 'adventurous',
      },
      encounters: [],
      battle_state: {
        active: activeBattle,
        round: activeBattle ? 2 : 0,
        turn_order: [],
        field_effects: [],
      },
      fail_soft_flags: {
        recent_failures: 0,
      },
      event_log: [],
    },
    characters: [
      {
        character_id: 'trainer_001',
        trainer: {
          name: 'Alex',
        },
        pokemon_party: [
          {
            instance_id: 'pokemon_pikachu_001',
            level: 5,
          },
        ],
      },
    ],
  };
}

describe('encounterService', () => {
  test('detectEncounterType returns trainer for trainer prompts', () => {
    expect(detectEncounterType('start a trainer encounter now')).toBe('trainer');
    expect(detectEncounterType('battle a wild pokemon')).toBe('wild');
  });

  test('hasPartyPokemon detects battle-ready party', () => {
    const session = createSessionFixture();
    expect(hasPartyPokemon(session)).toBe(true);
  });

  test('shouldStartEncounter returns true for explicit encounter request', () => {
    const session = createSessionFixture();
    const shouldStart = shouldStartEncounter({
      userInput: 'start a wild battle encounter now',
      narration: 'The path ahead is quiet.',
      session,
    });
    expect(shouldStart).toBe(true);
  });

  test('shouldStartEncounter returns false during active battle', () => {
    const session = createSessionFixture({ activeBattle: true });
    const shouldStart = shouldStartEncounter({
      userInput: 'start a battle',
      narration: '',
      session,
    });
    expect(shouldStart).toBe(false);
  });

  test('createEncounterStateUpdate returns active encounter and battle state', () => {
    const session = createSessionFixture();
    const update = createEncounterStateUpdate(session, { encounterType: 'wild' });

    expect(update.encounter).toBeDefined();
    expect(update.encounter.type).toBe('wild');
    expect(update.encounter.status).toBe('active');
    expect(Array.isArray(update.encounter.wild_slots)).toBe(true);
    expect(update.encounter.wild_slots.length).toBeGreaterThan(0);

    expect(update.battleState).toBeDefined();
    expect(update.battleState.active).toBe(true);
    expect(update.battleState.round).toBe(1);
    expect(Array.isArray(update.battleState.turn_order)).toBe(true);
    expect(update.battleState.turn_order.length).toBeGreaterThan(0);

    expect(Array.isArray(update.choices)).toBe(true);
    expect(update.choices.length).toBeGreaterThanOrEqual(2);
    expect(typeof update.safe_default).toBe('string');
  });
});
