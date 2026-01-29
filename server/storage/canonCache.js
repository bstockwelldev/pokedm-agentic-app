/**
 * Canon Cache System
 * Manages TTL-based caching for PokeAPI data using storage adapters
 */

import { getDefaultAdapter } from './adapters/index.js';

// Import adapters to register them
import './adapters/file.js';
import './adapters/postgres.js';

// Get the default adapter instance
const adapter = getDefaultAdapter();

/**
 * Get cached canon data if available and not expired
 * Checks in-memory cache first, then falls back to adapter
 * @param {string} kind - Type of data (pokemon, moves, abilities, etc.)
 * @param {string} idOrName - Identifier for the data
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} Cached data or null if miss/expired
 */
export async function getCachedCanonData(kind, idOrName, sessionId) {
  // Check in-memory cache first
  const memoryCache = getFromMemoryCache(sessionId, kind, idOrName);
  if (memoryCache) {
    return memoryCache;
  }

  // Fall back to adapter (file/database)
  try {
    const adapterCache = await adapter.getCachedCanonData(sessionId, kind, idOrName);
    
    // If found in adapter, also store in memory cache for next time
    if (adapterCache) {
      // Get TTL from session (load session to get cache policy)
      try {
        const { loadSession } = await import('./sessionStore.js');
        const session = await loadSession(sessionId);
        if (session) {
          const ttlMs = session.dex.cache_policy.ttl_hours * 60 * 60 * 1000;
          setInMemoryCache(sessionId, kind, idOrName, adapterCache, ttlMs);
        }
      } catch (error) {
        // If session load fails, use default TTL
        setInMemoryCache(sessionId, kind, idOrName, adapterCache);
      }
    }
    
    return adapterCache;
  } catch (error) {
    console.error(`Error reading cache for ${kind}/${idOrName}:`, error);
    return null;
  }
}

/**
 * Store canon data in cache with timestamp
 * Stores in both in-memory cache and adapter
 * @param {string} kind - Type of data
 * @param {string} idOrName - Identifier
 * @param {object} data - Data to cache
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
export async function setCachedCanonData(kind, idOrName, data, sessionId) {
  try {
    // Store in adapter (persistent)
    await adapter.setCachedCanonData(sessionId, kind, idOrName, data);
    
    // Also store in memory cache for fast access
    try {
      const { loadSession } = await import('./sessionStore.js');
      const session = await loadSession(sessionId);
      if (session) {
        const ttlMs = session.dex.cache_policy.ttl_hours * 60 * 60 * 1000;
        setInMemoryCache(sessionId, kind, idOrName, data, ttlMs);
      }
    } catch (error) {
      // If session load fails, use default TTL
      setInMemoryCache(sessionId, kind, idOrName, data);
    }
  } catch (error) {
    console.error(`Error setting cache for ${kind}/${idOrName}:`, error);
    throw error;
  }
}

/**
 * Invalidate cache entries
 * Invalidates both in-memory cache and adapter cache
 * @param {string} kind - Type of data (optional, clears all if not provided)
 * @param {string} sessionId - Session ID (optional, clears all sessions if not provided)
 * @returns {Promise<void>}
 */
export async function invalidateCache(kind = null, sessionId = null) {
  if (!sessionId) {
    console.warn('Invalidating all sessions not implemented - specify sessionId');
    return;
  }

  try {
    // Invalidate adapter cache
    await adapter.invalidateCache(sessionId, kind);
    
    // Also invalidate in-memory cache
    invalidateMemoryCache(sessionId, kind);
  } catch (error) {
    console.error(`Error invalidating cache:`, error);
    throw error;
  }
}

/**
 * Check if generation is within allowed range (1-9)
 * @param {number} generation - Generation number
 * @returns {boolean}
 */
export function isGenerationAllowed(generation) {
  return generation >= 1 && generation <= 9;
}
