/**
 * Model Validator
 * Validates and normalizes model names
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
};

// Valid model patterns
const VALID_MODEL_PATTERNS = {
  google: [
    /^gemini-1\.5-(flash|pro)$/,
    /^gemini-2\.0-flash-exp$/,
    /^gemini-2\.5-(flash|pro)$/,
  ],
  groq: [
    /^groq\/llama-3\.(1|2|3)-/,
    /^groq\/mixtral-/,
  ],
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
  if (
    (normalized.startsWith('llama-') || normalized.startsWith('mixtral-')) &&
    !normalized.startsWith('groq/')
  ) {
    normalized = `groq/${normalized}`;
  }

  return normalized;
}

/**
 * Validate model name against known patterns
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

  // Fallback: validate against patterns
  const isGroq = normalized.startsWith('groq/');
  const provider = isGroq ? 'groq' : 'google';
  const modelWithoutPrefix = isGroq ? normalized.replace('groq/', '') : normalized;

  const patterns = VALID_MODEL_PATTERNS[provider] || [];
  const isValid = patterns.some((pattern) => pattern.test(modelWithoutPrefix));

  if (isValid) {
    return {
      valid: true,
      normalized,
      original: modelName,
    };
  }

  return {
    valid: false,
    error: `Model "${modelName}" does not match known patterns for ${provider} models`,
    normalized,
    original: modelName,
  };
}

/**
 * Get fallback model when primary model fails
 * @param {string} failedModel - Model that failed
 * @param {Array} availableModels - List of available models
 * @returns {string|null} Fallback model name or null
 */
export function getFallbackModel(failedModel, availableModels = []) {
  if (!availableModels || availableModels.length === 0) {
    return null;
  }

  const normalized = normalizeModelName(failedModel);
  const isGroq = normalized?.startsWith('groq/');
  const provider = isGroq ? 'groq' : 'google';

  // Try to find a model from the same provider first
  const sameProviderModels = availableModels.filter(
    (m) => (m.provider || '').toLowerCase() === provider
  );

  if (sameProviderModels.length > 0) {
    // Prefer different model from same provider
    const differentModel = sameProviderModels.find(
      (m) => (m.id || m) !== normalized
    );
    if (differentModel) {
      return differentModel.id || differentModel;
    }
  }

  // Fallback to any available model
  const anyModel = availableModels.find((m) => (m.id || m) !== normalized);
  return anyModel ? anyModel.id || anyModel : null;
}
