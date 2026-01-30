/**
 * Agent Orchestrator Service
 * Z2-level orchestration of agent execution
 * Separates routing logic from agent execution
 */

import { routeIntent } from '../agents/router.js';
import { runDMAgent } from '../agents/dm.js';
import { runRulesAgent } from '../agents/rules.js';
import { queryStateAgent } from '../agents/state.js';
import { fetchLore } from '../agents/lore.js';
import { createCustomPokemonAgent } from '../agents/design.js';
import { loadSession, createSession, saveSession } from '../storage/sessionStore.js';
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

  // Handle special commands before routing
  const normalizedInput = userInput.trim().toLowerCase();
  if (normalizedInput === '/recap' || normalizedInput.startsWith('/recap')) {
    return {
      intent: 'recap',
      narration: await generateRecap(session, model),
      choices: [],
      session: session,
      sessionId: session.session.session_id,
      steps: [],
      customPokemon: null,
    };
  }
  if (normalizedInput === '/save' || normalizedInput.startsWith('/save')) {
    await saveSession(session.session.session_id, session);
    return {
      intent: 'save',
      narration: 'Session saved successfully.',
      choices: [],
      session: session,
      sessionId: session.session.session_id,
      steps: [],
      customPokemon: null,
    };
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
      .filter(e => e.type !== 'recap') // Exclude existing recaps
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
      .map(t => `- ${t.description}`)
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
