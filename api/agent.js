// Vercel serverless function wrapper for Express app
// Routes all /api/* requests to the Express server

try {
  // Import the Express app
  const appModule = await import('../server/server.js');
  const app = appModule.default;
  
  // Vercel serverless function handler
  // @vercel/node expects the Express app as default export
  export default app;
} catch (error) {
  // Fallback error handler if import fails
  console.error('Failed to import Express app:', error);
  export default (req, res) => {
    res.status(500).json({ 
      error: 'Server initialization error', 
      details: error.message 
    });
  };
}
