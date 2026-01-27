import { generateText } from 'ai';
import { getModel } from '../lib/modelProvider.js';
import { getDesignPrompt } from '../prompts/design.js';
import { getAgentConfig, getAgentTools } from '../config/agentConfig.js';
import { getCustomPokemonTools, getPokeAPITools } from '../tools/index.js';
import { wrapToolsWithSession } from './toolHelpers.js';

/**
 * Design Agent
 * Handles custom Pokémon creation following KB rules
 */
export async function createCustomPokemonAgent(userInput, session, model = null) {
  const config = getAgentConfig('design');
  const modelName = model || config.defaultModel;

  // Get available tools
  const customTools = getCustomPokemonTools();
  const pokeAPITools = getPokeAPITools();
  const allTools = {
    ...customTools,
    ...pokeAPITools,
  };
  const agentTools = getAgentTools('design', allTools);

  // Wrap tools with sessionId
  const sessionId = session?.session?.session_id;
  const toolsWithSession = sessionId
    ? wrapToolsWithSession(agentTools, sessionId)
    : agentTools;

  // Determine classification from user input (simple heuristic)
  const classification = extractClassification(userInput);

  // Get KB rules for this classification
  const designPrompt = getDesignPrompt(classification);

  // Build context
  const context = buildDesignContext(session);

  const fullPrompt = `${designPrompt}

## Current Session Context

${context}

Session ID: ${sessionId || 'Not provided'}
${sessionId ? 'You MUST include sessionId when calling createCustomPokemon tool.' : ''}

## User Request

${userInput}

Create the custom Pokémon following all KB rules. Use the createCustomPokemon tool with all required fields. Include sessionId: "${sessionId}" in your tool call.`;

  try {
    const result = await generateText({
      model: getModel(modelName),
      prompt: fullPrompt,
      tools: toolsWithSession,
      maxSteps: config.maxSteps,
    });

    // Check if custom Pokémon was created in the steps
    const createdPokemon = extractCreatedPokemon(result.steps);

    return {
      customPokemon: createdPokemon,
      explanation: result.text,
      steps: result.steps || [],
      updatedSession: null, // Design agent updates via tool, state will be updated separately
    };
  } catch (error) {
    console.error('Design Agent error:', error);
    throw error;
  }
}

function extractClassification(userInput) {
  const lower = userInput.toLowerCase();
  if (lower.includes('regional variant') || lower.includes('regional form')) {
    return 'regional_variant';
  }
  if (lower.includes('regional evolution') || lower.includes('regional evolve')) {
    return 'regional_evolution';
  }
  if (lower.includes('split evolution') || lower.includes('branching evolution')) {
    return 'split_evolution';
  }
  if (lower.includes('convergent') || lower.includes('convergent species')) {
    return 'convergent_species';
  }
  if (lower.includes('new species') || lower.includes('entirely new')) {
    return 'new_species';
  }
  // Default to regional_variant
  return 'regional_variant';
}

function buildDesignContext(session) {
  let context = '';

  if (session.custom_dex?.ruleset_flags) {
    context += `Allow New Species: ${session.custom_dex.ruleset_flags.allow_new_species}\n`;
    context += `Custom Pokémon Count: ${Object.keys(session.custom_dex.pokemon || {}).length}\n\n`;
  }

  if (session.campaign?.region) {
    context += `Campaign Region: ${session.campaign.region.name}\n`;
    context += `Theme: ${session.campaign.region.theme}\n`;
    context += `Environment Tags: ${session.campaign.region.environment_tags.join(', ')}\n\n`;
  }

  return context;
}

function extractCreatedPokemon(steps) {
  // Look for tool calls that created custom Pokémon
  if (!steps) return null;

  for (const step of steps) {
    if (step.stepType === 'tool-call' && step.toolName === 'createCustomPokemon') {
      // Find the corresponding tool result
      const resultStep = steps.find(
        (s) => s.stepType === 'tool-result' && s.toolCallId === step.toolCallId
      );
      if (resultStep?.result?.custom_pokemon) {
        return resultStep.result.custom_pokemon;
      }
    }
  }

  return null;
}
