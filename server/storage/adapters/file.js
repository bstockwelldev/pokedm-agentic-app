/**
 * File-based Storage Adapter
 * Uses JSON files for local development
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { promises as fs } from 'fs';
import { StorageAdapter, StorageError, registerAdapter } from './index.js';
import { PokemonSessionSchema } from '../../schemas/session.js';

// Detect Vercel environment
const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);

// In Vercel serverless, use /tmp for session storage (ephemeral)
// In local dev, use ./sessions
const SESSIONS_DIR = isVercel
  ? '/tmp/sessions'
  : (process.env.SESSIONS_DIR || './sessions');

/**
 * File-based Storage Adapter
 * Stores sessions as JSON files
 */
export class FileStorageAdapter extends StorageAdapter {
  constructor() {
    super();
    this.ensureSessionsDir();
  }

  ensureSessionsDir() {
    try {
      if (!existsSync(SESSIONS_DIR)) {
        if (SESSIONS_DIR.startsWith('/tmp')) {
          if (!existsSync('/tmp')) {
            console.warn('/tmp directory does not exist in this environment');
            return;
          }
        }
        mkdirSync(SESSIONS_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn(`Could not create sessions directory ${SESSIONS_DIR}:`, err.message);
    }
  }

  getSessionPath(sessionId) {
    return join(SESSIONS_DIR, `${sessionId}.json`);
  }

  async loadSession(sessionId) {
    const sessionPath = this.getSessionPath(sessionId);
    
    if (!existsSync(sessionPath)) {
      return null;
    }

    try {
      const sessionData = JSON.parse(await fs.readFile(sessionPath, 'utf-8'));
      return PokemonSessionSchema.parse(sessionData);
    } catch (error) {
      throw new StorageError(`Error loading session ${sessionId}: ${error.message}`, 'LOAD_ERROR');
    }
  }

  async saveSession(sessionId, sessionData) {
    // Validate before saving
    const validated = PokemonSessionSchema.parse(sessionData);
    
    this.ensureSessionsDir();
    const sessionPath = this.getSessionPath(sessionId);
    
    // Atomic write: write to temp file, then rename
    const tempPath = `${sessionPath}.tmp`;
    try {
      await fs.writeFile(tempPath, JSON.stringify(validated, null, 2), 'utf-8');
      await fs.rename(tempPath, sessionPath);
    } catch (error) {
      // Clean up temp file on error
      try {
        if (existsSync(tempPath)) {
          await fs.unlink(tempPath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw new StorageError(`Error saving session ${sessionId}: ${error.message}`, 'SAVE_ERROR');
    }
  }

  async listSessions(campaignId = null) {
    this.ensureSessionsDir();
    if (!existsSync(SESSIONS_DIR)) {
      return [];
    }

    try {
      const files = (await fs.readdir(SESSIONS_DIR)).filter((f) => f.endsWith('.json'));
      const sessionIds = files.map((f) => f.replace('.json', ''));

      if (!campaignId) {
        return sessionIds;
      }

      // Filter by campaign - read sessions to check campaign_id
      const filtered = [];
      for (const sessionId of sessionIds) {
        try {
          const session = await this.loadSession(sessionId);
          if (session?.session?.campaign_id === campaignId) {
            filtered.push(sessionId);
          }
        } catch {
          // Skip invalid sessions
          continue;
        }
      }
      return filtered;
    } catch (error) {
      throw new StorageError(`Error listing sessions: ${error.message}`, 'LIST_ERROR');
    }
  }

  async deleteSession(sessionId) {
    const sessionPath = this.getSessionPath(sessionId);
    
    if (!existsSync(sessionPath)) {
      return false;
    }

    try {
      await fs.unlink(sessionPath);
      return true;
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
}

// Register the file adapter
registerAdapter('file', () => new FileStorageAdapter());

export default FileStorageAdapter;
