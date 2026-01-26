// Vercel serverless function wrapper for Express app
// Routes all /api/* requests to the Express server

import app from '../server/server.js';

// Vercel serverless function handler
// @vercel/node expects the Express app as default export
export default app;
