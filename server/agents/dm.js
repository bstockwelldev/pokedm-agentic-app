import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/modelProvider.js';
import {
  ensureJsonPromptHint,
  getProviderOptionsForStructuredOutput,
  isRecoverableStructuredOutputError,
} from '../lib/structuredOutputHelper.js';
import { dmPrompt } from '../prompts/dm.js';
import { getAgentConfig } from '../config/agentConfig.js';
import { updateSessionState } from './state.js';
import {
  createEncounterStateUpdate,
  detectEncounterType,
  shouldStartEncounter,
} from '../services/encounterService.js';
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
  safe_default: z.string().describe('Option ID of the safest default choice'),
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
  const prompt = ensureJsonPromptHint(fullPrompt, modelName);

  try {
    const { response, steps } = await generateStructuredDMResponse({
      modelName,
      prompt,
      maxSteps: config.maxSteps,
      session,
      userInput,
    });

    const generatedChoices = normalizeGeneratedChoices(response.choices, session);
    let finalNarration = normalizeNarration(response.narration, userInput);
    let finalChoices = generatedChoices;
    let finalSafeDefault = resolveSafeDefaultOption(response.safe_default, finalChoices);
    let encounterState = null;

    // Backstop for encounter pacing: trigger a concrete encounter when appropriate.
    if (shouldStartEncounter({ userInput, narration: finalNarration, session })) {
      const encounterType = detectEncounterType(`${userInput} ${finalNarration}`);
      encounterState = createEncounterStateUpdate(session, { encounterType });
      finalNarration = `${finalNarration.trim()}\n\n${encounterState.encounterNarration}`;
      finalChoices = encounterState.choices;
      finalSafeDefault = encounterState.safe_default;
    }

    // Update session state with presented choices and continuity tracking
    let updatedSession = null;
    if (finalChoices.length > 0) {
      try {
        // Determine if this is a significant event that should be tracked
        const isSignificantEvent = detectSignificantEvent(finalNarration, session);
        const eventLogEntries = buildBaseEventLogEntries(finalNarration, finalChoices, finalSafeDefault);

        if (encounterState) {
          eventLogEntries.push(...encounterState.eventLogEntries);
        }

        const updates = {
          session: {
            player_choices: {
              options_presented: finalChoices,
              safe_default: finalSafeDefault,
            },
            scene: {
              description: summarizeSceneDescription(finalNarration),
              mood: encounterState ? 'tense' : inferSceneMood(finalNarration),
            },
            event_log: appendEventLogEntries(session.session?.event_log || [], eventLogEntries),
          },
        };

        if (encounterState) {
          updates.session.encounters = [...(session.session?.encounters || []), encounterState.encounter];
          updates.session.battle_state = encounterState.battleState;
        }

        // Add continuity tracking for significant events
        if (isSignificantEvent) {
          updates.continuity = {
            timeline: [
              ...(session.continuity?.timeline || []),
              {
                session_id: session.session.session_id,
                episode_title: session.session.episode_title || 'Untitled Episode',
                summary: extractEventSummary(finalNarration),
                canonized: false,
                date: new Date().toISOString(),
                tags: extractEventTags(finalNarration),
              },
            ],
            unresolved_hooks: updateUnresolvedHooks(
              session.continuity?.unresolved_hooks || [],
              finalNarration,
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
      narration: finalNarration,
      choices: finalChoices,
      steps,
      updatedSession: updatedSession,
    };
  } catch (error) {
    logger.error('DM Agent error', { error: error.message, stack: error.stack });
    throw error;
  }
}

async function generateStructuredDMResponse({
  modelName,
  prompt,
  maxSteps,
  session,
  userInput,
}) {
  try {
    const result = await generateObject({
      model: await getModel(modelName),
      schema: DMAgentResponseSchema,
      prompt,
      maxSteps,
      providerOptions: getProviderOptionsForStructuredOutput(modelName),
    });

    return {
      response: result.object,
      steps: result.steps || [],
    };
  } catch (error) {
    if (!isRecoverableStructuredOutputError(error)) {
      throw error;
    }

    logger.warn('DM structured output failed, using text fallback', {
      error: error.message,
      modelName,
    });
    return generateFallbackDMResponse({
      modelName,
      prompt,
      maxSteps,
      session,
      userInput,
    });
  }
}

async function generateFallbackDMResponse({
  modelName,
  prompt,
  maxSteps,
  session,
  userInput,
}) {
  const fallbackPrompt = `${prompt}

Return a single json object only, with this exact shape:
{
  "narration": string,
  "choices": [
    { "option_id": string, "label": string, "description": string, "risk_level": "low" | "medium" | "high" }
  ],
  "safe_default": string
}`;

  const result = await generateText({
    model: await getModel(modelName),
    prompt: ensureJsonPromptHint(fallbackPrompt, modelName),
    maxSteps: Math.min(maxSteps, 2),
  });

  const parsedObject = extractJsonObject(result.text);
  const parsed = DMAgentResponseSchema.safeParse(parsedObject);
  if (parsed.success) {
    return {
      response: parsed.data,
      steps: result.steps || [],
    };
  }

  const fallbackChoices = buildFallbackChoices(session);
  return {
    response: {
      narration: normalizeNarration(result.text, userInput),
      choices: fallbackChoices,
      safe_default: fallbackChoices[0].option_id,
    },
    steps: result.steps || [],
  };
}

function extractJsonObject(text) {
  if (typeof text !== 'string') {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with substring extraction.
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = trimmed.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function normalizeGeneratedChoices(choices, session) {
  if (!Array.isArray(choices)) {
    return buildFallbackChoices(session);
  }

  const normalized = choices
    .slice(0, 4)
    .map((choice, index) => ({
      option_id: choice?.option_id || `option_${index + 1}`,
      label: choice?.label || `Option ${index + 1}`,
      description: choice?.description || 'Continue the adventure.',
      risk_level: normalizeRiskLevel(choice?.risk_level),
    }));

  if (normalized.length >= 2) {
    return normalized;
  }

  return buildFallbackChoices(session);
}

function normalizeRiskLevel(riskLevel) {
  if (riskLevel === 'low' || riskLevel === 'medium' || riskLevel === 'high') {
    return riskLevel;
  }
  return 'medium';
}

function normalizeNarration(narration, userInput) {
  if (typeof narration === 'string' && narration.trim().length > 0) {
    return narration.trim();
  }

  return `You press onward after "${userInput}". The path ahead opens into a new scene, and your party prepares for what comes next.`;
}

function buildFallbackChoices(session) {
  const priorChoices = session.session?.player_choices?.options_presented;
  if (Array.isArray(priorChoices) && priorChoices.length >= 2) {
    return priorChoices.slice(0, 4).map((choice, index) => ({
      option_id: choice?.option_id || `option_${index + 1}`,
      label: choice?.label || `Option ${index + 1}`,
      description: choice?.description || 'Continue with this approach.',
      risk_level: normalizeRiskLevel(choice?.risk_level),
    }));
  }

  return [
    {
      option_id: 'option_1',
      label: 'Advance carefully',
      description: 'Move forward while scanning for clues or nearby wild Pokemon.',
      risk_level: 'low',
    },
    {
      option_id: 'option_2',
      label: 'Talk to someone nearby',
      description: 'Ask an NPC for guidance, rumors, or route advice before acting.',
      risk_level: 'low',
    },
    {
      option_id: 'option_3',
      label: 'Prepare your party',
      description: 'Review your Pokemon and supplies before the next challenge.',
      risk_level: 'medium',
    },
  ];
}

function resolveSafeDefaultOption(candidateOptionId, choices) {
  if (candidateOptionId && choices.some((choice) => choice.option_id === candidateOptionId)) {
    return candidateOptionId;
  }
  const lowRiskChoice = choices.find((choice) => choice.risk_level === 'low');
  return lowRiskChoice?.option_id || choices[0]?.option_id || 'option_1';
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

function buildBaseEventLogEntries(narration, choices, safeDefault) {
  return [
    {
      t: new Date().toISOString(),
      kind: 'scene',
      summary: extractEventSummary(narration),
      details: summarizeSceneDescription(narration),
    },
    {
      t: new Date().toISOString(),
      kind: 'choice',
      summary: `Presented ${choices.length} options`,
      details: `Safe default: ${safeDefault}`,
    },
  ];
}

function appendEventLogEntries(existingEntries, newEntries, maxEntries = 200) {
  const merged = [...existingEntries, ...newEntries];
  if (merged.length <= maxEntries) {
    return merged;
  }
  return merged.slice(-maxEntries);
}

function summarizeSceneDescription(narration) {
  return narration.replace(/\s+/g, ' ').trim().slice(0, 280);
}

function inferSceneMood(narration) {
  const normalized = narration.toLowerCase();
  if (normalized.includes('battle') || normalized.includes('danger') || normalized.includes('threat')) {
    return 'tense';
  }
  if (
    normalized.includes('explore') ||
    normalized.includes('journey') ||
    normalized.includes('discover')
  ) {
    return 'adventurous';
  }
  return 'calm';
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
