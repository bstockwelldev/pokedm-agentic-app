/**
 * Rate Limiter
 * Token bucket algorithm for rate limiting PokeAPI calls
 */

/**
 * Token Bucket Rate Limiter
 */
export class RateLimiter {
  constructor(options = {}) {
    this.tokens = options.tokensPerInterval || 100;
    this.tokensPerInterval = options.tokensPerInterval || 100;
    this.intervalMs = options.intervalMs || 60 * 1000; // 1 minute default
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor((elapsed / this.intervalMs) * this.tokensPerInterval);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.tokensPerInterval, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Check if request is allowed
   * @param {number} tokens - Number of tokens to consume (default: 1)
   * @returns {boolean} True if allowed
   */
  isAllowed(tokens = 1) {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  /**
   * Get time until next token is available
   * @returns {number} Milliseconds until next token
   */
  getTimeUntilNextToken() {
    this.refill();
    if (this.tokens >= 1) {
      return 0;
    }
    const tokensNeeded = 1 - this.tokens;
    const timePerToken = this.intervalMs / this.tokensPerInterval;
    return Math.ceil(tokensNeeded * timePerToken);
  }

  /**
   * Reset rate limiter
   */
  reset() {
    this.tokens = this.tokensPerInterval;
    this.lastRefill = Date.now();
  }
}

/**
 * Create a rate limiter instance
 * @param {object} options - Rate limiter options
 * @param {number} options.tokensPerInterval - Tokens per interval (default: 100)
 * @param {number} options.intervalMs - Interval in milliseconds (default: 60000 = 1 minute)
 * @returns {RateLimiter} Rate limiter instance
 */
export function createRateLimiter(options = {}) {
  return new RateLimiter(options);
}

// Default PokeAPI rate limiter: 100 requests per minute
export const pokeAPIRateLimiter = createRateLimiter({
  tokensPerInterval: 100,
  intervalMs: 60 * 1000, // 1 minute
});

export default {
  RateLimiter,
  createRateLimiter,
  pokeAPIRateLimiter,
};
