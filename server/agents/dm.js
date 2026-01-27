import { generateText } from 'ai';
import { getModel } from '../lib/modelProvider.js';
import { dmPrompt } from '../prompts/dm.js';
import { getAgentConfig } from '../config/agentConfig.js';
import { updateSessionState } from './state.js';

/**
 * DM Agent
 * Handles narration and choices
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
    const result = await generateText({
      model: await getModel(modelName),
      prompt: fullPrompt,
      maxSteps: config.maxSteps,
    });

    const choices = extractChoices(result.text);
    
    // Update session state with presented choices
    let updatedSession = null;
    if (choices.length > 0) {
      try {
        updatedSession = updateSessionState(session, {
          session: {
            player_choices: {
              options_presented: choices,
              safe_default: choices[0]?.option_id || null,
            },
          },
        });
      } catch (error) {
        console.warn('Failed to update session state with choices:', error);
        // Continue without state update
      }
    }

    return {
      narration: result.text,
      choices: choices,
      steps: result.steps || [],
      updatedSession: updatedSession,
    };
  } catch (error) {
    console.error('DM Agent error:', error);
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

function extractChoices(text) {
  // Simple extraction - look for numbered or lettered options
  const choicePattern = /(?:^|\n)[\s]*([1-4]|[a-d])[\.\)]\s*(.+?)(?=\n(?:[1-4]|[a-d])[\.\)]|$)/gi;
  const matches = [...text.matchAll(choicePattern)];
  
  if (matches.length >= 2) {
    return matches.slice(0, 4).map((match, index) => ({
      option_id: `option_${index + 1}`,
      label: match[2].trim(),
      description: match[2].trim(),
      risk_level: 'low', // Default, could be enhanced
    }));
  }

  // Fallback: return default choices
  return [
    { option_id: 'option_1', label: 'Continue', description: 'Continue the adventure', risk_level: 'low' },
    { option_id: 'option_2', label: 'Explore', description: 'Explore the area', risk_level: 'low' },
  ];
}
