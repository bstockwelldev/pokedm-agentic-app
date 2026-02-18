import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/modelProvider.js';
import { getProviderOptionsForStructuredOutput } from '../lib/structuredOutputHelper.js';
import { routerPrompt } from '../prompts/router.js';
import { getAgentConfig } from '../config/agentConfig.js';

/**
 * Intent classification schema
 */
const IntentSchema = z.object({
  intent: z.enum(['narration', 'roll', 'state', 'lore', 'design']).describe('The classified intent category'),
  confidence: z.number().min(0).max(1).describe('Confidence level of the classification (0-1)'),
  reasoning: z.string().nullable().describe('Brief reasoning for the classification'),
});

/**
 * Router Agent
 * Classifies user intent and routes to appropriate agent using structured output
 */
export async function routeIntent(userInput, sessionState, model = null) {
  const config = getAgentConfig('router');
  const modelName = model || config.defaultModel;

  try {
    const result = await generateObject({
      model: await getModel(modelName),
      schema: IntentSchema,
      prompt: routerPrompt.replace('{userInput}', userInput),
      maxSteps: config.maxSteps,
      providerOptions: getProviderOptionsForStructuredOutput(modelName),
    });

    // Return the classified intent
    return result.object.intent;
  } catch (error) {
    console.error('Router Agent error:', error);
    // Default to narration on error
    return 'narration';
  }
}
