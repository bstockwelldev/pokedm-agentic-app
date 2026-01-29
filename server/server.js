// PokeDM Agentic Flow Server
// Multi-agent system using Vercel AI SDK v6 with Router/DM/Rules/State/Lore/Design agents

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto, { randomUUID } from 'crypto';

// Import logger
import logger, { Logger } from './lib/logger.js';

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
app.use(cors());
app.use(express.json());

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

// Default model
const DEFAULT_MODEL = process.env.LLM_MODEL || 'gemini-1.5-pro-latest';

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
 * POST /api/v1/agent
 *
 * Main agent endpoint that routes to appropriate specialized agent
 * Z1-level function: handles HTTP routing and validation
 * Expects: { userInput, sessionId, model?, campaignId?, characterIds? }
 * Returns: { narration, choices, session, steps }
 */
app.post(agentV1Path, validateAgentRequest, async (req, res) => {
  req.logger.debug('/api/agent route matched', {
    method: req.method,
    path: req.path,
    url: req.url,
    agentPath,
    hasBody: !!req.body,
  });
  
  try {
    const { userInput, sessionId, model, campaignId, characterIds } = req.body;
    req.logger.debug('request body parsed', {
      hasUserInput: !!userInput,
      hasSessionId: !!sessionId,
      hasModel: !!model,
    });

    // Z2: Validate and normalize model name (delegated to modelValidator)
    let validatedModel = model || DEFAULT_MODEL;
    try {
      const { validateModelName, normalizeModelName } = await import('./lib/modelValidator.js');
      const { getAllModels } = await import('./lib/modelFetcher.js');
      
      // Try to get available models for validation
      let availableModels = [];
      try {
        availableModels = await getAllModels();
      } catch (err) {
        req.logger.warn('Could not fetch available models for validation', { error: err.message });
      }

      const validation = validateModelName(validatedModel, availableModels);
      if (!validation.valid) {
        // Try to normalize and validate again
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
      // Continue with original model if validation fails
    }

    // Z2: Orchestrate agent execution (delegated to orchestrator service)
    const { orchestrateAgentExecution } = await import('./services/agentOrchestrator.js');
    const result = await orchestrateAgentExecution({
      userInput,
      sessionId,
      campaignId,
      characterIds,
      model: validatedModel,
    });

    // Z1: Return response
    res.json(result);
  } catch (err) {
    req.logger.error('Agent endpoint error', err, {
      endpoint: '/api/agent',
    });
    
    // Check for rate limit errors and provide user-friendly message
    const { isRateLimitError, isModelNotFoundError } = await import('./lib/retryUtils.js');
    const rateLimitInfo = isRateLimitError(err);
    const isModelError = isModelNotFoundError(err);

    let errorMessage = err.message;
    let userFriendlyMessage = errorMessage;
    let errorType = 'unknown';

    if (rateLimitInfo) {
      errorType = 'rate_limit';
      userFriendlyMessage = `Rate limit exceeded. ${rateLimitInfo.retryAfter ? `Please retry in ${Math.ceil(rateLimitInfo.retryAfter)} seconds.` : 'Please try again later.'}`;
      if (rateLimitInfo.retryAfter) {
        userFriendlyMessage += `\n\nYou've reached the free tier quota limit. Consider upgrading to a paid plan or waiting before retrying.`;
      }
    } else if (isModelError) {
      errorType = 'model_not_found';
      userFriendlyMessage = `Model not found or not supported. Please check the model name and try again.`;
    }

    res.status(500).json({ 
      error: 'Agent error', 
      errorType,
      details: errorMessage,
      userMessage: userFriendlyMessage,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      method: req.method,
      ...(rateLimitInfo && { retryAfter: rateLimitInfo.retryAfter }),
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * POST /api/import
 * 
 * Import session data from export file
 * Expects: { session_data?, messages?, characters?, campaign?, custom_pokemon?, continuity?, options }
 * Supports automatic migration from legacy/example format
 * Returns: { sessionId, session, imported_components, warnings, migrated? }
 * 
 * Note: In Vercel, when served from api/import.js, the path is preserved as /api/import
 */
app.post(`${API_V1}/import`, async (req, res) => {
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
    let migrated = false;

    // Check if this is a legacy format session that needs migration
    const { isLegacyFormat, migrateExampleToSchema } = await import('./lib/migrateSession.js');
    const isLegacy = session_data && isLegacyFormat(session_data);

    // Extract campaignId and characterIds before conditional logic
    const campaignId = session_data?.campaign_id || campaign?.campaign_id || null;
    const characterIds = session_data?.character_ids || characters?.map((c) => c.character_id).filter(Boolean) || [];
    
    let newSession;
    
    if (isLegacy) {
      // Migrate legacy format to schema-compliant format
      req.logger.info('Detected legacy session format, migrating');
      warnings.push('Legacy session format detected and automatically migrated to schema-compliant format');
      newSession = migrateExampleToSchema(session_data);
      migrated = true;
    } else {
      // Standard import flow
      newSession = await createSession(campaignId, characterIds);
    }

    // Merge imported components (applies to both legacy and standard imports)
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
      await saveSession(validated.session.session_id, validated);

      const response = {
        sessionId: validated.session.session_id,
        session: validated,
        imported_components: migrated ? ['all'] : importComponents,
        warnings: warnings.length > 0 ? warnings : undefined,
        migrated: migrated || undefined,
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
    req.logger.error('Import endpoint error', err, {
      endpoint: '/api/import',
    });
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