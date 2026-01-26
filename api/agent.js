// Vercel serverless function wrapper for Express app
// This file is automatically served at /api/agent by Vercel

import app from '../server/server.js';

// Vercel serverless function handler
// @vercel/node expects the Express app as default export
export default app;
