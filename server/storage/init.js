/**
 * Initialize storage directories
 * Ensures sessions directory exists
 */
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Detect Vercel environment (check multiple possible env vars)
const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);

// In Vercel serverless, use /tmp for session storage (ephemeral)
// In local dev, use ./sessions
const SESSIONS_DIR = isVercel
  ? '/tmp/sessions'
  : (process.env.SESSIONS_DIR || './sessions');

export function ensureSessionsDir() {
  try {
    if (!existsSync(SESSIONS_DIR)) {
      // In Vercel, ensure /tmp exists first
      if (SESSIONS_DIR.startsWith('/tmp')) {
        if (!existsSync('/tmp')) {
          console.warn('[STORAGE] /tmp directory does not exist in this environment');
          return;
        }
      }
      mkdirSync(SESSIONS_DIR, { recursive: true });
      console.log(`[STORAGE] Created sessions directory: ${SESSIONS_DIR}`);
    }
  } catch (err) {
    // Ignore errors in serverless environment if directory creation fails
    // The directory will be created lazily when files are written
    // This is non-blocking - module will still load successfully
    console.warn(`[STORAGE] Could not create sessions directory ${SESSIONS_DIR}:`, err.message);
    console.warn(`[STORAGE] Vercel detection: VERCEL=${process.env.VERCEL}, VERCEL_ENV=${process.env.VERCEL_ENV}, VERCEL_URL=${process.env.VERCEL_URL}`);
  }
}

// Auto-initialize on import (non-blocking)
// This will attempt to create the directory but won't fail if it can't
// Errors are caught and logged, but don't prevent module loading
try {
  ensureSessionsDir();
} catch (err) {
  // Double-catch to ensure module loading never fails
  console.warn('[STORAGE] Failed to initialize sessions directory on module load:', err.message);
}
