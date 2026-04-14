// PokeDM Agentic Flow Server
// Multi-agent system using Vercel AI SDK v6 with Router/DM/Rules/State/Lore/Design agents

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import crypto, { randomUUID } from 'crypto';

// Import logger
import logger, { Logger } from './lib/logger.js';
import { fetchPokemonMedia } from './lib/pokemonMedia.js';
import { resolveModel, classifyAgentError } from './lib/modelUtils.js';
import { getDefaultAdapter } from './storage/adapters/index.js';

// Import middleware
import { validateAgentRequest } from './middleware/validateRequest.js';
import errorHandler from './middleware/errorHandler.js';

// Storage imports
import { PokemonSessionSchema } from './schemas/session.js';
import './storage/init.js'; // Ensure sessions directory exists

dotenv.config();

// Module loading log
logger.debug('Module loading', {
  vercel: !!process.env.VERCEL,
  nodeEnv: process.env.NODE_ENV,
});

const app = express();

// Security: helmet sets sensible HTTP headers
app.use(helmet());

// Security: CORS — restrict to known origins
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:3000,http://localhost:5173'
)
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  })
);

// Security: rate limiting — 60 req/min per IP on all API routes (configurable)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', apiLimiter);

app.use(express.json({ limit: '100kb' }));

// Request ID middleware - add unique ID to all requests for traceability
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  
  // Create request-scoped logger
  req.logger = logger.child(req.requestId);
  
  req.logger.debug('Request received', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
  });
  
  next();
});

// Default model — derived from modelUtils tier resolution (STO-28)
// resolveModel('dm') reads DM_MODEL env var, then SMART_MODEL, then tier default
const DEFAULT_MODEL = process.env.LLM_MODEL || resolveModel('dm');

/**
 * Generate a simple recap from session history (fallback)
 * @param {object} session - Session object
 * @returns {string} Recap text
 */
function generateSimpleRecap(session) {
  const recaps = [];
  
  // Build recap from event log
  if (session.session?.event_log && session.session.event_log.length > 0) {
    const recentEvents = session.session.event_log.slice(-10); // Last 10 events
    const eventSummaries = recentEvents
      .filter(e => e.type !== 'recap') // Exclude existing recaps
      .map(e => `- ${e.summary}${e.details ? `: ${e.details}` : ''}`)
      .join('\n');
    
    if (eventSummaries) {
      recaps.push('## Recent Events\n' + eventSummaries);
    }
  }
  
  // Add existing recaps from continuity
  if (session.continuity?.recaps && session.continuity.recaps.length > 0) {
    const existingRecaps = session.continuity.recaps
      .slice(-3) // Last 3 recaps
      .map(r => r.text)
      .join('\n\n');
    if (existingRecaps) {
      recaps.push('## Previous Recap\n' + existingRecaps);
    }
  }
  
  // Add timeline entries
  if (session.continuity?.timeline && session.continuity.timeline.length > 0) {
    const timelineEntries = session.continuity.timeline
      .slice(-5) // Last 5 timeline entries
      .map(t => `- ${t.description}`)
      .join('\n');
    if (timelineEntries) {
      recaps.push('## Timeline\n' + timelineEntries);
    }
  }
  
  // Add current state summary
  const stateSummary = [];
  if (session.session?.scene?.location_id) {
    stateSummary.push(`**Current Location:** ${session.session.scene.location_id}`);
  }
  if (session.session?.scene?.description) {
    stateSummary.push(`**Scene:** ${session.session.scene.description}`);
  }
  if (session.characters && session.characters.length > 0) {
    const partySize = session.characters.reduce((sum, c) => sum + c.pokemon_party.length, 0);
    stateSummary.push(`**Party:** ${partySize} Pokémon`);
  }
  if (session.session?.current_objectives && session.session.current_objectives.length > 0) {
    const objectives = session.session.current_objectives
      .map(o => `- ${o.description} (${o.status})`)
      .join('\n');
    stateSummary.push(`**Objectives:**\n${objectives}`);
  }
  
  if (stateSummary.length > 0) {
    recaps.push('## Current State\n' + stateSummary.join('\n'));
  }
  
  // If no recap data available, return a message
  if (recaps.length === 0) {
    return 'No recap data available yet. Start your adventure to build up session history!';
  }
  
  return recaps.join('\n\n');
}

// generateRecap function moved to services/agentOrchestrator.js

// Health check endpoint (no versioning needed)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Version 1 routes prefix
const API_V1 = '/api/v1';

// In Vercel, each serverless function receives requests with the full path
// So /api/agent requests go to api/agent.js, and the Express app sees /api/agent
// For local dev, we also use /api prefix
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
// Always use full paths - Vercel preserves the path when calling serverless functions
const agentPath = '/api/agent';
const agentV1Path = '/api/v1/agent';
const chatPath = '/api/chat';
const chatV1Path = '/api/v1/chat';

/**
 * GET /api/v1/models and GET /api/models (legacy)
 * Fetch available models from all providers.
 * Returns: { models: Array<{id, name, provider}> }
 * Legacy /api/models is used by Vercel serverless (api/models.js) and the client.
 */
async function handleGetModels(req, res) {
  req.logger.debug('Models route matched', {
    method: req.method,
    path: req.path,
    url: req.url,
  });

  try {
    const { getAllModels } = await import('./lib/modelFetcher.js');
    req.logger.debug('modelFetcher imported', { hasGetAllModels: !!getAllModels });

    const models = await getAllModels();
    req.logger.debug('models fetched', { modelCount: models.length });

    const groqCount = models.filter(m => m.provider === 'groq').length;
    const geminiCount = models.filter(m => m.provider === 'google').length;
    req.logger.info(`API endpoint returning ${models.length} models (${geminiCount} Gemini, ${groqCount} Groq)`, {
      modelCount: models.length,
      geminiCount,
      groqCount,
      modelIds: models.map(m => m.id),
    });

    res.json({ models });
  } catch (err) {
    req.logger.error('Models endpoint error', err, { endpoint: req.path || '/api/models' });
    try {
      const { getGeminiModels, getGroqModels } = await import('./lib/modelFetcher.js');
      const geminiModels = await getGeminiModels();
      const groqModels = await getGroqModels();
      const allModels = [...geminiModels, ...groqModels];
      req.logger.warn('Fallback: returning models', {
        modelCount: allModels.length,
        geminiCount: geminiModels.length,
        groqCount: groqModels.length,
      });
      res.json({ models: allModels });
    } catch (fallbackErr) {
      req.logger.error('Fallback also failed', fallbackErr);
      res.status(500).json({
        error: 'Failed to fetch models',
        details: err.message,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

app.get(`${API_V1}/models`, handleGetModels);
app.get('/api/models', handleGetModels);

/**
 * POST /api/v1/agent and POST /api/agent (legacy)
 * Main agent endpoint. Legacy /api/agent is used by the client and Vercel api/agent.js.
 * Expects: { userInput, sessionId, model?, campaignId?, characterIds? }
 * Returns: { narration, choices, session, steps }
 */
async function handlePostAgent(req, res) {
  req.logger.debug('Agent route matched', {
    method: req.method,
    path: req.path,
    url: req.url,
    hasBody: !!req.body,
  });

  try {
    const { userInput, sessionId, model, campaignId, characterIds } = req.body;
    req.logger.debug('request body parsed', {
      hasUserInput: !!userInput,
      hasSessionId: !!sessionId,
      hasModel: !!model,
    });

    let validatedModel = model || DEFAULT_MODEL;
    try {
      const { validateModelName, normalizeModelName } = await import('./lib/modelValidator.js');
      const { getAllModels } = await import('./lib/modelFetcher.js');

      let availableModels = [];
      try {
        availableModels = await getAllModels();
      } catch (err) {
        req.logger.warn('Could not fetch available models for validation', { error: err.message });
      }

      const validation = validateModelName(validatedModel, availableModels);
      if (!validation.valid) {
        const normalized = normalizeModelName(validatedModel);
        if (normalized && normalized !== validatedModel) {
          const revalidation = validateModelName(normalized, availableModels);
          if (revalidation.valid) {
            req.logger.debug(`Model name normalized: "${validatedModel}" -> "${normalized}"`);
            validatedModel = normalized;
          } else {
            return res.status(400).json({
              error: 'Invalid model name',
              details: validation.error,
              originalModel: validatedModel,
              normalizedModel: normalized,
              availableModels: availableModels.slice(0, 10).map(m => m.id || m),
              requestId: req.requestId,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          return res.status(400).json({
            error: 'Invalid model name',
            details: validation.error,
            originalModel: validatedModel,
            availableModels: availableModels.slice(0, 10).map(m => m.id || m),
            requestId: req.requestId,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (validation.normalized && validation.normalized !== validatedModel) {
        validatedModel = validation.normalized;
        req.logger.debug(`Model name normalized: "${model}" -> "${validatedModel}"`);
      }
    } catch (validationError) {
      req.logger.warn('Model validation error (continuing with original model)', { error: validationError.message });
    }

    const { orchestrateAgentExecution } = await import('./services/agentOrchestrator.js');
    const result = await orchestrateAgentExecution({
      userInput,
      sessionId,
      campaignId,
      characterIds,
      model: validatedModel,
    });

    res.json(result);
  } catch (err) {
    req.logger.error('Agent endpoint error', err, { endpoint: req.path || '/api/agent' });

    const { isRateLimitError, isModelNotFoundError } = await import('./lib/retryUtils.js');
    const rateLimitInfo = isRateLimitError(err);
    const isModelError = isModelNotFoundError(err);

    let userFriendlyMessage = err.message;
    let errorType = 'unknown';
    let statusCode = err.statusCode || 500;

    if (rateLimitInfo) {
      errorType = 'rate_limit';
      userFriendlyMessage = `Rate limit exceeded. ${rateLimitInfo.retryAfter ? `Please retry in ${Math.ceil(rateLimitInfo.retryAfter)} seconds.` : 'Please try again later.'}`;
      if (rateLimitInfo.retryAfter) {
        userFriendlyMessage += `\n\nYou've reached the free tier quota limit. Consider upgrading to a paid plan or waiting before retrying.`;
      }
      statusCode = 429;
    } else if (isModelError) {
      errorType = 'model_not_found';
      userFriendlyMessage = `Model not found or not supported. Please check the model name and try again.`;
      statusCode = 400;
    }

    if (rateLimitInfo?.retryAfter) {
      res.setHeader('Retry-After', Math.ceil(rateLimitInfo.retryAfter));
    }

    res.status(statusCode).json({
      error: 'Agent error',
      errorType,
      details: err.message,
      userMessage: userFriendlyMessage,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      method: req.method,
      ...(rateLimitInfo && { retryAfter: rateLimitInfo.retryAfter }),
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}

app.post(agentV1Path, validateAgentRequest, handlePostAgent);
app.post(agentPath, validateAgentRequest, handlePostAgent);

/**
 * GET /api/v1/pokemon-media/:idOrName and GET /api/pokemon-media/:idOrName (legacy)
 * Fetch Pokemon media (official art + sprites) with light caching.
 */
async function handlePokemonMedia(req, res) {
  const { idOrName } = req.params;
  const { sessionId } = req.query;

  try {
    const media = await fetchPokemonMedia({ idOrName, sessionId });
    if (!media) {
      return res.status(404).json({
        error: 'Pokemon media not found',
        details: `No media available for ${idOrName}`,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        endpoint: req.path,
        method: req.method,
      });
    }

    res.json(media);
  } catch (err) {
    req.logger.error('Pokemon media error', err, { endpoint: req.path });
    res.status(500).json({
      error: 'Pokemon media error',
      details: err.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      method: req.method,
    });
  }
}

app.get(`${API_V1}/pokemon-media/:idOrName`, handlePokemonMedia);
app.get('/api/pokemon-media/:idOrName', handlePokemonMedia);

/**
 * POST /api/v1/import and POST /api/import (legacy)
 * Import session data. Legacy /api/import is used by the client and Vercel api/import.js.
 * Expects: { session_data?, messages?, characters?, campaign?, custom_pokemon?, continuity?, options }
 * Returns: { sessionId, session, imported_components, warnings, migrated? }
 */
async function handlePostImport(req, res) {
  try {
    const { createSession, saveSession } = await import('./storage/sessionStore.js');

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
    let migrated = false;

    const { isLegacyFormat, migrateExampleToSchema } = await import('./lib/migrateSession.js');
    const isLegacy = session_data && isLegacyFormat(session_data);

    const campaignId = session_data?.campaign_id || campaign?.campaign_id || null;
    const characterIds = session_data?.character_ids || characters?.map((c) => c.character_id).filter(Boolean) || [];

    let newSession;

    if (isLegacy) {
      req.logger.info('Detected legacy session format, migrating');
      warnings.push('Legacy session format detected and automatically migrated to schema-compliant format');
      newSession = migrateExampleToSchema(session_data);
      migrated = true;
    } else {
      newSession = await createSession(campaignId, characterIds);
    }

    if (importComponents.includes('session') && session_data) {
      const originalSessionId = newSession.session.session_id;
      newSession.session = {
        ...newSession.session,
        ...session_data,
        session_id: originalSessionId,
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

    try {
      const validated = PokemonSessionSchema.parse(newSession);
      await saveSession(validated.session.session_id, validated);

      const response = {
        sessionId: validated.session.session_id,
        session: validated,
        imported_components: migrated ? ['all'] : importComponents,
        warnings: warnings.length > 0 ? warnings : undefined,
        migrated: migrated || undefined,
      };

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
    req.logger.error('Import endpoint error', err, { endpoint: req.path || '/api/import' });
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
}

app.post(`${API_V1}/import`, handlePostImport);
app.post('/api/import', handlePostImport);

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

/**
 * Campaign Management Endpoints (v1)
 */

/**
 * POST /api/v1/campaigns
 * Create a new campaign
 * Expects: { region?, locations?, factions?, recurring_npcs?, world_facts? }
 * Returns: { campaign_id, campaign }
 */
app.post(`${API_V1}/campaigns`, async (req, res) => {
  try {
    const {
      createCampaign,
    } = await import('./services/campaignService.js');
    
    const campaign = await createCampaign(req.body || {});
    
    res.status(201).json({
      campaign_id: campaign.campaign_id,
      campaign: campaign,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
    } catch (error) {
      req.logger.error('Campaign creation error', error, {
        endpoint: '/api/campaigns',
      });
    res.status(500).json({
      error: 'Campaign creation failed',
      details: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/campaigns
 * List all campaigns
 * Returns: { campaigns: Array<campaign> }
 */
app.get('/api/campaigns', async (req, res) => {
  try {
    const {
      listCampaigns,
    } = await import('./services/campaignService.js');
    
    const campaigns = await listCampaigns();
    
    res.json({
      campaigns: campaigns,
      count: campaigns.length,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Campaign listing error:', error);
    res.status(500).json({
      error: 'Campaign listing failed',
      details: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/campaigns/:id
 * Get campaign by ID
 * Returns: { campaign }
 */
app.get(`${API_V1}/campaigns/:id`, async (req, res) => {
  try {
    const {
      getCampaign,
    } = await import('./services/campaignService.js');
    
    const campaignId = req.params.id;
    const campaign = await getCampaign(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found',
        campaign_id: campaignId,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    }
    
    res.json({
      campaign: campaign,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.logger.error('Campaign retrieval error', error, {
      endpoint: `/api/campaigns/${req.params.id}`,
    });
    res.status(500).json({
      error: 'Campaign retrieval failed',
      details: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/campaigns/:id
 * Update campaign
 * Expects: { region?, locations?, factions?, recurring_npcs?, world_facts? }
 * Returns: { campaign }
 */
app.put('/api/campaigns/:id', async (req, res) => {
  try {
    const {
      updateCampaign,
    } = await import('./services/campaignService.js');
    
    const campaignId = req.params.id;
    const campaign = await updateCampaign(campaignId, req.body || {});
    
    res.json({
      campaign: campaign,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Campaign not found',
        campaign_id: req.params.id,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    }
    
    console.error('Campaign update error:', error);
    res.status(500).json({
      error: 'Campaign update failed',
      details: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/v1/campaigns/:id
 * Delete campaign and all associated sessions
 * Returns: { success: true }
 */
app.delete(`${API_V1}/campaigns/:id`, async (req, res) => {
  try {
    const {
      deleteCampaign,
    } = await import('./services/campaignService.js');
    
    const campaignId = req.params.id;
    const deleted = await deleteCampaign(campaignId);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Campaign not found',
        campaign_id: campaignId,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    }
    
    res.json({
      success: true,
      campaign_id: campaignId,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.logger.error('Campaign deletion error', error, {
      endpoint: `/api/campaigns/${req.params.id}`,
    });
    res.status(500).json({
      error: 'Campaign deletion failed',
      details: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Campaign Sub-resource Routes ──────────────────────────────────────────────

/**
 * POST /api/v1/campaigns/:id/session-briefs
 * Save a new session brief JSON file for the given campaign.
 * Body: SessionBrief object (see SessionBriefComposer schema)
 * Returns: { brief_id, brief, path }
 */
app.post(`${API_V1}/campaigns/:id/session-briefs`, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const brief = req.body;

    if (!brief || !brief.episode_title?.trim()) {
      return res.status(400).json({
        error: 'episode_title is required',
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    }

    const { readFileSync, writeFileSync, existsSync, mkdirSync } = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const campaignDir = path.join(__dirname, '..', 'data', 'campaigns', campaignId);

    if (!existsSync(campaignDir)) {
      return res.status(404).json({
        error: `Campaign '${campaignId}' not found`,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    }

    const briefsDir = path.join(campaignDir, 'session-briefs');
    if (!existsSync(briefsDir)) mkdirSync(briefsDir, { recursive: true });

    // Derive a stable brief ID from episode number + slugified title
    const slug = brief.episode_title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const briefId = `session-${String(brief.episode_number ?? 1).padStart(2, '0')}-${slug}`;
    const briefPath = path.join(briefsDir, `${briefId}.json`);

    const fullBrief = {
      ...brief,
      id: briefId,
      campaign_id: campaignId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    writeFileSync(briefPath, JSON.stringify(fullBrief, null, 2), 'utf-8');

    req.logger?.info('Session brief saved', { campaignId, briefId });

    res.status(201).json({
      brief_id: briefId,
      brief: fullBrief,
      path: briefPath,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.logger?.error('Session brief save error', error, {
      endpoint: `${API_V1}/campaigns/${req.params.id}/session-briefs`,
    });
    res.status(500).json({
      error: 'Failed to save session brief',
      details: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/campaigns/:id/session-briefs
 * List all session briefs for a campaign.
 * Returns: { briefs: Array<brief> }
 */
app.get(`${API_V1}/campaigns/:id/session-briefs`, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const { existsSync, readdirSync, readFileSync } = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const briefsDir = path.join(__dirname, '..', 'data', 'campaigns', campaignId, 'session-briefs');

    if (!existsSync(briefsDir)) {
      return res.json({ briefs: [], requestId: req.requestId, timestamp: new Date().toISOString() });
    }

    const briefs = readdirSync(briefsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        try {
          return JSON.parse(readFileSync(`${briefsDir}/${f}`, 'utf-8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0));

    res.json({ briefs, count: briefs.length, requestId: req.requestId, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list session briefs', details: error.message });
  }
});

/**
 * POST /api/v1/campaigns/:id/custom-pokemon
 * Save a custom Pokémon entry for the given campaign.
 * Returns: { pokemon_id, pokemon }
 */
app.post(`${API_V1}/campaigns/:id/custom-pokemon`, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const pokemon = req.body;

    if (!pokemon?.name?.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const { existsSync, writeFileSync, mkdirSync } = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const dir = path.join(__dirname, '..', 'data', 'campaigns', campaignId, 'custom-pokemon');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const id = pokemon.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const full = { ...pokemon, id, campaign_id: campaignId, created_at: new Date().toISOString() };
    writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(full, null, 2), 'utf-8');

    res.status(201).json({
      pokemon_id: id,
      pokemon: full,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save custom Pokémon', details: error.message });
  }
});

/**
 * PUT /api/v1/campaigns/:id/custom-pokemon/:pokemonId
 * Update an existing custom Pokémon.
 */
app.put(`${API_V1}/campaigns/:id/custom-pokemon/:pokemonId`, async (req, res) => {
  try {
    const { campaignId: id, pokemonId } = { campaignId: req.params.id, pokemonId: req.params.pokemonId };
    const { existsSync, writeFileSync, readFileSync } = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(__dirname, '..', 'data', 'campaigns', id, 'custom-pokemon', `${pokemonId}.json`);

    if (!existsSync(filePath)) return res.status(404).json({ error: 'Custom Pokémon not found' });

    const existing = JSON.parse(readFileSync(filePath, 'utf-8'));
    const updated = { ...existing, ...req.body, id: pokemonId, campaign_id: id, updated_at: new Date().toISOString() };
    writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');

    res.json({ pokemon: updated, requestId: req.requestId, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update custom Pokémon', details: error.message });
  }
});

// ── Session Runtime Routes — STO-29 + STO-32 ─────────────────────────────────

/**
 * POST /api/v1/sessions
 * Create a new session from a campaign + player roster.
 * Body: { campaign_id, session_brief_id?, players[] }
 * Returns: { session_id, dm_opening_narration, session }
 */
app.post(`${API_V1}/sessions`, async (req, res) => {
  try {
    const { createSession, SessionStartupError } = await import('./services/sessionStartupService.js');
    const result = await createSession(req.body);
    res.status(201).json({
      session_id: result.sessionId,
      dm_opening_narration: result.dmOpeningNarration,
      session: result.session,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const status = error.code === 'CAMPAIGN_NOT_FOUND' ? 404 : 400;
    req.logger.error('Session creation error', error, { endpoint: `${API_V1}/sessions` });
    res.status(status).json({
      error: error.message,
      code: error.code ?? 'SESSION_CREATE_FAILED',
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/sessions/:id
 * Retrieve full session state.
 */
app.get(`${API_V1}/sessions/:id`, async (req, res) => {
  try {
    const adapter = getDefaultAdapter();
    const session = await adapter.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        session_id: req.params.id,
        requestId: req.requestId,
      });
    }
    res.json({ session, requestId: req.requestId, timestamp: new Date().toISOString() });
  } catch (error) {
    req.logger.error('Session fetch error', error);
    res.status(500).json({ error: error.message, requestId: req.requestId });
  }
});

/**
 * POST /api/v1/sessions/:id/activate
 * Transition session from lobby → active.
 * STO-32
 */
app.post(`${API_V1}/sessions/:id/activate`, async (req, res) => {
  try {
    const { activateSession } = await import('./services/sessionStartupService.js');
    const session = await activateSession(req.params.id);
    res.json({ session, requestId: req.requestId, timestamp: new Date().toISOString() });
  } catch (error) {
    const status = error.code === 'SESSION_NOT_FOUND' ? 404 : 500;
    req.logger.error('Session activate error', error);
    res.status(status).json({ error: error.message, requestId: req.requestId });
  }
});

/**
 * POST /api/v1/sessions/:id/pass-turn
 * Rotate active trainer (local multiplayer).
 * Body: { to_trainer_id? }  — if omitted, cycles to next in turn order
 * STO-29
 */
app.post(`${API_V1}/sessions/:id/pass-turn`, async (req, res) => {
  try {
    const { passSessionTurn } = await import('./services/sessionStartupService.js');
    const session = await passSessionTurn(req.params.id, req.body?.to_trainer_id);
    res.json({
      active_trainer_id: session.multiplayer?.active_trainer_id,
      players: session.multiplayer?.players,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const status = error.code === 'SESSION_NOT_FOUND' ? 404
      : error.code === 'INVALID_TRAINER' ? 400 : 500;
    req.logger.error('Pass turn error', error);
    res.status(status).json({ error: error.message, requestId: req.requestId });
  }
});

// ── Image Generation Route — STO-36 ───────────────────────────────────────────

/**
 * POST /api/v1/image
 * Generate a DALL-E 3 image for a narrative moment.
 * Body: { subject: string, style: 'scene'|'pokemon'|'portrait', session_id?: string }
 * Returns: { url, revisedPrompt, sessionImagesUsed }
 * Rate-limited per session via IMAGE_LIMIT_PER_SESSION env var (default 5).
 */
app.post(`${API_V1}/image`, async (req, res) => {
  try {
    const { generateImage } = await import('./tools/generateImage.js');
    const { subject, style = 'scene', session_id } = req.body ?? {};

    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'subject is required', requestId: req.requestId });
    }

    const result = await generateImage({ subject, style, sessionId: session_id });
    res.json({ ...result, requestId: req.requestId, timestamp: new Date().toISOString() });
  } catch (error) {
    const isLimit = error.message?.includes('limit reached');
    req.logger.warn('Image generation error', { error: error.message });
    res.status(isLimit ? 429 : 500).json({
      error: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

// ── End Image Generation Route ─────────────────────────────────────────────────

// ── End Session Runtime Routes ─────────────────────────────────────────────────

// Catch-all for undefined routes - return JSON (must be after all routes)
// Catch-all for unmatched routes (for debugging)
app.use((req, res) => {
  req.logger.warn('Unmatched route', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
  });
  res.status(404).json({ 
    error: 'Not found', 
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
  });
});

// Error handler middleware - must be last
app.use(errorHandler);

// Export app for Vercel serverless functions
export default app;

// Only start server if running locally (not in Vercel)
if (process.env.VERCEL !== '1' && process.env.VERCEL_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Agentic server listening on port ${PORT}`);
  });
}