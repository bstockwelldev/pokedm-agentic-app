/**
 * Retry Utilities
 * Handles retry logic with exponential backoff for API calls
 */

/**
 * Check if an error is a rate limit/quota error
 * @param {Error} error - Error object
 * @returns {object|null} Rate limit info or null
 */
export function isRateLimitError(error) {
  if (!error || !error.message) return null;

  const message = error.message.toLowerCase();
  const details = error.details?.toLowerCase() || '';

  // Check for rate limit indicators
  const rateLimitIndicators = [
    'quota exceeded',
    'rate limit',
    'too many requests',
    '429',
    'please retry in',
    'generativelanguage.googleapis.com/generate_content_free_tier_requests',
  ];

  const hasRateLimit = rateLimitIndicators.some((indicator) =>
    message.includes(indicator) || details.includes(indicator)
  );

  if (!hasRateLimit) return null;

  // Extract retry time from error message
  const retryTimeMatch = error.message.match(/retry in ([\d.]+)s/i) ||
                        error.details?.match(/retry in ([\d.]+)s/i);
  const retryTimeSeconds = retryTimeMatch ? parseFloat(retryTimeMatch[1]) : null;

  return {
    isRateLimit: true,
    retryAfter: retryTimeSeconds,
    message: error.message,
    details: error.details,
  };
}

/**
 * Check if an error is a model not found error
 * @param {Error} error - Error object
 * @returns {boolean} True if model not found error
 */
export function isModelNotFoundError(error) {
  if (!error || !error.message) return false;

  const message = error.message.toLowerCase();
  const details = error.details?.toLowerCase() || '';

  return (
    message.includes('not found') ||
    message.includes('is not found') ||
    message.includes('not supported') ||
    details.includes('not found') ||
    details.includes('not supported')
  );
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry (must return a Promise)
 * @param {object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 30000)
 * @param {number} options.backoffMultiplier - Backoff multiplier (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried (default: retry all errors)
 * @returns {Promise<any>} Result of the function
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Check for rate limit error and use suggested retry time
      const rateLimitInfo = isRateLimitError(error);
      if (rateLimitInfo && rateLimitInfo.retryAfter) {
        // Use the suggested retry time, but cap at maxDelay
        delay = Math.min(rateLimitInfo.retryAfter * 1000, maxDelay);
        console.log(
          `[RETRY] Rate limit detected, waiting ${delay}ms before retry (attempt ${attempt}/${maxAttempts})`
        );
      } else {
        // Use exponential backoff
        delay = Math.min(delay * backoffMultiplier, maxDelay);
        console.log(
          `[RETRY] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`
        );
      }

      await sleep(delay);
    }
  }

  // All attempts failed
  const errorMessage = lastError?.message || 'Unknown error';
  const errorDetails = lastError?.details || '';
  throw new Error(
    `Failed after ${maxAttempts} attempts. Last error: ${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`
  );
}

/**
 * Default retry function for API calls
 * Retries on rate limits and transient errors, but not on model not found errors
 * @param {Function} fn - Function to retry
 * @param {object} options - Retry options
 * @returns {Promise<any>} Result of the function
 */
export async function retryApiCall(fn, options = {}) {
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    shouldRetry: (error, attempt) => {
      // Don't retry model not found errors
      if (isModelNotFoundError(error)) {
        console.log('[RETRY] Model not found error, not retrying');
        return false;
      }

      // Retry rate limit errors
      if (isRateLimitError(error)) {
        return true;
      }

      // Retry transient errors (network, timeout, etc.)
      const message = error?.message?.toLowerCase() || '';
      const transientErrors = [
        'timeout',
        'network',
        'econnreset',
        'etimedout',
        'eai_again',
        'temporary',
        '503',
        '502',
        '504',
      ];

      if (transientErrors.some((err) => message.includes(err))) {
        return true;
      }

      // Don't retry other errors
      return false;
    },
    ...options,
  });
}
