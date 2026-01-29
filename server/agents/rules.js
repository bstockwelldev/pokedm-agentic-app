import { generateText } from 'ai';
import { getModel } from '../lib/modelProvider.js';
import { rulesPrompt } from '../prompts/rules.js';
import { getAgentConfig, getAgentTools } from '../config/agentConfig.js';
import { getPokeAPITools } from '../tools/index.js';
import { wrapToolsWithSession } from './toolHelpers.js';
import { applyProgression } from '../services/progressionService.js';

/**
 * Rules Agent
 * Handles battle mechanics and type effectiveness
 */
export async function runRulesAgent(userInput, session, model = null) {
  const config = getAgentConfig('rules');
  const modelName = model || config.defaultModel;

  // Get available tools for rules agent
  const allTools = getPokeAPITools();
  const agentTools = getAgentTools('rules', allTools);

  // Wrap tools with sessionId if available
  const sessionId = session?.session?.session_id;
  const toolsWithSession = sessionId
    ? wrapToolsWithSession(agentTools, sessionId)
    : agentTools;

  // Build context from session state
  const context = buildRulesContext(session);

  const fullPrompt = `${rulesPrompt}

## Current Session Context

${context}

Session ID: ${sessionId || 'Not provided'}
${sessionId ? 'You can use sessionId when calling tools for caching.' : ''}

## User Input

${userInput}

Calculate the result and provide a simple explanation.`;

  try {
    const result = await generateText({
      model: await getModel(modelName),
      prompt: fullPrompt,
      tools: toolsWithSession,
      maxSteps: config.maxSteps,
    });

    // Check if this was a battle/encounter that should trigger progression
    const battleState = extractBattleState(result.text, session);
    let updatedSession = null;

    // If battle completed, apply progression
    if (battleState && !battleState.active && session.session?.battle_state?.active) {
      // Battle just ended - determine outcome from context
      const battleOutcome = determineBattleOutcome(result.text, session);
      
      const progressionEvent = {
        type: 'battle',
        outcome: battleOutcome,
        participants: battleState.turn_order || [],
        firstTime: false, // Could be enhanced to track first-time battles
        typeAdvantageUsed: false, // Could be enhanced to track type advantage usage
      };

      try {
        updatedSession = applyProgression(session, progressionEvent);
      } catch (progressionError) {
        console.warn('Failed to apply progression:', progressionError);
        // Continue without progression update
      }
    }

    return {
      result: result.text,
      battleState: battleState,
      steps: result.steps || [],
      updatedSession: updatedSession,
    };
  } catch (error) {
    console.error('Rules Agent error:', error);
    throw error;
  }
}

function buildRulesContext(session) {
  let context = '';

  if (session.session?.battle_state?.active) {
    context += `Active Battle: Yes\n`;
    context += `Round: ${session.session.battle_state.round}\n`;
    context += `Turn Order: ${session.session.battle_state.turn_order.length} participants\n\n`;
  }

  if (session.characters && session.characters.length > 0) {
    context += `Party Pokémon:\n`;
    session.characters.forEach((char) => {
      char.pokemon_party.forEach((pokemon) => {
        context += `- ${pokemon.nickname || pokemon.species_ref.ref} (Level ${pokemon.level}, Types: ${pokemon.typing.join('/')})\n`;
      });
    });
    context += '\n';
  }

  if (session.session?.fail_soft_flags) {
    context += `Party Confidence: ${session.session.fail_soft_flags.party_confidence}\n`;
    context += `Recent Failures: ${session.session.fail_soft_flags.recent_failures}\n`;
    context += `Recent Successes: ${session.session.fail_soft_flags.recent_successes}\n\n`;
  }

  return context;
}

function extractBattleState(text, session) {
  // Simple extraction - in production, use structured output
  if (!session.session?.battle_state) {
    return null;
  }

  // Return current battle state (would be updated by state agent)
  return session.session.battle_state;
}

function determineBattleOutcome(text, session) {
  // Simple heuristic to determine battle outcome from text
  const lowerText = text.toLowerCase();
  if (lowerText.includes('win') || lowerText.includes('victory') || lowerText.includes('defeated')) {
    return 'win';
  }
  if (lowerText.includes('lose') || lowerText.includes('defeat') || lowerText.includes('fainted')) {
    return 'loss';
  }
  return 'unknown';
}
