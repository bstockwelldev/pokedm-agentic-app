/**
 * PokeAPI Helper
 * Wraps fetch calls with retry logic, rate limiting, and circuit breaker
 */

import { retryApiCall } from '../lib/retryUtils.js';
import { pokeAPIRateLimiter } from '../lib/rateLimiter.js';
import { pokeAPICircuitBreaker } from '../lib/circuitBreaker.js';

/**
 * Fetch from PokeAPI with retry logic, rate limiting, circuit breaker, and request deduplication
 * @param {string} url - PokeAPI URL
 * @param {string} resourceName - Resource name for error messages (e.g., "Pokémon", "Move")
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchPokeAPI(url, resourceName = 'Resource') {
  // Use request deduplication to prevent duplicate concurrent requests
  return deduplicateRequest(url, async () => {
    // Check circuit breaker
    if (pokeAPICircuitBreaker.isOpen()) {
      throw new Error(`PokeAPI circuit breaker is open. Service temporarily unavailable.`);
    }

    // Check rate limiter
    if (!pokeAPIRateLimiter.isAllowed()) {
      const waitTime = pokeAPIRateLimiter.getTimeUntilNextToken();
      throw new Error(`Rate limit exceeded. Please retry in ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    try {
      const response = await retryApiCall(async () => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`${resourceName} not found: ${url}`);
        }
        return res;
      });

      // Record success
      pokeAPICircuitBreaker.recordSuccess();
      return response;
    } catch (error) {
      // Record failure
      pokeAPICircuitBreaker.recordFailure();
      throw error;
    }
  });
}

export default {
  fetchPokeAPI,
};
