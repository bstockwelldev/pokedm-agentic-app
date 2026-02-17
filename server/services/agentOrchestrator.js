/**
 * Agent Orchestrator Service
 * Z2-level orchestration of agent execution
 * Separates routing logic from agent execution
 */

import { randomUUID } from 'crypto';
import { routeIntent } from '../agents/router.js';
import { runDMAgent } from '../agents/dm.js';
import { runRulesAgent } from '../agents/rules.js';
import { queryStateAgent, updateSessionState } from '../agents/state.js';
import { fetchLore } from '../agents/lore.js';
import { createCustomPokemonAgent } from '../agents/design.js';
import { loadSession, createSession, saveSession } from '../storage/sessionStore.js';
import { PokemonSessionSchema } from '../schemas/session.js';
import {
  createEncounterStateUpdate,
  detectEncounterType,
  hasPartyPokemon,
} from './encounterService.js';
import logger from '../lib/logger.js';

/**
 * Orchestrate agent execution based on user input
 * Z2-level function: orchestrates agent calls
 * @param {object} params - Execution parameters
 * @param {string} params.userInput - User input
 * @param {string|null} params.sessionId - Optional session ID
 * @param {string|null} params.campaignId - Optional campaign ID
 * @param {string[]} params.characterIds - Optional character IDs
 * @param {string} params.model - Model to use
 * @returns {Promise<object>} Agent response
 */
export async function orchestrateAgentExecution({
  userInput,
  sessionId = null,
  campaignId = null,
  characterIds = [],
  model,
}) {
  // Z3: Load or create session (delegated to storage layer)
  let session = null;
  if (sessionId) {
    session = await loadSession(sessionId);
  }

  if (!session) {
    session = await createSession(campaignId || null, characterIds || []);
  }

  // Handle quick actions before intent routing.
  const normalizedInput = userInput.trim().toLowerCase();
  const quickActionResponse = await handleQuickActionCommand({
    normalizedInput,
    userInput,
    session,
    model,
    campaignId,
    characterIds,
  });
  if (quickActionResponse) {
    return quickActionResponse;
  }

  // Z2: Route intent
  const intent = await routeIntent(userInput, session, model);

  // Z2: Execute appropriate agent
  let result;
  switch (intent) {
    case 'narration':
      result = await runDMAgent(userInput, session, model);
      break;
    case 'roll':
      result = await runRulesAgent(userInput, session, model);
      break;
    case 'state':
      result = await queryStateAgent(userInput, session, model);
      break;
    case 'lore':
      result = await fetchLore(userInput, session, model);
      break;
    case 'design':
      result = await createCustomPokemonAgent(userInput, session, model);
      break;
    default:
      // Fallback to DM agent
      result = await runDMAgent(userInput, session, model);
  }

  // Z3: Save updated session if state was modified (delegated to storage layer)
  if (result.updatedSession) {
    await saveSession(session.session.session_id, result.updatedSession);
    session = result.updatedSession;
  }
  
  // Z3: Reload session if custom Pokémon was created
  if (result.customPokemon) {
    session = await loadSession(session.session.session_id);
  }

  // Return response
  return {
    intent,
    narration: result.narration || result.result || result.data || result.explanation || '',
    choices: result.choices || [],
    session: session,
    sessionId: session.session.session_id,
    steps: result.steps || [],
    customPokemon: result.customPokemon || null,
  };
}

async function handleQuickActionCommand({
  normalizedInput,
  userInput,
  session,
  model,
  campaignId,
  characterIds,
}) {
  if (normalizedInput === '/recap' || normalizedInput.startsWith('/recap')) {
    return buildQuickActionResponse('recap', await generateRecap(session, model), session);
  }

  if (normalizedInput === '/save' || normalizedInput.startsWith('/save')) {
    await saveSession(session.session.session_id, session);
    return buildQuickActionResponse('save', 'Session saved successfully.', session);
  }

  if (normalizedInput === '/get-started' || normalizedInput.startsWith('/get-started')) {
    if (!isSessionEmptyForSetup(session)) {
      return buildQuickActionResponse(
        'setup',
        'This session already has progress. Continue playing, or use /restart for a fresh beginning.',
        session
      );
    }

    const startedSession = buildStarterSession(session);
    const starterChoices = getStarterQuickChoices();
    const sessionWithChoices = updateSessionState(startedSession, {
      session: {
        player_choices: {
          options_presented: starterChoices,
          safe_default: starterChoices[0].option_id,
        },
      },
    });

    await saveSession(sessionWithChoices.session.session_id, sessionWithChoices);
    return buildQuickActionResponse(
      'setup',
      'Adventure initialized. You are now in Aurora Town with a starter Pokemon and your first objective.',
      sessionWithChoices,
      starterChoices
    );
  }

  if (normalizedInput === '/restart' || normalizedInput.startsWith('/restart')) {
    const freshSession = await createSession(campaignId || session.campaign?.campaign_id || null, characterIds || []);
    return buildQuickActionResponse(
      'restart',
      'Started a brand-new session. Use /get-started to seed a ready-to-play scene.',
      freshSession
    );
  }

  if (normalizedInput === '/pause' || normalizedInput.startsWith('/pause')) {
    const updatedSession = updateSessionState(session, {
      session: {
        controls: {
          pause_requested: true,
          skip_requested: false,
        },
        event_log: appendEventLogEntries(session.session?.event_log || [], [
          buildEventLogEntry('scene', 'Pause requested', 'Players requested a pause in story flow'),
        ]),
      },
    });
    await saveSession(updatedSession.session.session_id, updatedSession);
    return buildQuickActionResponse(
      'pause',
      'Paused. Ask any clarifying questions, then continue when ready.',
      updatedSession
    );
  }

  if (normalizedInput === '/skip' || normalizedInput.startsWith('/skip')) {
    const updatedSession = updateSessionState(session, {
      session: {
        controls: {
          skip_requested: true,
          pause_requested: false,
        },
        event_log: appendEventLogEntries(session.session?.event_log || [], [
          buildEventLogEntry('scene', 'Skip requested', 'Players requested a transition to the next beat'),
        ]),
      },
    });
    await saveSession(updatedSession.session.session_id, updatedSession);
    return buildQuickActionResponse(
      'skip',
      'Skipping ahead. Ask for the next scene whenever you are ready.',
      updatedSession
    );
  }

  if (normalizedInput === '/hint' || normalizedInput.startsWith('/hint')) {
    return buildQuickActionResponse('hint', buildHintMessage(session), session);
  }

  if (
    normalizedInput.startsWith('/encounter') ||
    normalizedInput.startsWith('/battle-test') ||
    normalizedInput.startsWith('/battle')
  ) {
    if (!hasPartyPokemon(session)) {
      return buildQuickActionResponse(
        'encounter',
        'No battle-ready Pokemon found in this session yet. Run /get-started first.',
        session
      );
    }

    if (session.session?.battle_state?.active) {
      return buildQuickActionResponse(
        'encounter',
        'A battle is already active. Resolve the current encounter before starting another.',
        session
      );
    }

    const encounterType = detectEncounterType(userInput);
    const encounterState = createEncounterStateUpdate(session, { encounterType });
    const updatedSession = updateSessionState(session, {
      session: {
        encounters: [...(session.session?.encounters || []), encounterState.encounter],
        battle_state: encounterState.battleState,
        event_log: appendEventLogEntries(
          session.session?.event_log || [],
          encounterState.eventLogEntries
        ),
        player_choices: {
          options_presented: encounterState.choices,
          safe_default: encounterState.safe_default,
        },
        scene: {
          mood: 'tense',
        },
      },
    });

    await saveSession(updatedSession.session.session_id, updatedSession);
    return buildQuickActionResponse(
      'encounter',
      encounterState.encounterNarration,
      updatedSession,
      encounterState.choices
    );
  }

  return null;
}

function buildQuickActionResponse(intent, narration, session, choices = []) {
  return {
    intent,
    narration,
    choices,
    session,
    sessionId: session.session.session_id,
    steps: [],
    customPokemon: null,
  };
}

function isSessionEmptyForSetup(session) {
  const hasNamedTrainer = (session.characters || []).some((character) =>
    Boolean(character.trainer?.name?.trim())
  );
  const hasParty = hasPartyPokemon(session);
  const hasSceneDescription = Boolean(session.session?.scene?.description?.trim());
  const hasObjectives = (session.session?.current_objectives?.length || 0) > 0;
  const hasEvents = (session.session?.event_log?.length || 0) > 0;

  return !(hasNamedTrainer || hasParty || hasSceneDescription || hasObjectives || hasEvents);
}

function buildStarterSession(session) {
  const startedSession = JSON.parse(JSON.stringify(session));
  const locationId = 'aurora_town_square';
  const starterCharacter = createStarterCharacter(startedSession.session.session_id, locationId);

  startedSession.campaign.campaign_id = startedSession.campaign.campaign_id || 'aurora_frontier';
  startedSession.session.campaign_id = startedSession.campaign.campaign_id;
  startedSession.campaign.region = {
    ...startedSession.campaign.region,
    name: 'Aurora Frontier',
    theme: 'Sky routes, glowing forests, and curious weather',
    description:
      'Aurora Frontier is a newly charted region where wind bridges connect floating neighborhoods and battle traditions are taught by local mentors.',
    environment_tags: ['sky-route', 'forest', 'coast'],
    climate: 'temperate',
  };

  if ((startedSession.campaign.locations || []).length === 0) {
    startedSession.campaign.locations = [
      {
        location_id: locationId,
        name: 'Aurora Town Square',
        type: 'town',
        description: 'The central plaza where new trainers meet guides and begin their first journey.',
        known: true,
      },
      {
        location_id: 'breeze_route_1',
        name: 'Breeze Route 1',
        type: 'route',
        description: 'A gentle training route where first encounters are common at dawn and dusk.',
        known: true,
      },
    ];
  }

  startedSession.characters = [starterCharacter];
  startedSession.session.character_ids = [starterCharacter.character_id];
  startedSession.session.episode_title = 'First Light, First Partner';
  startedSession.session.scene = {
    location_id: locationId,
    description:
      'You arrive at Aurora Town Square just as the morning bell rings. A local ranger welcomes you and points toward Breeze Route 1 for your first field challenge.',
    mood: 'adventurous',
  };
  startedSession.session.current_objectives = [
    {
      objective_id: 'obj_meet_route_mentor',
      description: 'Meet the route mentor and complete your first encounter',
      status: 'active',
      notes: 'Follow the marked path toward Breeze Route 1',
    },
  ];
  startedSession.session.event_log = appendEventLogEntries(startedSession.session.event_log || [], [
    buildEventLogEntry(
      'scene',
      'Adventure initialized in Aurora Town',
      'Starter trainer and partner Pokemon prepared'
    ),
  ]);

  return PokemonSessionSchema.parse(startedSession);
}

function createStarterCharacter(sessionId, locationId) {
  const characterId = `trainer_${randomUUID().slice(0, 8)}`;
  const pokemonId = `pokemon_${randomUUID().slice(0, 8)}`;

  return {
    character_id: characterId,
    trainer: {
      name: 'Alex',
      age_group: 'teen',
      background: 'New trainer eager to learn strategy and exploration',
      personality_traits: ['curious', 'steady', 'kind'],
      bonds: [
        {
          bond_id: `bond_${pokemonId}`,
          target: pokemonId,
          description: 'Trusted first partner',
        },
      ],
    },
    inventory: {
      items: [
        {
          kind: 'canon',
          ref: 'canon:potion',
          quantity: 3,
          notes: 'Starter healing supplies',
        },
      ],
      pokeballs: {
        poke_ball: 5,
        great_ball: 0,
        ultra_ball: 0,
      },
      key_items: [
        {
          kind: 'canon',
          ref: 'canon:pokedex',
          notes: 'Issued by the Aurora research station',
        },
      ],
    },
    pokemon_party: [createStarterPokemon(sessionId, locationId, pokemonId)],
    achievements: [],
    progression: {
      badges: 0,
      milestones: [
        {
          milestone_id: `milestone_${characterId}_start`,
          title: 'Journey Begins',
          description: 'Set out from Aurora Town with your first partner',
          completed: true,
        },
      ],
    },
  };
}

function createStarterPokemon(sessionId, locationId, pokemonId) {
  return {
    instance_id: pokemonId,
    species_ref: {
      kind: 'canon',
      ref: 'canon:pikachu',
    },
    nickname: 'Sparky',
    form_ref: {
      kind: 'none',
    },
    typing: ['Electric'],
    level: 5,
    ability: {
      kind: 'canon',
      name: 'static',
      description: 'Contact with this Pokemon may cause paralysis.',
    },
    moves: [
      {
        kind: 'canon',
        name: 'thunder-shock',
        type: 'Electric',
        category: 'special',
        pp: 30,
        accuracy: 100,
        power: 40,
        simple_effect: 'A weak electric blast that may paralyze.',
      },
      {
        kind: 'canon',
        name: 'growl',
        type: 'Normal',
        category: 'status',
        pp: 40,
        accuracy: 100,
        power: null,
        simple_effect: 'Lowers the target Attack stat.',
      },
    ],
    stats: {
      hp: { current: 20, max: 20 },
      attack: 18,
      defense: 14,
      special_attack: 22,
      special_defense: 16,
      speed: 24,
    },
    status_conditions: [],
    friendship: 80,
    known_info: {
      met_at: {
        location_id: locationId,
        session_id: sessionId,
      },
      lore_learned: ['Pikachu channels electric energy through its cheeks.'],
      seen_moves: ['thunder-shock', 'growl'],
      notes: 'Starter partner from Aurora Town orientation',
    },
    notes: 'Reliable starter partner for opening battles.',
  };
}

function getStarterQuickChoices() {
  return [
    {
      option_id: 'start_explore_route',
      label: 'Head to Breeze Route 1',
      description: 'Begin exploring the first route and look for your opening encounter.',
      risk_level: 'low',
    },
    {
      option_id: 'start_visit_mentor',
      label: 'Talk to the route mentor',
      description: 'Ask for a quick strategy lesson before stepping into the wild.',
      risk_level: 'low',
    },
    {
      option_id: 'start_prepare_items',
      label: 'Review your supplies',
      description: 'Check your inventory and battle plan before departure.',
      risk_level: 'medium',
    },
  ];
}

function buildHintMessage(session) {
  if (session.session?.battle_state?.active) {
    return 'Hint: keep your lead Pokemon safe, probe with a low-risk move, and watch type matchups before committing.';
  }

  const activeObjective = (session.session?.current_objectives || []).find(
    (objective) => objective.status === 'active'
  );
  if (activeObjective) {
    return `Hint: focus on your active objective - ${activeObjective.description}.`;
  }

  const safeDefault = session.session?.player_choices?.safe_default;
  if (safeDefault) {
    return `Hint: your current safe default option is "${safeDefault}".`;
  }

  return 'Hint: use /get-started to seed a ready-to-play scene, then ask for an encounter to start action quickly.';
}

function appendEventLogEntries(existingEntries, newEntries, maxEntries = 200) {
  const merged = [...existingEntries, ...newEntries];
  if (merged.length <= maxEntries) {
    return merged;
  }
  return merged.slice(-maxEntries);
}

function buildEventLogEntry(kind, summary, details) {
  return {
    t: new Date().toISOString(),
    kind,
    summary,
    details,
  };
}

/**
 * Generate recap from session history
 * Z2-level function: orchestrates recap generation
 * @param {object} session - Session object
 * @param {string} model - Model to use
 * @returns {Promise<string>} Recap text
 */
async function generateRecap(session, model) {
  // Z3: Generate simple recap (data extraction)
  const simpleRecap = generateSimpleRecap(session);
  
  if (simpleRecap === 'No recap data available yet. Start your adventure to build up session history!') {
    return simpleRecap;
  }
  
  try {
    const { generateText } = await import('ai');
    const { getModel } = await import('../lib/modelProvider.js');
    
    const recapPrompt = `You are a friendly narrator for a Pokémon adventure session. 

The player has requested a recap of their adventure so far. Based on the following session data, create a warm, engaging recap that:

1. Summarizes what has happened in the adventure
2. Highlights key moments and discoveries
3. Reminds them of their current situation and objectives
4. Uses a friendly, encouraging tone suitable for all ages

## Session Data

${simpleRecap}

Create a narrative recap (2-3 paragraphs) that brings the player back into the story.`;

    const result = await generateText({
      model: await getModel(model),
      prompt: recapPrompt,
      maxSteps: 1,
    });
    
    return result.text;
  } catch (error) {
    logger.error('AI recap generation failed, using simple recap', { error: error.message, stack: error.stack });
    return simpleRecap;
  }
}

/**
 * Generate a simple recap from session history (fallback)
 * Z3-level function: extracts data from session
 * @param {object} session - Session object
 * @returns {string} Recap text
 */
function generateSimpleRecap(session) {
  const recaps = [];
  
  // Build recap from event log
  if (session.session?.event_log && session.session.event_log.length > 0) {
    const recentEvents = session.session.event_log.slice(-10); // Last 10 events
    const eventSummaries = recentEvents
      .filter(e => e.kind !== 'recap') // Exclude existing recaps
      .map(e => `- ${e.summary}${e.details ? `: ${e.details}` : ''}`)
      .join('\n');
    
    if (eventSummaries) {
      recaps.push('## Recent Events\n' + eventSummaries);
    }
  }
  
  // Add existing recaps from continuity
  if (session.continuity?.recaps && session.continuity.recaps.length > 0) {
    const existingRecaps = session.continuity.recaps
      .slice(-3) // Last 3 recaps
      .map(r => r.text)
      .join('\n\n');
    if (existingRecaps) {
      recaps.push('## Previous Recap\n' + existingRecaps);
    }
  }
  
  // Add timeline entries
  if (session.continuity?.timeline && session.continuity.timeline.length > 0) {
    const timelineEntries = session.continuity.timeline
      .slice(-5) // Last 5 timeline entries
      .map(t => `- ${t.summary}`)
      .join('\n');
    if (timelineEntries) {
      recaps.push('## Timeline\n' + timelineEntries);
    }
  }
  
  // Add current state summary
  const stateSummary = [];
  if (session.session?.scene?.location_id) {
    stateSummary.push(`**Current Location:** ${session.session.scene.location_id}`);
  }
  if (session.session?.scene?.description) {
    stateSummary.push(`**Scene:** ${session.session.scene.description}`);
  }
  if (session.characters && session.characters.length > 0) {
    const partySize = session.characters.reduce((sum, c) => sum + c.pokemon_party.length, 0);
    stateSummary.push(`**Party:** ${partySize} Pokémon`);
  }
  if (session.session?.current_objectives && session.session.current_objectives.length > 0) {
    const objectives = session.session.current_objectives
      .map(o => `- ${o.description} (${o.status})`)
      .join('\n');
    stateSummary.push(`**Objectives:**\n${objectives}`);
  }
  
  if (stateSummary.length > 0) {
    recaps.push('## Current State\n' + stateSummary.join('\n'));
  }
  
  // If no recap data available, return a message
  if (recaps.length === 0) {
    return 'No recap data available yet. Start your adventure to build up session history!';
  }
  
  return recaps.join('\n\n');
}

export default {
  orchestrateAgentExecution,
};
