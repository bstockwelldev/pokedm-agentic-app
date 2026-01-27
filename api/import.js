// Vercel serverless function for /api/import endpoint
// This file is automatically served at /api/import by Vercel

// #region agent log
console.log('[DEBUG] api/import.js: Module loading', { timestamp: Date.now(), hypothesisId: 'C' });
// #endregion

// Use dynamic import for ES module compatibility with Vercel
let app;

// Vercel serverless function handler
// Wrap Express app for Vercel serverless function format
export default async function handler(req, res) {
  // #region agent log
  console.log('[DEBUG] api/import.js: Handler invoked', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    hypothesisId: 'A',
  });
  // #endregion
  
  // Lazy load the Express app using dynamic import
  if (!app) {
    const serverModule = await import('../server/server.js');
    app = serverModule.default;
    // #region agent log
    console.log('[DEBUG] api/import.js: Express app imported', { hasApp: !!app, appType: typeof app, hypothesisId: 'C' });
    // #endregion
  }
  
  // Call Express app
  return app(req, res);
}
