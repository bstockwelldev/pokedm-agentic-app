/**
 * Initialize storage directories
 * Ensures sessions directory exists
 */
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';

export function ensureSessionsDir() {
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
    console.log(`Created sessions directory: ${SESSIONS_DIR}`);
  }
}

// Auto-initialize on import
ensureSessionsDir();
