/**
 * Structured Output Helper
 * Determines provider options for generateObject based on model capability.
 * Groq: only specific models support json_schema; others use JSON Object Mode.
 * @see https://console.groq.com/docs/structured-outputs#supported-models
 */

/** Groq API model IDs that support Structured Outputs (json_schema), strict or best-effort */
const GROQ_STRUCTURED_OUTPUT_MODEL_IDS = new Set([
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-safeguard-20b',
  'moonshotai/kimi-k2-instruct-0905',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
]);

/** Model prefixes that should be treated as Groq identifiers when unprefixed. */
const GROQ_MODEL_PREFIXES = [
  'groq/',
  'llama-',
  'mixtral-',
  'openai/',
  'meta-llama/',
  'moonshotai/',
];

/**
 * Get the raw Groq model ID (without groq/ prefix)
 * @param {string} modelName - e.g. 'groq/llama-3.1-8b-instant'
 * @returns {string} e.g. 'llama-3.1-8b-instant'
 */
function getGroqModelId(modelName) {
  if (!modelName || typeof modelName !== 'string') return '';
  return modelName.replace(/^groq\//, '').trim();
}

/**
 * Whether the supplied model name should be treated as Groq.
 * Supports both canonical "groq/..." and common unprefixed Groq IDs.
 * @param {string} modelName
 * @returns {boolean}
 */
function isGroqModelName(modelName) {
  if (!modelName || typeof modelName !== 'string') return false;
  return GROQ_MODEL_PREFIXES.some((prefix) => modelName.startsWith(prefix));
}

/**
 * Whether this Groq model supports json_schema (Structured Outputs)
 * @param {string} modelName - Model identifier (e.g. groq/llama-3.1-8b-instant)
 * @returns {boolean}
 */
export function supportsGroqStructuredOutput(modelName) {
  if (!isGroqModelName(modelName)) return false;
  const groqId = getGroqModelId(modelName);
  return groqId.length > 0 && GROQ_STRUCTURED_OUTPUT_MODEL_IDS.has(groqId);
}

/**
 * Provider options for generateObject. For Groq models that do NOT support
 * json_schema, we set structuredOutputs: false to use JSON Object Mode instead.
 * @param {string} modelName - Model identifier (e.g. groq/llama-3.1-8b-instant)
 * @returns {object} providerOptions to pass to generateObject
 */
export function getProviderOptionsForStructuredOutput(modelName) {
  if (!modelName || typeof modelName !== 'string') return {};
  if (!isGroqModelName(modelName)) return {};
  if (supportsGroqStructuredOutput(modelName)) return {};
  return { groq: { structuredOutputs: false } };
}

/**
 * Whether prompt text must explicitly include "json" for provider compatibility.
 * Groq JSON Object Mode rejects requests that do not mention JSON in messages.
 * @param {string} modelName
 * @returns {boolean}
 */
export function requiresJsonPromptHint(modelName) {
  return isGroqModelName(modelName) && !supportsGroqStructuredOutput(modelName);
}

/**
 * Ensure the prompt contains the "json" keyword when required by provider mode.
 * @param {string} prompt
 * @param {string} modelName
 * @returns {string}
 */
export function ensureJsonPromptHint(prompt, modelName) {
  if (typeof prompt !== 'string') return prompt;
  if (!requiresJsonPromptHint(modelName)) return prompt;
  if (/\bjson\b/i.test(prompt)) return prompt;
  return `${prompt}\n\nReturn a valid json object that matches the required schema.`;
}

/**
 * Annotate a list of models with supportsStructuredOutput (for Groq only)
 * @param {Array<{id: string, name?: string, provider: string}>} models
 * @returns {Array<{id: string, name?: string, provider: string, supportsStructuredOutput?: boolean}>}
 */
export function annotateModelsWithStructuredOutputSupport(models) {
  if (!Array.isArray(models)) return models;
  return models.map((m) => {
    const id = m.id || m;
    const provider = (m.provider || '').toLowerCase();
    const supportsStructuredOutput =
      provider === 'groq' ? supportsGroqStructuredOutput(id) : true;
    return { ...m, id, supportsStructuredOutput };
  });
}

export default {
  supportsGroqStructuredOutput,
  getProviderOptionsForStructuredOutput,
  requiresJsonPromptHint,
  ensureJsonPromptHint,
  annotateModelsWithStructuredOutputSupport,
  GROQ_STRUCTURED_OUTPUT_MODEL_IDS: [...GROQ_STRUCTURED_OUTPUT_MODEL_IDS],
};
