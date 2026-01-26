import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PokemonSessionSchema } from '../schemas/session.js';

const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';

/**
 * Canon Cache System
 * Manages TTL-based caching for PokeAPI data in session's dex.canon_cache
 */

/**
 * Get cached canon data if available and not expired
 * @param {string} kind - Type of data (pokemon, moves, abilities, etc.)
 * @param {string} idOrName - Identifier for the data
 * @param {string} sessionId - Session ID
 * @returns {object|null} Cached data or null if miss/expired
 */
export function getCachedCanonData(kind, idOrName, sessionId) {
  const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`);
  
  if (!existsSync(sessionPath)) {
    return null;
  }

  try {
    const sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
    const session = PokemonSessionSchema.parse(sessionData);
    
    const cache = session.dex.canon_cache[kind];
    if (!cache || !cache[idOrName]) {
      return null;
    }

    const cachedEntry = cache[idOrName];
    const cacheTime = cachedEntry._cached_at || 0;
    const ttlMs = session.dex.cache_policy.ttl_hours * 60 * 60 * 1000;
    const now = Date.now();

    // Check if expired
    if (now - cacheTime > ttlMs) {
      return null; // Expired
    }

    // Return data without metadata
    const { _cached_at, ...data } = cachedEntry;
    return data;
  } catch (error) {
    console.error(`Error reading cache for ${kind}/${idOrName}:`, error);
    return null;
  }
}

/**
 * Store canon data in cache with timestamp
 * @param {string} kind - Type of data
 * @param {string} idOrName - Identifier
 * @param {object} data - Data to cache
 * @param {string} sessionId - Session ID
 */
export function setCachedCanonData(kind, idOrName, data, sessionId) {
  const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`);
  
  if (!existsSync(sessionPath)) {
    throw new Error(`Session ${sessionId} not found`);
  }

  try {
    const sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
    const session = PokemonSessionSchema.parse(sessionData);
    
    // Check max entries limit
    const cache = session.dex.canon_cache[kind];
    const maxEntries = session.dex.cache_policy.max_entries_per_kind;
    
    if (Object.keys(cache).length >= maxEntries && !cache[idOrName]) {
      // Remove oldest entry (simple FIFO - in production, use LRU)
      const firstKey = Object.keys(cache)[0];
      delete cache[firstKey];
    }

    // Store with timestamp
    cache[idOrName] = {
      ...data,
      _cached_at: Date.now(),
    };

    // Save updated session
    writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error setting cache for ${kind}/${idOrName}:`, error);
    throw error;
  }
}

/**
 * Invalidate cache entries
 * @param {string} kind - Type of data (optional, clears all if not provided)
 * @param {string} sessionId - Session ID (optional, clears all sessions if not provided)
 */
export function invalidateCache(kind = null, sessionId = null) {
  if (sessionId) {
    const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`);
    if (!existsSync(sessionPath)) {
      return;
    }

    try {
      const sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
      const session = PokemonSessionSchema.parse(sessionData);
      
      if (kind) {
        // Clear specific kind
        session.dex.canon_cache[kind] = {};
      } else {
        // Clear all caches
        Object.keys(session.dex.canon_cache).forEach((k) => {
          session.dex.canon_cache[k] = {};
        });
      }

      writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Error invalidating cache:`, error);
    }
  } else {
    // Clear all sessions (if needed)
    // This would require listing all session files
    console.warn('Invalidating all sessions not implemented - specify sessionId');
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
