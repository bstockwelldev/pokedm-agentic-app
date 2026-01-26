// PokeDM Agentic Flow Server
// Multi-agent system using Vercel AI SDK v6 with Router/DM/Rules/State/Lore/Design agents

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Agent imports
import { routeIntent } from './agents/router.js';
import { runDMAgent } from './agents/dm.js';
import { runRulesAgent } from './agents/rules.js';
import { queryStateAgent } from './agents/state.js';
import { fetchLore } from './agents/lore.js';
import { createCustomPokemonAgent } from './agents/design.js';

// Storage imports
import { loadSession, saveSession, createSession } from './storage/sessionStore.js';
import './storage/init.js'; // Ensure sessions directory exists

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Default model
const DEFAULT_MODEL = process.env.LLM_MODEL || 'gemini-1.5-pro-latest';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/agent
 *
 * Main agent endpoint that routes to appropriate specialized agent
 * Expects: { userInput, sessionId, model?, campaignId?, characterIds? }
 * Returns: { narration, choices, session, steps }
 */
app.post('/api/agent', async (req, res) => {
  try {
    const { userInput, sessionId, model, campaignId, characterIds } = req.body || {};

    if (typeof userInput !== 'string' || userInput.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid userInput' });
    }

    // Load or create session
    let session = null;
    if (sessionId) {
      session = loadSession(sessionId);
    }

    if (!session) {
      session = createSession(campaignId || null, characterIds || []);
    }

    // Route intent
    const intent = await routeIntent(userInput, session, model || DEFAULT_MODEL);

    // Execute appropriate agent
    let result;
    switch (intent) {
      case 'narration':
        result = await runDMAgent(userInput, session, model || DEFAULT_MODEL);
        break;
      case 'roll':
        result = await runRulesAgent(userInput, session, model || DEFAULT_MODEL);
        break;
      case 'state':
        result = await queryStateAgent(userInput, session, model || DEFAULT_MODEL);
        break;
      case 'lore':
        result = await fetchLore(userInput, session, model || DEFAULT_MODEL);
        break;
      case 'design':
        result = await createCustomPokemonAgent(userInput, session, model || DEFAULT_MODEL);
        break;
      default:
        // Fallback to DM agent
        result = await runDMAgent(userInput, session, model || DEFAULT_MODEL);
    }

    // Save updated session if state was modified
    if (result.updatedSession) {
      saveSession(session.session.session_id, result.updatedSession);
      session = result.updatedSession;
    }
    
    // If custom Pokémon was created, reload to get updated custom_dex
    // (createCustomPokemon tool saves the session, so reload will get latest)
    if (result.customPokemon) {
      session = loadSession(session.session.session_id);
    }

    // Return response
    res.json({
      intent,
      narration: result.narration || result.result || result.data || result.explanation || '',
      choices: result.choices || [],
      session: session,
      sessionId: session.session.session_id,
      steps: result.steps || [],
      customPokemon: result.customPokemon || null,
    });
  } catch (err) {
    console.error('Agent endpoint error:', err);
    res.status(500).json({ error: 'Agent error', details: err.message });
  }
});

// Keep /api/chat for backward compatibility (optional)
app.post('/api/chat', async (req, res) => {
  res.status(410).json({
    error: 'This endpoint is deprecated. Use /api/agent instead.',
    migration: 'Update your client to use POST /api/agent with { userInput, sessionId, model? }',
  });
});

// Catch-all for undefined routes - return JSON (must be after all routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler middleware - must be last
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Server error', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Export app for Vercel serverless functions
export default app;

// Only start server if running locally (not in Vercel)
if (process.env.VERCEL !== '1' && process.env.VERCEL_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Agentic server listening on port ${PORT}`);
  });
}