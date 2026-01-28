/**
 * Database Adapter Interface
 * Provides a unified interface for session storage across different backends
 */

export class StorageError extends Error {
  constructor(message, code = 'STORAGE_ERROR') {
    super(message);
    this.name = 'StorageError';
    this.code = code;
  }
}

/**
 * Storage Adapter Interface
 * All adapters must implement these methods
 */
export class StorageAdapter {
  /**
   * Load a session by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<object|null>} Session data or null if not found
   */
  async loadSession(sessionId) {
    throw new Error('loadSession not implemented');
  }

  /**
   * Save a session
   * @param {string} sessionId - Session ID
   * @param {object} sessionData - Session data to save
   * @returns {Promise<void>}
   */
  async saveSession(sessionId, sessionData) {
    throw new Error('saveSession not implemented');
  }

  /**
   * List all session IDs, optionally filtered by campaign
   * @param {string|null} campaignId - Optional campaign ID filter
   * @returns {Promise<string[]>} Array of session IDs
   */
  async listSessions(campaignId = null) {
    throw new Error('listSessions not implemented');
  }

  /**
   * Delete a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteSession(sessionId) {
    throw new Error('deleteSession not implemented');
  }

  /**
   * Get canon cache entry
   * @param {string} sessionId - Session ID
   * @param {string} kind - Cache kind (pokemon, moves, etc.)
   * @param {string} idOrName - Entry identifier
   * @returns {Promise<object|null>} Cached data or null
   */
  async getCachedCanonData(sessionId, kind, idOrName) {
    throw new Error('getCachedCanonData not implemented');
  }

  /**
   * Set canon cache entry
   * @param {string} sessionId - Session ID
   * @param {string} kind - Cache kind
   * @param {string} idOrName - Entry identifier
   * @param {object} data - Data to cache
   * @returns {Promise<void>}
   */
  async setCachedCanonData(sessionId, kind, idOrName, data) {
    throw new Error('setCachedCanonData not implemented');
  }

  /**
   * Invalidate cache entries
   * @param {string} sessionId - Session ID
   * @param {string|null} kind - Cache kind (null for all)
   * @returns {Promise<void>}
   */
  async invalidateCache(sessionId, kind = null) {
    throw new Error('invalidateCache not implemented');
  }
}

/**
 * Adapter Factory
 */
const registry = new Map();

/**
 * Register a storage adapter
 * @param {string} name - Adapter name
 * @param {Function} factory - Factory function that returns an adapter instance
 */
export function registerAdapter(name, factory) {
  registry.set(name, factory);
}

/**
 * Create a storage adapter instance
 * @param {string} name - Adapter name
 * @returns {StorageAdapter} Adapter instance
 */
export function createAdapter(name) {
  const factory = registry.get(name);
  if (!factory) {
    throw new StorageError(`Adapter "${name}" is not registered`, 'ADAPTER_NOT_FOUND');
  }
  return factory();
}

/**
 * Get the default adapter based on environment
 * @returns {StorageAdapter} Default adapter instance
 */
export function getDefaultAdapter() {
  const provider = process.env.STORAGE_PROVIDER || 'file';
  return createAdapter(provider);
}
