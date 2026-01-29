/**
 * Campaign Service
 * Manages campaign creation and retrieval
 */

import { loadSession, listSessions, saveSession } from '../storage/sessionStore.js';
import { randomUUID } from 'crypto';
import { CampaignSchema } from '../schemas/session.js';
import logger from '../lib/logger.js';

/**
 * Create a new campaign
 * @param {object} campaignData - Campaign data (region, locations, etc.)
 * @returns {Promise<object>} Created campaign with campaign_id
 */
export async function createCampaign(campaignData) {
  const campaignId = randomUUID();
  const now = new Date().toISOString();

  const campaign = {
    campaign_id: campaignId,
    region: campaignData.region || {
      name: '',
      theme: '',
      description: '',
      environment_tags: [],
      climate: '',
    },
    locations: campaignData.locations || [],
    factions: campaignData.factions || [],
    recurring_npcs: campaignData.recurring_npcs || [],
    world_facts: campaignData.world_facts || [],
  };

  // Validate campaign schema
  const validated = CampaignSchema.parse(campaign);

  // Create an initial session for this campaign to store it
  // In a full implementation, campaigns would be stored separately
  const { createSession } = await import('../storage/sessionStore.js');
  const initialSession = await createSession(campaignId, []);

  // Update the session's campaign data
  initialSession.campaign = validated;
  await saveSession(initialSession.session.session_id, initialSession);

  return validated;
}

/**
 * Get campaign by ID
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<object|null>} Campaign data or null if not found
 */
export async function getCampaign(campaignId) {
  // Find a session with this campaign_id
  const sessions = await listSessions(campaignId);
  if (sessions.length === 0) {
    return null;
  }

  // Load the first session to get campaign data
  const session = await loadSession(sessions[0]);
  return session?.campaign || null;
}

/**
 * List all campaigns
 * @returns {Promise<object[]>} Array of campaigns
 */
export async function listCampaigns() {
  // Get all sessions
  const allSessions = await listSessions();
  const campaignsMap = new Map();

  // Extract unique campaigns from sessions
  for (const sessionId of allSessions) {
    try {
      const session = await loadSession(sessionId);
      if (session?.campaign?.campaign_id) {
        const campaignId = session.campaign.campaign_id;
        if (!campaignsMap.has(campaignId)) {
          campaignsMap.set(campaignId, session.campaign);
        }
      }
    } catch (error) {
      // Skip invalid sessions
      continue;
    }
  }

  return Array.from(campaignsMap.values());
}

/**
 * Update campaign
 * @param {string} campaignId - Campaign ID
 * @param {object} updates - Partial campaign data to update
 * @returns {Promise<object>} Updated campaign
 */
export async function updateCampaign(campaignId, updates) {
  const campaign = await getCampaign(campaignId);
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  // Merge updates
  const updated = {
    ...campaign,
    ...updates,
    campaign_id: campaignId, // Preserve campaign_id
  };

  // Validate
  const validated = CampaignSchema.parse(updated);

  // Update all sessions with this campaign_id
  const sessions = await listSessions(campaignId);
  for (const sessionId of sessions) {
    try {
      const session = await loadSession(sessionId);
      if (session) {
        session.campaign = validated;
        await saveSession(sessionId, session);
      }
    } catch (error) {
      logger.warn('Failed to update campaign in session', { sessionId, error: error.message, stack: error.stack });
      continue;
    }
  }

  return validated;
}

/**
 * Delete campaign (and all associated sessions)
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteCampaign(campaignId) {
  const sessions = await listSessions(campaignId);
  if (sessions.length === 0) {
    return false;
  }

  // Delete all sessions for this campaign
  const { deleteSession } = await import('../storage/sessionStore.js');
  const adapter = (await import('../storage/adapters/index.js')).getDefaultAdapter();

  for (const sessionId of sessions) {
    try {
      await adapter.deleteSession(sessionId);
    } catch (error) {
      logger.warn('Failed to delete session', { sessionId, error: error.message, stack: error.stack });
    }
  }

  return true;
}

export default {
  createCampaign,
  getCampaign,
  listCampaigns,
  updateCampaign,
  deleteCampaign,
};
