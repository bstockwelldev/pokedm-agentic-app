// Vercel serverless function wrapper for Express app
// Routes all /api/* requests to the Express server

// Wrap in try-catch to handle import errors gracefully
let app;

try {
  // Import the Express app
  const serverModule = await import('../server/server.js');
  app = serverModule.default;
  
  if (!app) {
    throw new Error('Express app not found in server.js default export');
  }
} catch (error) {
  console.error('Failed to import Express app:', error);
  // Create a minimal error handler
  app = (req, res) => {
    console.error('Server initialization error:', error);
    res.status(500).json({ 
      error: 'Server initialization error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  };
}

// Vercel serverless function handler
// @vercel/node expects the Express app as default export
export default app;
