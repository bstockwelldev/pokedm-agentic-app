// Vercel serverless function for /api/models endpoint
// This file is automatically served at /api/models by Vercel

// #region agent log
console.log('[DEBUG] api/models.js: Module loading', { timestamp: Date.now(), hypothesisId: 'C' });
// #endregion

import app from '../server/server.js';

// #region agent log
console.log('[DEBUG] api/models.js: Express app imported', { hasApp: !!app, appType: typeof app, hypothesisId: 'C' });
// #endregion

// Vercel serverless function handler
// Wrap Express app for Vercel serverless function format
export default function handler(req, res) {
  // #region agent log
  console.log('[DEBUG] api/models.js: Handler invoked', {
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
