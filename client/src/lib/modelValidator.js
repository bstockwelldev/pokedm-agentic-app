/**
 * Model Validator (Client-side)
 * Validates and normalizes model names on the frontend
 */

// Model name mappings for normalization
const MODEL_NAME_MAPPINGS = {
  // Gemini model mappings
  'gemini-1.5-flash-latest': 'gemini-1.5-flash',
  'gemini-1.5-pro-latest': 'gemini-1.5-pro',
  'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
  'gemini-2.5-flash-latest': 'gemini-2.5-flash',
  'gemini-2.5-pro-latest': 'gemini-2.5-pro',
  // Groq model mappings (already prefixed with groq/)
  'llama-3.1-8b-instant': 'groq/llama-3.1-8b-instant',
  'llama-3.1-70b-versatile': 'groq/llama-3.1-70b-versatile',
  'llama-3.3-70b-versatile': 'groq/llama-3.3-70b-versatile',
  'mixtral-8x7b-32768': 'groq/mixtral-8x7b-32768',
  'openai/gpt-oss-20b': 'groq/openai/gpt-oss-20b',
  'openai/gpt-oss-120b': 'groq/openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct': 'groq/meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct': 'groq/meta-llama/llama-4-maverick-17b-128e-instruct',
  'moonshotai/kimi-k2-instruct-0905': 'groq/moonshotai/kimi-k2-instruct-0905',
};

/**
 * Normalize model name (remove -latest suffix, add groq/ prefix if needed)
 * @param {string} modelName - Model name to normalize
 * @returns {string} Normalized model name
 */
export function normalizeModelName(modelName) {
  if (!modelName || typeof modelName !== 'string') {
    return null;
  }

  // Check mapping first
  if (MODEL_NAME_MAPPINGS[modelName]) {
    return MODEL_NAME_MAPPINGS[modelName];
  }

  // Remove -latest suffix
  let normalized = modelName.replace(/-latest$/, '');

  // Add groq/ prefix if it's a Groq model without prefix
  if (!normalized.startsWith('groq/')) {
    if (
      normalized.startsWith('llama-') ||
      normalized.startsWith('mixtral-') ||
      normalized.startsWith('openai/') ||
      normalized.startsWith('meta-llama/') ||
      normalized.startsWith('moonshotai/')
    ) {
      normalized = `groq/${normalized}`;
    }
  }

  return normalized;
}

/**
 * Validate model name against available models
 * @param {string} modelName - Model name to validate
 * @param {Array} availableModels - List of available models from /api/models
 * @returns {object} Validation result
 */
export function validateModelName(modelName, availableModels = []) {
  if (!modelName || typeof modelName !== 'string') {
    return {
      valid: false,
      error: 'Model name is required',
      normalized: null,
    };
  }

  // Normalize the model name
  const normalized = normalizeModelName(modelName);

  // If we have available models, check against them
  if (availableModels && availableModels.length > 0) {
    const modelIds = availableModels.map((m) => m.id || m);
    if (modelIds.includes(normalized)) {
      return {
        valid: true,
        normalized,
        original: modelName,
      };
    }

    // Check if normalized version exists
    if (modelIds.includes(normalized)) {
      return {
        valid: true,
        normalized,
        original: modelName,
        warning: `Model name normalized from "${modelName}" to "${normalized}"`,
      };
    }

    return {
      valid: false,
      error: `Model "${modelName}" (normalized: "${normalized}") is not available. Available models: ${modelIds.slice(0, 5).join(', ')}${modelIds.length > 5 ? '...' : ''}`,
      normalized,
      original: modelName,
      availableModels: modelIds,
    };
  }

  // If no available models, just normalize
  return {
    valid: true,
    normalized,
    original: modelName,
    warning: 'Model validation skipped - no available models list',
  };
}

/**
 * Filter available models to only show valid ones
 * @param {Array} availableModels - List of available models
 * @returns {Array} Filtered list of valid models
 */
export function filterValidModels(availableModels = []) {
  if (!availableModels || availableModels.length === 0) {
    return [];
  }

  // Filter out models with -latest suffix (they should be normalized)
  return availableModels.filter((model) => {
    const id = model.id || model;
    // Keep models that don't have -latest suffix or are already normalized
    return !id.endsWith('-latest') || MODEL_NAME_MAPPINGS[id];
  });
}
