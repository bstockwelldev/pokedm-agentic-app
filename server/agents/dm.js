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
import { buildCampaignContext } from '../services/campaignLoader.js';

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

// ─── Z1: Top-level orchestrator ──────────────────────────────────────────────

/**
 * DM Agent
 * Handles narration and choices using structured output.
 * SN: prepare prompt → generate response → apply encounter backstop → persist state → return.
 */
export async function runDMAgent(userInput, session, model = null) {
  const { system, userMessage, modelName } = prepareDMPrompt(userInput, session, model);

  const { response, steps } = await generateStructuredDMResponse({
    modelName,
    system,
    userMessage,
    maxSteps: getAgentConfig('dm').maxSteps,
    session,
    userInput,
  });

  const { narration, choices, safeDefault, encounterState } = applyEncounterBackstop(
    response, session, userInput
  );

  const updatedSession = persistDMSessionState(session, narration, choices, safeDefault, encounterState);

  return { narration, choices, steps, updatedSession };
}

// ─── Z2: Mid-level orchestration ─────────────────────────────────────────────

/**
 * Assembles the system prompt and user message for the DM agent.
 * Security: user input stays in the messages array, not the system string.
 */
function prepareDMPrompt(userInput, session, model) {
  const config = getAgentConfig('dm');
  const modelName = model || config.defaultModel;
  const context = buildDMContext(session);
  const systemPrompt = `${dmPrompt}\n\n## Current Session Context\n\n${context}`;
  const system = ensureJsonPromptHint(systemPrompt, modelName);
  const userMessage = `${userInput}\n\nProvide narration and 2-4 choices for the players.`;
  return { system, userMessage, modelName };
}

/**
 * Normalizes LLM response and overlays an encounter if pacing logic requires one.
 * SN: normalize response → check encounter trigger → overlay encounter if needed.
 */
function applyEncounterBackstop(response, session, userInput) {
  const narration = normalizeNarration(response.narration, userInput);
  const choices = normalizeGeneratedChoices(response.choices, session);
  const safeDefault = resolveSafeDefaultOption(response.safe_default, choices);

  if (!shouldStartEncounter({ userInput, narration, session })) {
    return { narration, choices, safeDefault, encounterState: null };
  }

  const encounterType = detectEncounterType(`${userInput} ${narration}`);
  const encounterState = createEncounterStateUpdate(session, { encounterType });
  return {
    narration: `${narration.trim()}\n\n${encounterState.encounterNarration}`,
    choices: encounterState.choices,
    safeDefault: encounterState.safe_default,
    encounterState,
  };
}

/**
 * Writes the session state update; returns null on failure rather than throwing.
 * SN: build updates patch → write to store → handle failure gracefully.
 */
function persistDMSessionState(session, narration, choices, safeDefault, encounterState) {
  if (choices.length === 0) return null;
  try {
    const updates = buildSessionStateUpdates(session, narration, choices, safeDefault, encounterState);
    return updateSessionState(session, updates);
  } catch (error) {
    logger.warn('Failed to update session state', { error: error.message, stack: error.stack });
    return null;
  }
}

async function generateStructuredDMResponse({
  modelName,
  system,
  userMessage,
  maxSteps,
  session,
  userInput,
}) {
  try {
    const result = await generateObject({
      model: await getModel(modelName),
      schema: DMAgentResponseSchema,
      system,
      messages: [{ role: 'user', content: userMessage }],
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
      system,
      userMessage,
      maxSteps,
      session,
      userInput,
    });
  }
}

async function generateFallbackDMResponse({
  modelName,
  system,
  userMessage,
  maxSteps,
  session,
  userInput,
}) {
  const fallbackUserMessage = `${userMessage}

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
    system: ensureJsonPromptHint(system, modelName),
    messages: [{ role: 'user', content: fallbackUserMessage }],
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

  // Inject campaign config context (STO-26)
  const campaignId = session.session?.campaign_id ?? session.campaign_id;
  if (campaignId) {
    const currentLocationId = session.session?.scene?.location_id;
    const campaignContext = buildCampaignContext(campaignId, currentLocationId);
    if (campaignContext) {
      context += `\n${campaignContext}\n`;
    }
  }

  return context;
}

// ─── Z3: Pure data assembly helpers ──────────────────────────────────────────

/**
 * Builds the full session state patch for a DM turn.
 * Pure function — no I/O; fully testable.
 */
function buildSessionStateUpdates(session, narration, choices, safeDefault, encounterState) {
  const now = new Date().toISOString();
  const eventLogEntries = buildBaseEventLogEntries(narration, choices, safeDefault, now);
  if (encounterState) {
    eventLogEntries.push(...encounterState.eventLogEntries);
  }

  const updates = {
    session: {
      player_choices: { options_presented: choices, safe_default: safeDefault },
      scene: {
        description: summarizeSceneDescription(narration),
        mood: encounterState ? 'tense' : inferSceneMood(narration),
      },
      event_log: appendEventLogEntries(session.session?.event_log || [], eventLogEntries),
    },
  };

  if (encounterState) {
    updates.session.encounters = [...(session.session?.encounters || []), encounterState.encounter];
    updates.session.battle_state = encounterState.battleState;
  }

  if (detectSignificantEvent(narration, session)) {
    updates.continuity = buildContinuityUpdate(session, narration, now);
  }

  return updates;
}

/**
 * Builds the continuity patch (timeline entry + hook updates) for significant events.
 * Pure function — no I/O; fully testable.
 */
function buildContinuityUpdate(session, narration, now) {
  return {
    timeline: [
      ...(session.continuity?.timeline || []),
      {
        session_id: session.session.session_id,
        episode_title: session.session.episode_title || 'Untitled Episode',
        summary: extractEventSummary(narration),
        canonized: false,
        date: now,
        tags: extractEventTags(narration),
      },
    ],
    unresolved_hooks: updateUnresolvedHooks(
      session.continuity?.unresolved_hooks || [],
      narration,
      session.session.session_id
    ),
  };
}

/**
 * Builds two event log entries (scene + choice) for the current DM turn.
 * Accepts `now` so both entries share an identical timestamp.
 */
function buildBaseEventLogEntries(narration, choices, safeDefault, now = new Date().toISOString()) {
  return [
    {
      t: now,
      kind: 'scene',
      summary: extractEventSummary(narration),
      details: summarizeSceneDescription(narration),
    },
    {
      t: now,
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
