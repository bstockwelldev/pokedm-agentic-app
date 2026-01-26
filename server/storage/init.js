/**
 * Initialize storage directories
 * Ensures sessions directory exists
 */
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// In Vercel serverless, use /tmp for session storage (ephemeral)
// In local dev, use ./sessions
const SESSIONS_DIR = process.env.VERCEL 
  ? '/tmp/sessions'
  : (process.env.SESSIONS_DIR || './sessions');

export function ensureSessionsDir() {
  try {
    if (!existsSync(SESSIONS_DIR)) {
      mkdirSync(SESSIONS_DIR, { recursive: true });
      console.log(`Created sessions directory: ${SESSIONS_DIR}`);
    }
  } catch (err) {
    // Ignore errors in serverless environment if directory creation fails
    console.warn('Could not create sessions directory:', err.message);
  }
}

// Auto-initialize on import
ensureSessionsDir();
