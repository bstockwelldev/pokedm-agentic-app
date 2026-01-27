// Vercel serverless function wrapper for Express app
// This file is automatically served at /api/agent by Vercel

import app from '../server/server.js';

// Vercel serverless function handler
// The Express app handles /api/agent route (or / in Vercel mode)
export default app;
