// Vercel serverless function wrapper for Express app
// This file is automatically served at /api/agent by Vercel

// #region agent log
console.log('[DEBUG] api/agent.js: Module loading', { timestamp: Date.now(), hypothesisId: 'C' });
// #endregion

import app from '../server/server.js';

// #region agent log
console.log('[DEBUG] api/agent.js: Express app imported', { hasApp: !!app, appType: typeof app, hypothesisId: 'C' });
// #endregion

// Vercel serverless function handler
// Wrap Express app for Vercel serverless function format
export default function handler(req, res) {
  // #region agent log
  console.log('[DEBUG] api/agent.js: Handler invoked', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    headers: Object.keys(req.headers || {}),
    hypothesisId: 'A',
  });
  // #endregion
  
  // Call Express app
  return app(req, res);
}
