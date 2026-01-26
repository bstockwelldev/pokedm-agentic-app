import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { routerPrompt } from '../prompts/router.js';
import { getAgentConfig } from '../config/agentConfig.js';

/**
 * Router Agent
 * Classifies user intent and routes to appropriate agent
 */
export async function routeIntent(userInput, sessionState, model = null) {
  const config = getAgentConfig('router');
  const modelName = model || config.defaultModel;

  try {
    const result = await generateText({
      model: google(modelName),
      prompt: routerPrompt.replace('{userInput}', userInput),
      maxSteps: config.maxSteps,
    });

    // Extract intent from response (should be one word)
    const intent = result.text.trim().toLowerCase();
    
    // Validate intent
    const validIntents = ['narration', 'roll', 'state', 'lore', 'design'];
    if (validIntents.includes(intent)) {
      return intent;
    }

    // Fallback: try to extract intent from text
    for (const validIntent of validIntents) {
      if (result.text.toLowerCase().includes(validIntent)) {
        return validIntent;
      }
    }

    // Default to narration if unclear
    return 'narration';
  } catch (error) {
    console.error('Router Agent error:', error);
    // Default to narration on error
    return 'narration';
  }
}
