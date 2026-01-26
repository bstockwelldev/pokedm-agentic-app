// Vercel serverless function wrapper for Express app
// Routes all /api/* requests to the Express server

import app from '../server/server.js';

// Vercel serverless function handler
export default async function handler(req, res) {
  return app(req, res);
}
