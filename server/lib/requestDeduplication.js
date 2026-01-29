/**
 * Request Deduplication
 * Prevents duplicate concurrent requests for the same resource
 */

/**
 * In-flight request tracker
 * Map<requestKey, Promise>
 */
const inFlightRequests = new Map();

/**
 * Generate a unique key for a request
 * @param {string} url - Request URL
 * @returns {string} Request key
 */
function getRequestKey(url) {
  return url;
}

/**
 * Execute a request with deduplication
 * If a request for the same URL is already in flight, returns the existing promise
 * @param {string} url - Request URL
 * @param {Function} requestFn - Function that returns a promise for the request
 * @returns {Promise<any>} Request result
 */
export async function deduplicateRequest(url, requestFn) {
  const key = getRequestKey(url);

  // Check if request is already in flight
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  // Create new request promise
  const promise = requestFn()
    .then((result) => {
      // Remove from in-flight tracker on success
      inFlightRequests.delete(key);
      return result;
    })
    .catch((error) => {
      // Remove from in-flight tracker on error
      inFlightRequests.delete(key);
      throw error;
    });

  // Track in-flight request
  inFlightRequests.set(key, promise);

  return promise;
}

/**
 * Clear in-flight requests (useful for testing)
 */
export function clearInFlightRequests() {
  inFlightRequests.clear();
}

/**
 * Get number of in-flight requests
 * @returns {number} Number of in-flight requests
 */
export function getInFlightRequestCount() {
  return inFlightRequests.size;
}

export default {
  deduplicateRequest,
  clearInFlightRequests,
  getInFlightRequestCount,
};
