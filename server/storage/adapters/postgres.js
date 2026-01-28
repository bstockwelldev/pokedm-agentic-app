/**
 * PostgreSQL Storage Adapter
 * Uses PostgreSQL for production storage
 */

import pg from 'pg';
import { StorageAdapter, StorageError, registerAdapter } from './index.js';
import { PokemonSessionSchema } from '../../schemas/session.js';

const { Pool } = pg;

/**
 * PostgreSQL Storage Adapter
 * Stores sessions in PostgreSQL database
 */
export class PostgresStorageAdapter extends StorageAdapter {
  constructor() {
    super();
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new StorageError('DATABASE_URL environment variable is required for PostgreSQL adapter', 'CONFIG_ERROR');
    }

    this.pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    // Initialize schema on first use
    this.initialized = false;
  }

  async ensureInitialized() {
    if (this.initialized) {
      return;
    }

    try {
      // Create sessions table if it doesn't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS pokedm_sessions (
          session_id VARCHAR(255) PRIMARY KEY,
          session_data JSONB NOT NULL,
          campaign_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_campaign_id ON pokedm_sessions(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON pokedm_sessions(updated_at);
      `);
      this.initialized = true;
    } catch (error) {
      throw new StorageError(`Failed to initialize database: ${error.message}`, 'INIT_ERROR');
    }
  }

  async loadSession(sessionId) {
    await this.ensureInitialized();

    try {
      const result = await this.pool.query(
        'SELECT session_data FROM pokedm_sessions WHERE session_id = $1',
        [sessionId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return PokemonSessionSchema.parse(result.rows[0].session_data);
    } catch (error) {
      if (error.name === 'ZodError') {
        throw new StorageError(`Invalid session data for ${sessionId}: ${error.message}`, 'VALIDATION_ERROR');
      }
      throw new StorageError(`Error loading session ${sessionId}: ${error.message}`, 'LOAD_ERROR');
    }
  }

  async saveSession(sessionId, sessionData) {
    await this.ensureInitialized();

    // Validate before saving
    const validated = PokemonSessionSchema.parse(sessionData);
    const campaignId = validated.session?.campaign_id || null;

    try {
      await this.pool.query(
        `INSERT INTO pokedm_sessions (session_id, session_data, campaign_id, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (session_id)
         DO UPDATE SET
           session_data = EXCLUDED.session_data,
           campaign_id = EXCLUDED.campaign_id,
           updated_at = NOW()`,
        [sessionId, JSON.stringify(validated), campaignId]
      );
    } catch (error) {
      throw new StorageError(`Error saving session ${sessionId}: ${error.message}`, 'SAVE_ERROR');
    }
  }

  async listSessions(campaignId = null) {
    await this.ensureInitialized();

    try {
      let query = 'SELECT session_id FROM pokedm_sessions';
      const params = [];

      if (campaignId) {
        query += ' WHERE campaign_id = $1';
        params.push(campaignId);
      }

      query += ' ORDER BY updated_at DESC';

      const result = await this.pool.query(query, params);
      return result.rows.map((row) => row.session_id);
    } catch (error) {
      throw new StorageError(`Error listing sessions: ${error.message}`, 'LIST_ERROR');
    }
  }

  async deleteSession(sessionId) {
    await this.ensureInitialized();

    try {
      const result = await this.pool.query(
        'DELETE FROM pokedm_sessions WHERE session_id = $1',
        [sessionId]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new StorageError(`Error deleting session ${sessionId}: ${error.message}`, 'DELETE_ERROR');
    }
  }

  async getCachedCanonData(sessionId, kind, idOrName) {
    const session = await this.loadSession(sessionId);
    if (!session) {
      return null;
    }

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
  }

  async setCachedCanonData(sessionId, kind, idOrName, data) {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new StorageError(`Session ${sessionId} not found`, 'SESSION_NOT_FOUND');
    }

    // Check max entries limit
    const cache = session.dex.canon_cache[kind];
    const maxEntries = session.dex.cache_policy.max_entries_per_kind;
    
    // LRU eviction: remove oldest entry if at limit
    if (Object.keys(cache).length >= maxEntries && !cache[idOrName]) {
      // Find oldest entry by _cached_at timestamp
      const entries = Object.entries(cache).map(([key, value]) => ({
        key,
        cachedAt: value._cached_at || 0,
      }));
      entries.sort((a, b) => a.cachedAt - b.cachedAt);
      if (entries.length > 0) {
        delete cache[entries[0].key];
      }
    }

    // Store with timestamp
    cache[idOrName] = {
      ...data,
      _cached_at: Date.now(),
    };

    // Save updated session
    await this.saveSession(sessionId, session);
  }

  async invalidateCache(sessionId, kind = null) {
    const session = await this.loadSession(sessionId);
    if (!session) {
      return;
    }

    if (kind) {
      // Clear specific kind
      session.dex.canon_cache[kind] = {};
    } else {
      // Clear all caches
      Object.keys(session.dex.canon_cache).forEach((k) => {
        session.dex.canon_cache[k] = {};
      });
    }

    await this.saveSession(sessionId, session);
  }

  /**
   * Close database connection pool
   */
  async close() {
    await this.pool.end();
  }
}

// Register the postgres adapter
registerAdapter('postgres', () => new PostgresStorageAdapter());

export default PostgresStorageAdapter;
