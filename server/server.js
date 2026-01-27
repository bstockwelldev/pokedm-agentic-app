// PokeDM Agentic Flow Server
// Multi-agent system using Vercel AI SDK v6 with Router/DM/Rules/State/Lore/Design agents

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto, { randomUUID } from 'crypto';

// Agent imports
import { routeIntent } from './agents/router.js';
import { runDMAgent } from './agents/dm.js';
import { runRulesAgent } from './agents/rules.js';
import { queryStateAgent } from './agents/state.js';
import { fetchLore } from './agents/lore.js';
import { createCustomPokemonAgent } from './agents/design.js';

// Storage imports
import { loadSession, saveSession, createSession } from './storage/sessionStore.js';
import { PokemonSessionSchema } from './schemas/session.js';
import './storage/init.js'; // Ensure sessions directory exists

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Request ID middleware - add unique ID to all requests for traceability
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Default model
const DEFAULT_MODEL = process.env.LLM_MODEL || 'gemini-1.5-pro-latest';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/models
 * 
 * Fetch available models from all providers
 * Returns: { models: Array<{id, name, provider}> }
 */
app.get('/api/models', async (req, res) => {
  try {
    const { getAllModels } = await import('./lib/modelFetcher.js');
    const models = await getAllModels();
    const groqCount = models.filter(m => m.provider === 'groq').length;
    const geminiCount = models.filter(m => m.provider === 'google').length;
    console.log(`[MODELS] API endpoint returning ${models.length} models (${geminiCount} Gemini, ${groqCount} Groq)`);
    console.log(`[MODELS] Model IDs:`, models.map(m => m.id).join(', '));
    res.json({ models });
  } catch (err) {
    console.error('[MODELS] Models endpoint error:', err);
    // Return fallback models even on error
    try {
      const { getGeminiModels, getGroqModels } = await import('./lib/modelFetcher.js');
      const geminiModels = await getGeminiModels();
      const groqModels = await getGroqModels();
      const allModels = [...geminiModels, ...groqModels];
      console.log(`[MODELS] Fallback: returning ${allModels.length} models (${geminiModels.length} Gemini, ${groqModels.length} Groq)`);
      res.json({ models: allModels });
    } catch (fallbackErr) {
      console.error('[MODELS] Fallback also failed:', fallbackErr);
      res.status(500).json({
        error: 'Failed to fetch models',
        details: err.message,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    }
  }
});

// In Vercel, the serverless function is already at /api/agent, so routes should be relative
// For local dev, we keep /api prefix; for Vercel, the function handles the /api prefix
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const agentPath = isVercel ? '/' : '/api/agent';
const chatPath = isVercel ? '/chat' : '/api/chat';

/**
 * POST /api/agent (or / in Vercel)
 *
 * Main agent endpoint that routes to appropriate specialized agent
 * Expects: { userInput, sessionId, model?, campaignId?, characterIds? }
 * Returns: { narration, choices, session, steps }
 */
app.post(agentPath, async (req, res) => {
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
    res.status(500).json({ 
      error: 'Agent error', 
      details: err.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * POST /api/import
 * 
 * Import session data from export file
 * Expects: { session_data?, messages?, characters?, campaign?, custom_pokemon?, continuity?, options }
 * Returns: { sessionId, session, imported_components, warnings }
 */
app.post('/api/import', async (req, res) => {
  try {
    const {
      session_data,
      messages,
      characters,
      campaign,
      custom_pokemon,
      continuity,
      options = {},
    } = req.body || {};

    const importComponents = options.import_components || [];
    const warnings = [];

    // Create new session
    const campaignId = session_data?.campaign_id || campaign?.campaign_id || null;
    const characterIds = session_data?.character_ids || characters?.map((c) => c.character_id).filter(Boolean) || [];
    const newSession = createSession(campaignId, characterIds);

    // Merge imported components
    if (importComponents.includes('session') && session_data) {
      // Merge session data, preserving new session_id
      const originalSessionId = newSession.session.session_id;
      newSession.session = {
        ...newSession.session,
        ...session_data,
        session_id: originalSessionId, // Always use new session ID
      };
    }

    if (importComponents.includes('characters') && characters && Array.isArray(characters)) {
      newSession.characters = characters.map((char) => ({
        ...char,
        character_id: char.character_id || randomUUID(),
      }));
    }

    if (importComponents.includes('campaign') && campaign) {
      newSession.campaign = {
        ...newSession.campaign,
        ...campaign,
        campaign_id: campaignId || newSession.campaign.campaign_id,
      };
    }

    if (importComponents.includes('custom_pokemon') && custom_pokemon && typeof custom_pokemon === 'object') {
      newSession.custom_dex.pokemon = {
        ...newSession.custom_dex.pokemon,
        ...custom_pokemon,
      };
    }

    if (importComponents.includes('continuity') && continuity) {
      newSession.continuity = {
        ...newSession.continuity,
        ...continuity,
      };
    }

    // Validate merged session
    try {
      const validated = PokemonSessionSchema.parse(newSession);
      saveSession(validated.session.session_id, validated);

      const response = {
        sessionId: validated.session.session_id,
        session: validated,
        imported_components: importComponents,
        warnings: warnings.length > 0 ? warnings : undefined,
      };

      // Include messages separately if imported (not part of session schema)
      if (importComponents.includes('messages') && messages && Array.isArray(messages)) {
        response.messages = messages;
      }

      res.json(response);
    } catch (validationError) {
      res.status(400).json({
        error: 'Invalid session data',
        details: validationError.message,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        endpoint: req.path,
        method: req.method,
      });
    }
  } catch (err) {
    console.error('Import endpoint error:', err);
    res.status(500).json({
      error: 'Import error',
      details: err.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

// Keep /api/chat for backward compatibility (optional)
app.post(chatPath, async (req, res) => {
  res.status(410).json({
    error: 'This endpoint is deprecated. Use /api/agent instead.',
    migration: 'Update your client to use POST /api/agent with { userInput, sessionId, model? }',
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    endpoint: req.path,
    method: req.method
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
      requestId: req.requestId || crypto.randomUUID(), // Use middleware ID or generate fallback
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      method: req.method,
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