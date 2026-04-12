import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/modelProvider.js';
import {
  ensureJsonPromptHint,
  getProviderOptionsForStructuredOutput,
} from '../lib/structuredOutputHelper.js';
import { routerPrompt } from '../prompts/router.js';
import { getAgentConfig } from '../config/agentConfig.js';
import logger from '../lib/logger.js';

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
 * Classifies user intent and routes to appropriate agent using structured output.
 *
 * Security note: userInput is passed as a user-role message, not interpolated
 * into the system prompt, preventing prompt injection via player chat.
 */
export async function routeIntent(userInput, sessionState, model = null) {
  const config = getAgentConfig('router');
  const modelName = model || config.defaultModel;

  // System instructions are static — user content flows in as a separate message.
  const system = ensureJsonPromptHint(routerPrompt, modelName);

  try {
    const result = await generateObject({
      model: await getModel(modelName),
      schema: IntentSchema,
      system,
      messages: [{ role: 'user', content: userInput }],
      maxSteps: config.maxSteps,
      providerOptions: getProviderOptionsForStructuredOutput(modelName),
    });

    return result.object.intent;
  } catch (error) {
    // Intentional fallback: narration is the safest default when classification fails.
    logger.error('Router Agent error — defaulting to narration', { error: error.message });
    return 'narration';
  }
}
