import { generateText } from 'ai';
import { getModel } from '../lib/modelProvider.js';
import { lorePrompt } from '../prompts/lore.js';
import { getAgentConfig, getAgentTools } from '../config/agentConfig.js';
import { getPokeAPITools, getCustomPokemonTools } from '../tools/index.js';
import { wrapToolsWithSession } from './toolHelpers.js';

/**
 * Lore Agent
 * Handles PokeAPI lookups with kid-friendly simplification
 */
export async function fetchLore(userInput, session, model = null) {
  const config = getAgentConfig('lore');
  const modelName = model || config.defaultModel;

  // Get available tools for lore agent
  const allTools = {
    ...getPokeAPITools(),
    ...getCustomPokemonTools(),
  };
  const agentTools = getAgentTools('lore', allTools);

  // Wrap tools with sessionId
  const sessionId = session?.session?.session_id;
  const toolsWithSession = sessionId
    ? wrapToolsWithSession(agentTools, sessionId)
    : agentTools;

  const fullPrompt = `${lorePrompt}

## Session Context

Session ID: ${sessionId || 'Not provided'}
${sessionId ? 'Use this sessionId when calling tools for caching.' : 'Tools will work without caching.'}

## User Query

${userInput}

Look up the requested Pokémon data and return simplified, kid-friendly information.`;

  try {
    const result = await generateText({
      model: getModel(modelName),
      prompt: fullPrompt,
      tools: toolsWithSession,
      maxSteps: config.maxSteps,
    });

    return {
      data: result.text,
      steps: result.steps || [],
      updatedSession: null, // Lore agent doesn't mutate state
    };
  } catch (error) {
    console.error('Lore Agent error:', error);
    throw error;
  }
}
