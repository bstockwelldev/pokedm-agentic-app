/**
 * Model Provider Utility
 * Handles model selection and provider abstraction
 */

import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

/**
 * Get model instance based on model identifier
 * Supports: google/gemini-*, groq/llama-*, groq/mixtral-*
 */
export function getModel(modelName) {
  if (!modelName) {
    throw new Error('Model name is required');
  }

  // Check if it's a Groq model
  if (modelName.startsWith('groq/') || modelName.startsWith('llama-') || modelName.startsWith('mixtral-')) {
    const groqModelName = modelName.replace('groq/', '');
    return groq(groqModelName);
  }

  // Default to Google/Gemini
  return google(modelName);
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
  
  return {
    provider: 'google',
    model: modelIdentifier,
  };
}
