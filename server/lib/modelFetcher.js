/**
 * Model Fetcher Utility
 * Fetches available models from provider APIs (Groq, Gemini)
 */

import { annotateModelsWithStructuredOutputSupport } from './structuredOutputHelper.js';

/** Fallback Gemini models when API is unavailable */
const GEMINI_FALLBACK_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
  { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro (Latest)', provider: 'google' },
  { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (Latest)', provider: 'google' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
];

/** Chat/completion-capable Gemini model name prefix */
const GEMINI_CHAT_PREFIXES = ['gemini-2', 'gemini-1.5', 'gemini-1.0'];

/**
 * Get available Gemini models from API or fallback list
 */
export async function getGeminiModels() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (apiKey && apiKey.trim() !== '' && !apiKey.includes('your-')) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const models = (data.models || [])
          .filter(
            (m) =>
              m.name &&
              GEMINI_CHAT_PREFIXES.some((p) => m.name.includes(p))
          )
          .map((m) => {
            const id = m.name?.replace(/^models\//, '') || m.name;
            return {
              id,
              name: m.displayName || id,
              provider: 'google',
            };
          });
        if (models.length > 0) {
          return models;
        }
      }
    } catch (err) {
      console.warn('[MODELS] Gemini API fetch failed, using fallback:', err.message);
    }
  }
  return [...GEMINI_FALLBACK_MODELS];
}

/** Fallback Groq models (default first; includes structured-output–capable) */
const GROQ_FALLBACK_MODELS = [
  { id: 'groq/llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Groq)', provider: 'groq' },
  { id: 'groq/llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Groq)', provider: 'groq' },
  { id: 'groq/llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile (Groq)', provider: 'groq' },
  { id: 'groq/mixtral-8x7b-32768', name: 'Mixtral 8x7B 32K (Groq)', provider: 'groq' },
  { id: 'groq/llama-3.2-90b-text-preview', name: 'Llama 3.2 90B Text Preview (Groq)', provider: 'groq' },
  { id: 'groq/llama-3.2-11b-text-preview', name: 'Llama 3.2 11B Text Preview (Groq)', provider: 'groq' },
  { id: 'groq/openai/gpt-oss-20b', name: 'GPT OSS 20B (Groq)', provider: 'groq' },
  { id: 'groq/openai/gpt-oss-120b', name: 'GPT OSS 120B (Groq)', provider: 'groq' },
  { id: 'groq/meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B (Groq)', provider: 'groq' },
  { id: 'groq/meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B (Groq)', provider: 'groq' },
];

function isWantedGroqModelId(id) {
  return (
    (id && typeof id === 'string') &&
    (id.startsWith('llama') ||
      id.startsWith('mixtral') ||
      id.startsWith('gemma') ||
      id.startsWith('openai/') ||
      id.startsWith('meta-llama/') ||
      id.startsWith('moonshotai/'))
  );
}

/**
 * Get available Groq models from API or fallback list
 */
export async function getGroqModels() {
  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey && apiKey !== 'your-groq-api-key-here' && apiKey.trim() !== '') {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (response.ok) {
        const data = await response.json();
        const apiModels = (data.data || [])
          .filter((model) => model.id && isWantedGroqModelId(model.id))
          .map((model) => ({
            id: `groq/${model.id}`,
            name: `${model.id} (Groq)`,
            provider: 'groq',
          }));

        if (apiModels.length > 0) {
          return annotateModelsWithStructuredOutputSupport(apiModels);
        }
      }
    } catch (error) {
      console.warn('[MODELS] Groq API fetch failed, using fallback:', error.message);
    }
  }

  return annotateModelsWithStructuredOutputSupport([...GROQ_FALLBACK_MODELS]);
}

/**
 * Get all available models from all providers (Groq first, then Gemini)
 */
export async function getAllModels() {
  try {
    const [groqModels, geminiModels] = await Promise.all([
      getGroqModels(),
      getGeminiModels(),
    ]);

    const allModels = [...groqModels, ...annotateModelsWithStructuredOutputSupport(geminiModels)];
    return allModels;
  } catch (error) {
    console.error('[MODELS] Error fetching all models:', error);
    const groqModels = await getGroqModels().catch(() => []);
    const geminiModels = await getGeminiModels().catch(() => []);
    return [...groqModels, ...annotateModelsWithStructuredOutputSupport(geminiModels)];
  }
}
