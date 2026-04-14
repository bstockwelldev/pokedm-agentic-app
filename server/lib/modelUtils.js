/**
 * Model Utilities — STO-28
 *
 * Centralises two cross-cutting concerns:
 *   1. resolveModel()        — pick the right model string for a given agent + context
 *   2. classifyAgentError()  — categorise AI SDK errors into actionable error classes
 *
 * Both are pure functions (no I/O) so they're easy to unit-test and safe to
 * call from any agent, route handler, or middleware.
 *
 * Model tiers:
 *   fast   — haiku / flash / llama-3.1-8b   (classification, routing, short ops)
 *   smart  — sonnet / pro / llama-3.3-70b   (narration, lore, DM responses)
 *   vision — gemini-2.0-flash / claude-3-5  (image + voice, if needed)
 *
 * Error classes:
 *   RATE_LIMIT   — 429 / quota exceeded
 *   CONTEXT      — context window exceeded
 *   AUTH         — bad API key / not authorised
 *   SCHEMA       — structured output parse failure
 *   TIMEOUT      — inference timeout / network error
 *   UNKNOWN      — anything else
 */

// ── Model Resolution ───────────────────────────────────────────────────────────

/**
 * Model tier overrides per agent role.
 * Values are env var names; if unset, the tier default applies.
 */
const AGENT_MODEL_ENV = {
  router:    'ROUTER_MODEL',
  dm:        'DM_MODEL',
  lore:      'LORE_MODEL',
  rules:     'RULES_MODEL',
  state:     'STATE_MODEL',
  design:    'DESIGN_MODEL',
};

/** Tier defaults — first value in each array is the env var, second is the fallback. */
const TIER_DEFAULTS = {
  fast:   process.env.FAST_MODEL   || 'groq/llama-3.1-8b-instant',
  smart:  process.env.SMART_MODEL  || 'groq/llama-3.3-70b-versatile',
  vision: process.env.VISION_MODEL || 'gemini-2.0-flash',
};

/** Which tier each agent belongs to by default. */
const AGENT_TIER = {
  router: 'fast',
  state:  'fast',
  dm:     'smart',
  lore:   'smart',
  rules:  'smart',
  design: 'smart',
};

/**
 * Resolve the model string to use for a given agent.
 *
 * Resolution order:
 *   1. `override` argument (passed explicitly by the caller)
 *   2. Per-agent env var (e.g. DM_MODEL)
 *   3. Tier default env var (e.g. SMART_MODEL)
 *   4. Hard-coded tier fallback
 *
 * @param {string}       agentRole   e.g. "dm", "router", "lore"
 * @param {string|null}  [override]  Explicit model string from request
 * @returns {string}     Model identifier string
 */
export function resolveModel(agentRole, override = null) {
  if (override) return override;

  const envKey = AGENT_MODEL_ENV[agentRole];
  if (envKey && process.env[envKey]) return process.env[envKey];

  const tier = AGENT_TIER[agentRole] || 'smart';
  return TIER_DEFAULTS[tier];
}

// ── Error Classification ───────────────────────────────────────────────────────

/** Canonical error class strings returned by classifyAgentError. */
export const ERROR_CLASS = {
  RATE_LIMIT: 'RATE_LIMIT',
  CONTEXT:    'CONTEXT',
  AUTH:       'AUTH',
  SCHEMA:     'SCHEMA',
  TIMEOUT:    'TIMEOUT',
  UNKNOWN:    'UNKNOWN',
};

/**
 * Classify an AI SDK error into an actionable error class.
 *
 * Callers use the result to decide retry strategy, fallback model, or user message.
 *
 * @param {Error|unknown} error
 * @returns {{ errorClass: string, retryable: boolean, message: string }}
 */
export function classifyAgentError(error) {
  if (!error) return { errorClass: ERROR_CLASS.UNKNOWN, retryable: false, message: 'Unknown error' };

  const msg = (error.message || '').toLowerCase();
  const status = error.status ?? error.statusCode ?? error.code;

  // Rate limit / quota
  if (
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('too many requests')
  ) {
    return {
      errorClass: ERROR_CLASS.RATE_LIMIT,
      retryable: true,
      message: 'Rate limit exceeded — retry after backoff.',
    };
  }

  // Context window exceeded
  if (
    msg.includes('context length') ||
    msg.includes('context window') ||
    msg.includes('max tokens') ||
    msg.includes('token limit') ||
    msg.includes('input too long')
  ) {
    return {
      errorClass: ERROR_CLASS.CONTEXT,
      retryable: false,
      message: 'Context window exceeded — reduce prompt or summarize session history.',
    };
  }

  // Auth / API key
  if (
    status === 401 ||
    status === 403 ||
    msg.includes('api key') ||
    msg.includes('unauthorized') ||
    msg.includes('authentication') ||
    msg.includes('forbidden')
  ) {
    return {
      errorClass: ERROR_CLASS.AUTH,
      retryable: false,
      message: 'Authentication error — check API key configuration.',
    };
  }

  // Structured output parse failure
  if (
    msg.includes('schema') ||
    msg.includes('parse') ||
    msg.includes('json') ||
    msg.includes('structured output') ||
    msg.includes('zod')
  ) {
    return {
      errorClass: ERROR_CLASS.SCHEMA,
      retryable: true,
      message: 'Structured output parse failure — retry with text fallback.',
    };
  }

  // Timeout / network
  if (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound') ||
    status === 408 ||
    status === 504
  ) {
    return {
      errorClass: ERROR_CLASS.TIMEOUT,
      retryable: true,
      message: 'Request timed out — retry with exponential backoff.',
    };
  }

  return {
    errorClass: ERROR_CLASS.UNKNOWN,
    retryable: false,
    message: error.message || 'An unexpected error occurred.',
  };
}
