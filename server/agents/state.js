import { generateText } from 'ai';
import { getModel } from '../lib/modelProvider.js';
import { statePrompt } from '../prompts/state.js';
import { getAgentConfig } from '../config/agentConfig.js';
import { PokemonSessionSchema } from '../schemas/session.js';

/**
 * State Agent
 * Sole mutator of session state with schema validation
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

Analyze the request and determine what state updates are needed. Return a JSON object with the updates following the session schema exactly.`;

  try {
    const result = await generateText({
      model: getModel(modelName),
      prompt: fullPrompt,
      maxSteps: config.maxSteps,
    });

    // Parse and validate state updates
    const updates = parseStateUpdates(result.text, session);

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

function parseStateUpdates(text, session) {
  // Try to extract JSON from response
  try {
    // Look for JSON object in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.warn('Could not parse state updates as JSON:', error);
  }

  // Fallback: return empty updates (state agent should use structured output in production)
  return {};
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
  if (updates.custom_dex) {
    merged.custom_dex = deepMerge(merged.custom_dex, updates.custom_dex);
  }
  if (updates.continuity) {
    merged.continuity = deepMerge(merged.continuity, updates.continuity);
  }
  if (updates.campaign) {
    merged.campaign = deepMerge(merged.campaign, updates.campaign);
  }
  if (updates.characters) {
    merged.characters = updates.characters; // Replace array
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
