/**
 * Circuit Breaker pattern implementation for preventing cascading failures
 * Tracks failures and opens circuit after threshold is reached
 */

const DEFAULT_OPTIONS = {
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
  halfOpenTimeoutMs: 30000, // 30 seconds
};

export class CircuitBreaker {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.state = 'closed'; // 'closed' | 'open' | 'half-open'
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  /**
   * Get current circuit breaker state
   */
  getState() {
    this.updateState();
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Check if circuit is open (should reject requests)
   */
  isOpen() {
    this.updateState();
    return this.state === 'open';
  }

  /**
   * Check if circuit is half-open (can attempt requests)
   */
  isHalfOpen() {
    this.updateState();
    return this.state === 'half-open';
  }

  /**
   * Check if circuit is closed (normal operation)
   */
  isClosed() {
    this.updateState();
    return this.state === 'closed';
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.state = 'closed';
  }

  /**
   * Record a failed request
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'open';
      this.nextAttemptTime = Date.now() + this.options.resetTimeoutMs;
    }
  }

  /**
   * Update circuit state based on time
   */
  updateState() {
    const now = Date.now();

    if (
      this.state === 'open' &&
      this.nextAttemptTime &&
      now >= this.nextAttemptTime
    ) {
      // Transition to half-open after reset timeout
      this.state = 'half-open';
      this.nextAttemptTime = now + this.options.halfOpenTimeoutMs;
    } else if (
      this.state === 'half-open' &&
      this.nextAttemptTime &&
      now >= this.nextAttemptTime
    ) {
      // Transition back to closed if half-open period passes without failure
      this.state = 'closed';
      this.failureCount = 0;
      this.nextAttemptTime = null;
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset() {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
}

/**
 * Create a circuit breaker instance
 */
export function createCircuitBreaker(options = {}) {
  return new CircuitBreaker(options);
}

// Default PokeAPI circuit breaker
export const pokeAPICircuitBreaker = createCircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
  halfOpenTimeoutMs: 30000, // 30 seconds
});

export default {
  CircuitBreaker,
  createCircuitBreaker,
  pokeAPICircuitBreaker,
};
