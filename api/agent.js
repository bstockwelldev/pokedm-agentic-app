// Vercel serverless function wrapper for Express app
// This file is automatically served at /api/agent by Vercel

// #region agent log
console.log('[DEBUG] api/agent.js: Module loading', { timestamp: Date.now(), hypothesisId: 'C' });
// #endregion

// Use dynamic import for ES module compatibility with Vercel
let app;

// Vercel serverless function handler
// Wrap Express app for Vercel serverless function format
export default async function handler(req, res) {
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
  
  // Lazy load the Express app using dynamic import
  if (!app) {
    try {
      const serverModule = await import('../server/server.js');
      app = serverModule.default;
      // #region agent log
      console.log('[DEBUG] api/agent.js: Express app imported', { hasApp: !!app, appType: typeof app, hypothesisId: 'C' });
      // #endregion
    } catch (error) {
      console.error('[ERROR] api/agent.js: Failed to import server', error);
      return res.status(500).json({ 
        error: 'Server initialization failed', 
        details: error.message 
      });
    }
  }
  
  // Call Express app
  return app(req, res);
}
