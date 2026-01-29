/**
 * In-Memory Cache Layer
 * Provides fast cache lookups without reading session files
 * Falls back to adapter if cache miss
 */

/**
 * In-memory cache structure:
 * Map<sessionId, Map<kind, Map<idOrName, { data, cachedAt, ttlMs }>>>
 */
const cache = new Map();

/**
 * Cache entry TTL (default: 1 hour for in-memory)
 * This is separate from session-level TTL
 */
const IN_MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get cached data from in-memory cache
 * @param {string} sessionId - Session ID
 * @param {string} kind - Cache kind
 * @param {string} idOrName - Entry identifier
 * @returns {object|null} Cached data or null if miss/expired
 */
export function getFromMemoryCache(sessionId, kind, idOrName) {
  const sessionCache = cache.get(sessionId);
  if (!sessionCache) {
    return null;
  }

  const kindCache = sessionCache.get(kind);
  if (!kindCache) {
    return null;
  }

  const entry = kindCache.get(idOrName);
  if (!entry) {
    return null;
  }

  // Check if expired
  const now = Date.now();
  if (now - entry.cachedAt > entry.ttlMs) {
    // Remove expired entry
    kindCache.delete(idOrName);
    return null;
  }

  return entry.data;
}

/**
 * Set cached data in in-memory cache
 * @param {string} sessionId - Session ID
 * @param {string} kind - Cache kind
 * @param {string} idOrName - Entry identifier
 * @param {object} data - Data to cache
 * @param {number} ttlMs - TTL in milliseconds
 */
export function setInMemoryCache(sessionId, kind, idOrName, data, ttlMs = IN_MEMORY_TTL_MS) {
  if (!cache.has(sessionId)) {
    cache.set(sessionId, new Map());
  }

  const sessionCache = cache.get(sessionId);
  if (!sessionCache.has(kind)) {
    sessionCache.set(kind, new Map());
  }

  const kindCache = sessionCache.get(kind);
  kindCache.set(idOrName, {
    data,
    cachedAt: Date.now(),
    ttlMs,
  });
}

/**
 * Invalidate in-memory cache for a session
 * @param {string} sessionId - Session ID
 * @param {string|null} kind - Cache kind (null for all)
 */
export function invalidateMemoryCache(sessionId, kind = null) {
  const sessionCache = cache.get(sessionId);
  if (!sessionCache) {
    return;
  }

  if (kind) {
    sessionCache.delete(kind);
  } else {
    cache.delete(sessionId);
  }
}

/**
 * Clear all in-memory cache (useful for testing or memory management)
 */
export function clearMemoryCache() {
  cache.clear();
}

/**
 * Get cache statistics
 * @returns {object} Cache statistics
 */
export function getCacheStats() {
  let totalEntries = 0;
  let totalSessions = cache.size;

  for (const sessionCache of cache.values()) {
    for (const kindCache of sessionCache.values()) {
      totalEntries += kindCache.size;
    }
  }

  return {
    totalSessions,
    totalEntries,
    memoryUsage: 'N/A', // Could be enhanced to estimate memory usage
  };
}

export default {
  getFromMemoryCache,
  setInMemoryCache,
  invalidateMemoryCache,
  clearMemoryCache,
  getCacheStats,
};
