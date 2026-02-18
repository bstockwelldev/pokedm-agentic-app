import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/modelProvider.js';
import {
  ensureJsonPromptHint,
  getProviderOptionsForStructuredOutput,
} from '../lib/structuredOutputHelper.js';
import { statePrompt } from '../prompts/state.js';
import { getAgentConfig } from '../config/agentConfig.js';
import { PokemonSessionSchema } from '../schemas/session.js';

/**
 * Partial State Update Schema
 * Represents partial updates to session state
 */
const StateUpdateSchema = z.object({
  session: z.object({
    player_choices: z.object({
      options_presented: z.array(z.object({
        option_id: z.string(),
        label: z.string(),
        description: z.string(),
        risk_level: z.enum(['low', 'medium', 'high']),
      })).optional(),
      safe_default: z.string().optional(),
      last_choice: z.object({
        option_id: z.string(),
        timestamp: z.string(),
      }).optional(),
    }).optional(),
    battle_state: z.object({
      active: z.boolean().optional(),
      encounter_id: z.string().optional(),
      round: z.number().int().min(0).optional(),
      turn_order: z.array(z.object({
        slot: z.number().int().min(1),
        participant_kind: z.enum(['party_pokemon', 'wild_pokemon', 'npc_pokemon']),
        ref: z.string(),
        fainted: z.boolean(),
      })).optional(),
      field_effects: z.array(z.string()).optional(),
      last_action_summary: z.string().optional(),
    }).optional(),
    fail_soft_flags: z.object({
      recent_failures: z.number().int().min(0).optional(),
      recent_successes: z.number().int().min(0).optional(),
      difficulty_adjusted: z.boolean().optional(),
      party_confidence: z.enum(['low', 'medium', 'high']).optional(),
      auto_scaled_last_encounter: z.boolean().optional(),
    }).optional(),
    scene: z.object({
      location_id: z.string().optional(),
      description: z.string().optional(),
      mood: z.enum(['calm', 'tense', 'adventurous']).optional(),
    }).optional(),
    current_objectives: z.array(z.object({
      objective_id: z.string(),
      description: z.string(),
      status: z.enum(['active', 'completed', 'failed_soft']),
      notes: z.string().optional(),
    })).optional(),
    event_log: z.array(z.object({
      t: z.string(),
      kind: z.enum(['scene', 'choice', 'encounter', 'battle', 'discovery', 'reward', 'recap']),
      summary: z.string(),
      details: z.string().optional(),
    })).optional(),
  }).optional(),
  continuity: z.object({
    timeline: z.array(z.object({
      session_id: z.string(),
      episode_title: z.string(),
      summary: z.string(),
      canonized: z.boolean(),
      date: z.string(),
      tags: z.array(z.string()),
    })).optional(),
    discovered_pokemon: z.array(z.object({
      species_ref: z.object({
        kind: z.enum(['canon', 'custom']),
        ref: z.string(),
      }),
      form_ref: z.object({
        kind: z.enum(['none', 'regional_variant', 'regional_evolution', 'split_evolution', 'convergent_species', 'new_species']),
        region: z.string().optional(),
        lore: z.string().optional(),
        base_canon_ref: z.string().optional(),
      }),
      first_seen_location_id: z.string(),
      first_seen_session_id: z.string(),
      notes: z.string().optional(),
    })).optional(),
    unresolved_hooks: z.array(z.object({
      hook_id: z.string(),
      description: z.string(),
      urgency: z.enum(['low', 'medium', 'high']),
      introduced_in_session_id: z.string(),
      linked_faction_id: z.string().optional(),
      linked_location_id: z.string().optional(),
      status: z.enum(['open', 'progressed', 'resolved']),
    })).optional(),
  }).optional(),
}).describe('Partial state updates following the session schema');

/**
 * State Agent
 * Sole mutator of session state with schema validation using structured output
 */
export async function queryStateAgent(userInput, session, model = null) {
  const config = getAgentConfig('state');
  const modelName = model || config.defaultModel;

  // Build context from current session state
  const context = buildStateContext(session);

  const fullPrompt = `${statePrompt}

## Current Session State

${context}

## User Request

${userInput}

Analyze the request and determine what state updates are needed. Return only the fields that need to be updated, following the session schema exactly.`;
  const prompt = ensureJsonPromptHint(fullPrompt, modelName);

  try {
    const providerOptions = getStateProviderOptions(modelName);
    const result = await generateObject({
      model: await getModel(modelName),
      schema: StateUpdateSchema,
      prompt,
      maxSteps: config.maxSteps,
      providerOptions,
    });

    // Get updates from structured output
    const updates = result.object;

    // Merge updates into session
    const updatedSession = mergeStateUpdates(session, updates);

    // Validate final session
    const validated = PokemonSessionSchema.parse(updatedSession);

    return {
      updatedSession: validated,
      changes: updates,
      steps: result.steps || [],
    };
  } catch (error) {
    console.error('State Agent error:', error);
    throw new Error(`State update failed: ${error.message}`);
  }
}

function buildStateContext(session) {
  // Provide relevant state context without exposing full structure
  return JSON.stringify(
    {
      session_id: session.session?.session_id,
      current_location: session.session?.scene?.location_id,
      battle_active: session.session?.battle_state?.active,
      party_size: session.characters?.reduce((sum, c) => sum + c.pokemon_party.length, 0) || 0,
      objectives_count: session.session?.current_objectives?.length || 0,
    },
    null,
    2
  );
}

// parseStateUpdates function removed - now using structured output

function getStateProviderOptions(modelName) {
  const options = getProviderOptionsForStructuredOutput(modelName);
  if (typeof modelName === 'string' && modelName.startsWith('groq/')) {
    return {
      ...options,
      groq: {
        ...(options.groq || {}),
        structuredOutputs: false,
      },
    };
  }
  return options;
}

function mergeStateUpdates(session, updates) {
  // Deep merge updates into session
  const merged = JSON.parse(JSON.stringify(session));

  // Deep merge helper
  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  // Merge updates
  if (updates.session) {
    merged.session = deepMerge(merged.session, updates.session);
  }
  if (updates.continuity) {
    merged.continuity = deepMerge(merged.continuity, updates.continuity);
  }

  return merged;
}

/**
 * Update specific state fields (called by other agents)
 */
export function updateSessionState(session, updates) {
  try {
    const merged = mergeStateUpdates(session, updates);
    return PokemonSessionSchema.parse(merged);
  } catch (error) {
    throw new Error(`State update validation failed: ${error.message}`);
  }
}
