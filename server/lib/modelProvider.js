/**
 * Model Provider Utility
 * Handles model selection and provider abstraction
 */

import { google } from '@ai-sdk/google';

// Lazy load Groq to avoid errors if package is not installed
let groqModule = null;
async function getGroq() {
  if (!groqModule) {
    try {
      groqModule = await import('@ai-sdk/groq');
    } catch (error) {
      throw new Error(`Groq SDK not available: ${error.message}. Install @ai-sdk/groq package to use Groq models.`);
    }
  }
  return groqModule.groq;
}

/**
 * Get model instance based on model identifier
 * Supports: google/gemini-*, groq/llama-*, groq/mixtral-*
 */
export async function getModel(modelName) {
  if (!modelName) {
    throw new Error('Model name is required');
  }

  // Check if it's a Groq model
  if (modelName.startsWith('groq/') || modelName.startsWith('llama-') || modelName.startsWith('mixtral-')) {
    const groqModelName = modelName.replace('groq/', '');
    const groq = await getGroq();
    return groq(groqModelName);
  }

  // Google Gemini — @ai-sdk/google expects model id only (e.g. gemini-2.5-flash), not google/ prefix
  const geminiModelName = modelName.startsWith('google/')
    ? modelName.replace(/^google\//, '')
    : modelName;
  return google(geminiModelName);
}

/**
 * Parse model identifier to extract provider and model name
 */
export function parseModel(modelIdentifier) {
  if (modelIdentifier.startsWith('groq/')) {
    return {
      provider: 'groq',
      model: modelIdentifier.replace('groq/', ''),
    };
  }

  const googleId = modelIdentifier.startsWith('google/')
    ? modelIdentifier.replace(/^google\//, '')
    : modelIdentifier;
  return {
    provider: 'google',
    model: googleId,
  };
}
