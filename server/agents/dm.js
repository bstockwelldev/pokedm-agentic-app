import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/modelProvider.js';
import { getProviderOptionsForStructuredOutput } from '../lib/structuredOutputHelper.js';
import { dmPrompt } from '../prompts/dm.js';
import { getAgentConfig } from '../config/agentConfig.js';
import { updateSessionState } from './state.js';
import logger from '../lib/logger.js';

/**
 * DM Agent Response Schema
 */
const DMAgentResponseSchema = z.object({
  narration: z.string().describe('The narrative text advancing the story'),
  choices: z.array(
    z.object({
      option_id: z.string().describe('Unique identifier for the choice option'),
      label: z.string().describe('Short label for the choice'),
      description: z.string().describe('Detailed description of what this choice entails'),
      risk_level: z.enum(['low', 'medium', 'high']).describe('Risk level of this choice'),
    })
  ).min(2).max(4).describe('2-4 player choice options'),
  safe_default: z.string().optional().describe('Option ID of the safest default choice'),
});

/**
 * DM Agent
 * Handles narration and choices using structured output
 */
export async function runDMAgent(userInput, session, model = null) {
  const config = getAgentConfig('dm');
  const modelName = model || config.defaultModel;

  // Build context from session state
  const context = buildDMContext(session);

  const fullPrompt = `${dmPrompt}

## Current Session Context

${context}

## User Input

${userInput}

Provide narration and 2-4 choices for the players.`;

  try {
    const result = await generateObject({
      model: await getModel(modelName),
      schema: DMAgentResponseSchema,
      prompt: fullPrompt,
      maxSteps: config.maxSteps,
      providerOptions: getProviderOptionsForStructuredOutput(modelName),
    });

    const response = result.object;
    const choices = response.choices.map((choice, index) => ({
      ...choice,
      option_id: choice.option_id || `option_${index + 1}`,
    }));
    
    // Update session state with presented choices and continuity tracking
    let updatedSession = null;
    if (choices.length > 0) {
      try {
        // Determine if this is a significant event that should be tracked
        const isSignificantEvent = detectSignificantEvent(response.narration, session);
        
        const updates = {
          session: {
            player_choices: {
              options_presented: choices,
              safe_default: response.safe_default || choices[0]?.option_id || null,
            },
          },
        };

        // Add continuity tracking for significant events
        if (isSignificantEvent) {
          updates.continuity = {
            timeline: [
              ...(session.continuity?.timeline || []),
              {
                session_id: session.session.session_id,
                episode_title: session.session.episode_title || 'Untitled Episode',
                summary: extractEventSummary(response.narration),
                canonized: false,
                date: new Date().toISOString(),
                tags: extractEventTags(response.narration),
              },
            ],
            unresolved_hooks: updateUnresolvedHooks(
              session.continuity?.unresolved_hooks || [],
              response.narration,
              session.session.session_id
            ),
          };
        }

        updatedSession = updateSessionState(session, updates);
      } catch (error) {
        logger.warn('Failed to update session state with choices', { error: error.message, stack: error.stack });
        // Continue without state update
      }
    }

    return {
      narration: response.narration,
      choices: choices,
      steps: result.steps || [],
      updatedSession: updatedSession,
    };
  } catch (error) {
    logger.error('DM Agent error', { error: error.message, stack: error.stack });
    throw error;
  }
}

function buildDMContext(session) {
  let context = '';

  if (session.session) {
    context += `Current Location: ${session.session.scene.location_id || 'Unknown'}\n`;
    context += `Scene: ${session.session.scene.description || 'No description'}\n`;
    context += `Mood: ${session.session.scene.mood || 'calm'}\n\n`;
  }

  if (session.characters && session.characters.length > 0) {
    context += `Characters: ${session.characters.map((c) => c.trainer.name).join(', ')}\n`;
    context += `Party Size: ${session.characters.reduce((sum, c) => sum + c.pokemon_party.length, 0)} Pokémon\n\n`;
  }

  if (session.session?.current_objectives?.length > 0) {
    context += `Current Objectives:\n`;
    session.session.current_objectives.forEach((obj) => {
      context += `- ${obj.description} (${obj.status})\n`;
    });
    context += '\n';
  }

  return context;
}

/**
 * Detect if narration represents a significant event
 * @param {string} narration - DM narration text
 * @param {object} session - Current session
 * @returns {boolean} True if significant event
 */
function detectSignificantEvent(narration, session) {
  const lowerNarration = narration.toLowerCase();
  
  // Significant event indicators
  const indicators = [
    'encounter',
    'battle',
    'discover',
    'find',
    'meet',
    'arrive',
    'complete',
    'achieve',
    'defeat',
    'capture',
    'evolve',
    'badge',
    'gym',
    'important',
    'critical',
    'turning point',
  ];

  return indicators.some((indicator) => lowerNarration.includes(indicator));
}

/**
 * Extract event summary from narration
 * @param {string} narration - DM narration text
 * @returns {string} Event summary
 */
function extractEventSummary(narration) {
  // Simple extraction: first sentence or first 200 characters
  const sentences = narration.split(/[.!?]\s+/);
  if (sentences.length > 0) {
    return sentences[0].substring(0, 200);
  }
  return narration.substring(0, 200);
}

/**
 * Extract event tags from narration
 * @param {string} narration - DM narration text
 * @returns {string[]} Event tags
 */
function extractEventTags(narration) {
  const lowerNarration = narration.toLowerCase();
  const tags = [];

  // Common tag patterns
  if (lowerNarration.includes('battle') || lowerNarration.includes('fight')) {
    tags.push('battle');
  }
  if (lowerNarration.includes('encounter') || lowerNarration.includes('wild')) {
    tags.push('encounter');
  }
  if (lowerNarration.includes('discover') || lowerNarration.includes('find')) {
    tags.push('discovery');
  }
  if (lowerNarration.includes('capture') || lowerNarration.includes('catch')) {
    tags.push('capture');
  }
  if (lowerNarration.includes('location') || lowerNarration.includes('arrive')) {
    tags.push('location');
  }
  if (lowerNarration.includes('npc') || lowerNarration.includes('meet')) {
    tags.push('npc');
  }

  return tags;
}

/**
 * Update unresolved hooks based on narration
 * @param {Array} existingHooks - Existing unresolved hooks
 * @param {string} narration - DM narration text
 * @param {string} sessionId - Current session ID
 * @returns {Array} Updated hooks
 */
function updateUnresolvedHooks(existingHooks, narration, sessionId) {
  const hooks = [...existingHooks];
  const lowerNarration = narration.toLowerCase();

  // Detect new hooks (mentions of future events, mysteries, etc.)
  const hookIndicators = [
    'mystery',
    'question',
    'unknown',
    'later',
    'future',
    'promise',
    'hint',
    'clue',
  ];

  const hasNewHook = hookIndicators.some((indicator) => lowerNarration.includes(indicator));
  
  if (hasNewHook) {
    // Extract hook description (simplified)
    const hookDescription = extractEventSummary(narration);
    hooks.push({
      hook_id: `hook_${Date.now()}`,
      description: hookDescription,
      urgency: 'medium',
      introduced_in_session_id: sessionId,
      status: 'open',
    });
  }

  // Mark hooks as resolved if narration indicates resolution
  const resolutionIndicators = ['resolved', 'answered', 'completed', 'solved', 'explained'];
  hooks.forEach((hook) => {
    if (hook.status === 'open' && resolutionIndicators.some((indicator) => lowerNarration.includes(indicator))) {
      hook.status = 'resolved';
    }
  });

  return hooks;
}

// extractChoices function removed - now using structured output
