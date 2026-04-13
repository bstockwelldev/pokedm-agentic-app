/**
 * Router Agent — STO-27
 *
 * Hybrid intent classifier: keyword-first (~0ms) with LLM fallback for ambiguous input.
 * Routes player input to one of five agents: narration, roll, state, lore, design.
 *
 * Multi-intent support: a single input may produce a queue of ordered intents.
 * e.g. "roll for it and tell me the lore" → ['roll', 'lore']
 *
 * Architecture decision (hybrid-intent-classifier.md):
 *   1. Keyword pass — O(n) regex scan, no AI cost, ~0ms
 *   2. Ambiguous threshold — if keyword score is low, call LLM classifier
 *   3. Queue ordering — non-narration intents execute before narration
 *
 * Z1: routeIntent              — orchestrate keyword + optional LLM pass
 * Z2: classifyByKeywords       — scan input against KEYWORD_MAP, return scored intent
 *     classifyByLLM            — LLM structured output fallback
 *     buildIntentQueue         — deduplicate + order intents for execution
 * Z3: scoreKeywordMatches      — count pattern hits per intent category
 *     pickTopIntent            — select highest-scored intent above threshold
 *     buildLLMClassifyPrompt   — assemble static system prompt for LLM classifier
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/modelProvider.js';
import {
  ensureJsonPromptHint,
  getProviderOptionsForStructuredOutput,
} from '../lib/structuredOutputHelper.js';
import { getAgentConfig } from '../config/agentConfig.js';
import logger from '../lib/logger.js';

// ── Constants ──────────────────────────────────────────────────────────────────

export const INTENTS = /** @type {const} */ ([
  'narration', // DM narrates the scene / advances story
  'roll',      // Dice roll or battle action
  'state',     // Query or update session state
  'lore',      // Pokémon / world lore lookup
  'design',    // Campaign builder / design mode
]);

/** Minimum keyword score required to bypass LLM fallback (0–1). */
const KEYWORD_CONFIDENCE_THRESHOLD = 0.55;

/**
 * Keyword pattern map.
 * Each entry is an array of regex patterns. A match increments the intent score.
 * Patterns are case-insensitive; order within an array does not matter.
 */
const KEYWORD_MAP = {
  roll: [
    /\broll\b/i, /\bd20\b/i, /\battack\b/i, /\buse\b.{0,20}\bmove\b/i,
    /\bthrow\b.{0,10}\bball\b/i, /\bcatch\b/i, /\bflee\b/i, /\brun\b.{0,10}\baway\b/i,
    /\bfight\b/i, /\bbattle\b/i, /\bhit\b/i, /\bdamage\b/i, /\bice\s*beam\b/i,
    /\buse\b.{0,20}\b(aurora\s*surge|blizzard|outrage|earthquake)\b/i,
  ],
  lore: [
    /\bwhat\s+is\b/i, /\btell\s+me\s+about\b/i, /\bwho\s+is\b/i, /\bwhere\s+is\b/i,
    /\blore\b/i, /\bhistory\b/i, /\bpokedex\b/i, /\btype\b.{0,10}\bweakness/i,
    /\btype\s+chart\b/i, /\blearn\b.{0,15}\bmove\b/i, /\bevolution\b/i, /\beveryone knows\b/i,
    /\babilities?\b/i, /\bbase\s+stats?\b/i, /\bcan\b.{0,10}\blearn\b/i,
  ],
  state: [
    /\bshow\b.{0,15}\b(party|team|status|hp|inventory|bag|pokémon|pokemon)\b/i,
    /\bcheck\b.{0,15}\b(party|team|status|hp|inventory|bag)\b/i,
    /\bmy\b.{0,15}\b(party|team|hp|health|pokémon|pokemon)\b/i,
    /\bhealth\b/i, /\bhow\s+many\s+(hp|health)\b/i, /\bremaining\s+(hp|health)\b/i,
    /\bcurrent\s+(status|state|hp)\b/i, /\binventory\b/i, /\bbag\b/i,
    /\baffinity\b.{0,20}\brank\b/i, /\bxp\b/i, /\bprogress\b/i,
  ],
  design: [
    /\bcreate\b.{0,20}\b(campaign|encounter|npc|location|event)\b/i,
    /\badd\b.{0,20}\b(npc|location|encounter|challenge|gym|boss)\b/i,
    /\bedit\b.{0,20}\b(campaign|encounter|npc|location)\b/i,
    /\bcampaign\s+builder\b/i, /\bdesign\s+mode\b/i, /\bplanning\b/i,
    /\bset\s+up\b.{0,20}\b(session|episode|campaign)\b/i,
    /\bsession\s+brief\b/i, /\bseed\b.{0,10}\b(data|campaign)\b/i,
  ],
};

// ── Intent Schema ──────────────────────────────────────────────────────────────

const IntentSchema = z.object({
  intent: z.enum(INTENTS).describe('The classified intent category'),
  confidence: z.number().min(0).max(1).describe('Confidence (0–1)'),
  secondary_intent: z.enum(INTENTS).nullable().default(null)
    .describe('Second intent if the input has multiple concerns'),
  reasoning: z.string().nullable().describe('Brief reasoning for the classification'),
});

// ── Z1: Orchestrator ───────────────────────────────────────────────────────────

/**
 * Classify user input and return an ordered intent queue.
 *
 * @param {string}  userInput    Raw player text
 * @param {object}  [sessionState]   Current session (unused by keyword pass, available for LLM)
 * @param {string}  [model]      Override model for LLM fallback
 * @returns {Promise<string[]>}  Ordered intent queue, e.g. ['roll', 'lore']
 */
export async function routeIntent(userInput, sessionState, model = null) {
  const keywordResult = classifyByKeywords(userInput);

  if (keywordResult.confidence >= KEYWORD_CONFIDENCE_THRESHOLD) {
    logger.debug('Router: keyword classification', {
      input: userInput.slice(0, 60),
      ...keywordResult,
    });
    return buildIntentQueue(keywordResult.primary, keywordResult.secondary);
  }

  // Low confidence — fall back to LLM
  logger.debug('Router: keyword confidence low, calling LLM', {
    input: userInput.slice(0, 60),
    keywordConfidence: keywordResult.confidence,
  });
  const llmResult = await classifyByLLM(userInput, model);
  return buildIntentQueue(llmResult.intent, llmResult.secondary_intent);
}

// ── Z2: Coordinators ───────────────────────────────────────────────────────────

/**
 * Keyword-based classification pass.
 * Returns primary intent, optional secondary intent, and a confidence score.
 */
export function classifyByKeywords(userInput) {
  const scores = scoreKeywordMatches(userInput);
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);

  const totalHits = sorted.reduce((sum, [, v]) => sum + v, 0);
  if (totalHits === 0) {
    return { primary: 'narration', secondary: null, confidence: 0 };
  }

  const [[primaryIntent, primaryScore], [secondaryIntent, secondaryScore]] = sorted;
  const confidence = primaryScore / totalHits;

  // Only include secondary if it has meaningful signal (≥25% of primary)
  const secondary = secondaryScore >= primaryScore * 0.25 ? secondaryIntent : null;

  // Narration is the default fallback — only surface it explicitly if it scored
  const effectivePrimary = primaryScore === 0 ? 'narration' : primaryIntent;

  return { primary: effectivePrimary, secondary, confidence };
}

/**
 * LLM fallback classifier.
 * Uses a fast, cheap model (haiku/flash) and structured output.
 */
async function classifyByLLM(userInput, modelOverride) {
  const config = getAgentConfig('router');
  const modelName = modelOverride || config.defaultModel;
  const system = buildLLMClassifyPrompt();

  try {
    const result = await generateObject({
      model: await getModel(modelName),
      schema: IntentSchema,
      system: ensureJsonPromptHint(system, modelName),
      messages: [{ role: 'user', content: userInput }],
      maxSteps: 1, // classification should never need tool calls
      providerOptions: getProviderOptionsForStructuredOutput(modelName),
    });

    return result.object;
  } catch (error) {
    logger.error('Router LLM classification error — defaulting to narration', {
      error: error.message,
    });
    return { intent: 'narration', secondary_intent: null, confidence: 0, reasoning: null };
  }
}

/**
 * Build the execution queue from primary + optional secondary intent.
 * Ordering rule: non-narration intents execute before narration (narration is always last).
 *
 * @param {string}      primary
 * @param {string|null} secondary
 * @returns {string[]}
 */
export function buildIntentQueue(primary, secondary) {
  const raw = [primary, secondary].filter(Boolean);
  const deduplicated = [...new Set(raw)];

  // Sort: narration always last; otherwise preserve discovery order
  return deduplicated.sort((a, b) => {
    if (a === 'narration') return 1;
    if (b === 'narration') return -1;
    return 0;
  });
}

// ── Z3: Pure Functions ─────────────────────────────────────────────────────────

/**
 * Count regex hits per intent category for a given input.
 * @returns {{ [intent: string]: number }}
 */
export function scoreKeywordMatches(userInput) {
  const scores = Object.fromEntries(INTENTS.map((i) => [i, 0]));

  for (const [intent, patterns] of Object.entries(KEYWORD_MAP)) {
    for (const pattern of patterns) {
      if (pattern.test(userInput)) {
        scores[intent] += 1;
      }
    }
  }

  return scores;
}

/**
 * Static system prompt for the LLM classifier.
 * Kept minimal — all user content arrives as a user message.
 */
function buildLLMClassifyPrompt() {
  return `You classify player input for a Pokémon tabletop RPG into one of five intents:

- narration  : advancing the story, exploration, dialogue with NPCs
- roll       : battle actions, dice rolls, catching Pokémon, using moves
- state      : checking party status, HP, inventory, affinity rank, XP
- lore       : Pokédex facts, type matchups, move details, world history
- design     : campaign building, adding encounters, editing NPCs (host only)

Return the single best intent plus an optional secondary intent if the input clearly addresses two concerns. Default to narration when uncertain.`;
}
