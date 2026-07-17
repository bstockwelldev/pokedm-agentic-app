/**
 * Campaign Loader — STO-26
 *
 * Loads and caches campaign config files from server/data/campaigns/<campaignId>/.
 * Returns a unified CampaignBundle used by buildDMContext in dm.js.
 *
 * Files loaded per campaign:
 *   meta.json         — CampaignMetaSchema
 *   world.json        — CampaignWorldSchema (locations, world facts, NPCs)
 *   factions.json     — CampaignFactionsSchema
 *   challenges.json   — CampaignChallengesSchema
 *   session-brief.json — SessionBriefSchema (current episode brief)
 *
 * All files are optional except meta.json; missing files produce null fields.
 * Cache is invalidated when the campaignId changes or invalidateCampaignCache() is called.
 *
 * Z1: loadCampaign          — orchestrate load + validate + cache
 * Z2: readCampaignFiles     — read all JSON files for a campaign
 *     validateCampaignData  — parse with Zod schemas (warn on failure, don't throw)
 *     buildCampaignContext  — assemble a DM-ready context string from bundle
 * Z3: readJsonFile          — safe JSON file reader (returns null on missing/invalid)
 *     getCampaignDir        — resolve the campaign directory path
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  CampaignMetaSchema,
  CampaignWorldSchema,
  CampaignFactionsSchema,
  CampaignChallengesSchema,
  SessionBriefSchema,
} from '../schemas/campaign.js';
import logger from '../lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAMPAIGNS_DIR = join(__dirname, '../data/campaigns');

/** In-process cache: campaignId → CampaignBundle */
const campaignCache = new Map();

// ── Z1: Orchestrator ───────────────────────────────────────────────────────────

/**
 * Load a campaign bundle (cached).
 *
 * @param {string} campaignId  e.g. "aurora-region"
 * @returns {object|null}  CampaignBundle or null if meta.json missing
 */
export function loadCampaign(campaignId) {
  if (!campaignId) return null;
  const resolvedId = resolveCampaignDataDir(campaignId);
  if (campaignCache.has(resolvedId)) return campaignCache.get(resolvedId);

  const rawFiles = readCampaignFiles(resolvedId);
  if (!rawFiles.meta) {
    logger.warn('Campaign meta.json not found', { campaignId, resolvedId });
    campaignCache.set(resolvedId, null);
    return null;
  }

  const bundle = validateCampaignData(resolvedId, rawFiles);
  campaignCache.set(resolvedId, bundle);
  return bundle;
}

/**
 * Build the DM context string for a campaign.
 * Called by buildDMContext in dm.js to append campaign-level info.
 *
 * @param {string} campaignId
 * @param {string} [currentLocationId]  Used to surface relevant location details
 * @returns {string}  Formatted context block
 */
export function buildCampaignContext(campaignId, currentLocationId) {
  const bundle = loadCampaign(campaignId);
  if (!bundle) return '';
  return assembleCampaignContext(bundle, currentLocationId);
}

/** Invalidate the in-process cache for a campaign. */
export function invalidateCampaignCache(campaignId) {
  if (campaignId) {
    campaignCache.delete(campaignId);
  } else {
    campaignCache.clear();
  }
}

// ── Z2: Coordinators ───────────────────────────────────────────────────────────

/**
 * Read all JSON files for a campaign from disk.
 * @returns {{ meta, world, factions, challenges, sessionBrief }}  Raw parsed JSON or null
 */
function readCampaignFiles(campaignId) {
  const dir = getCampaignDir(campaignId);
  return {
    meta:         readJsonFile(join(dir, 'meta.json')),
    world:        readJsonFile(join(dir, 'world.json')),
    factions:     readJsonFile(join(dir, 'factions.json')),
    challenges:   readJsonFile(join(dir, 'challenges.json')),
    sessionBrief: readJsonFile(join(dir, 'session-brief.json')),
  };
}

/**
 * Parse raw files through Zod schemas. Logs warnings on parse failure but
 * always returns a bundle — invalid sections are null rather than throwing.
 */
function validateCampaignData(campaignId, rawFiles) {
  const meta         = parseSafe(CampaignMetaSchema, rawFiles.meta, campaignId, 'meta');
  const world        = parseSafe(CampaignWorldSchema, rawFiles.world, campaignId, 'world');
  const factions     = parseSafe(CampaignFactionsSchema, rawFiles.factions, campaignId, 'factions');
  const challenges   = parseSafe(CampaignChallengesSchema, rawFiles.challenges, campaignId, 'challenges');
  const sessionBrief = parseSafe(SessionBriefSchema, rawFiles.sessionBrief, campaignId, 'session-brief');

  return { meta, world, factions, challenges, sessionBrief, campaignId };
}

/**
 * Assemble a DM-ready context string from a validated campaign bundle.
 * Keeps context tight — only the most actionable facts, no full JSON dumps.
 */
function assembleCampaignContext(bundle, currentLocationId) {
  const { meta, world, factions, challenges, sessionBrief } = bundle;
  const lines = [];

  // Campaign identity
  if (meta) {
    lines.push(`## Campaign: ${meta.title}`);
    lines.push(`Region: ${meta.region_name} | Tone: ${meta.tone} | Rating: ${meta.age_rating}`);
  }

  // Current episode brief
  if (sessionBrief) {
    lines.push(`\n### Episode ${sessionBrief.episode_number}: Scene Setup`);
    lines.push(sessionBrief.scene_setup);
    if (sessionBrief.objectives?.length) {
      lines.push('\nObjectives:');
      sessionBrief.objectives.forEach((obj) => {
        const flag = obj.optional ? ' (optional)' : '';
        lines.push(`- ${obj.description}${flag}`);
      });
    }
    if (sessionBrief.dm_notes) {
      lines.push(`\nDM Notes: ${sessionBrief.dm_notes}`);
    }
  }

  // World facts (revealed by default — schema field: description + revealed_by_default)
  if (world?.world_facts?.length) {
    const revealed = world.world_facts.filter((f) => f.revealed_by_default);
    if (revealed.length) {
      lines.push('\n### World Facts (Known to Players)');
      revealed.forEach((f) => {
        const label = f.title ? `${f.title}: ${f.description}` : f.description;
        lines.push(`- ${label}`);
      });
    }
  }

  // Current location details
  if (world?.locations && currentLocationId) {
    const loc = world.locations.find((l) => l.location_id === currentLocationId);
    if (loc) {
      lines.push(`\n### Current Location: ${loc.name}`);
      lines.push(loc.description);
      if (loc.level_range) {
        lines.push(`Level range: ${loc.level_range.min}–${loc.level_range.max}`);
      }
      if (loc.connections?.length) {
        const connectedNames = loc.connections
          .map((cId) => world.locations.find((l) => l.location_id === cId)?.name ?? cId)
          .join(', ');
        lines.push(`Connected to: ${connectedNames}`);
      }
    }
  }

  // Active factions summary (schema field: tone, not alignment)
  if (factions?.factions?.length) {
    lines.push('\n### Active Factions');
    factions.factions.forEach((f) => {
      lines.push(`- **${f.name}** (${f.tone}): ${f.motivation}`);
    });
  }

  // Key NPCs (schema field: notes, not description)
  if (world?.recurring_npcs?.length) {
    lines.push('\n### Key NPCs');
    world.recurring_npcs.forEach((npc) => {
      const detail = npc.notes ? ` — ${npc.notes}` : '';
      lines.push(`- **${npc.name}** [${npc.role}]: ${npc.disposition}${detail}`);
    });
  }

  // Active challenges (schema fields: type, recommended_level)
  if (challenges?.challenges?.length) {
    const gymOrBoss = challenges.challenges.filter(
      (c) => c.type === 'gym' || c.type === 'boss'
    );
    if (gymOrBoss.length) {
      lines.push('\n### Upcoming Challenges');
      gymOrBoss.forEach((c) => {
        const label = c.type === 'gym' ? `Gym (${c.badge_id})` : 'Boss Battle';
        lines.push(`- ${label} at ${c.location_id} — lv${c.recommended_level}`);
      });
    }
  }

  return lines.join('\n');
}

// ── Z3: Pure Helpers ───────────────────────────────────────────────────────────

/**
 * Resolve filesystem campaign folder from a session or meta campaign_id.
 * Handles underscore vs hyphen (celestide_isles → celestide-isles) and -v1 suffixes.
 */
export function resolveCampaignDataDir(campaignId) {
  if (!campaignId) return null;

  const normalized = String(campaignId);
  const candidates = [
    normalized,
    normalized.replace(/_/g, '-'),
    normalized.replace(/-v\d+(\.\d+)*$/i, ''),
    normalized.replace(/_/g, '-').replace(/-v\d+(\.\d+)*$/i, ''),
  ];

  for (const id of [...new Set(candidates)]) {
    const dir = join(CAMPAIGNS_DIR, id);
    if (existsSync(join(dir, 'meta.json')) || existsSync(join(dir, 'custom-pokemon.json'))) {
      return id;
    }
  }

  return normalized.replace(/_/g, '-');
}

/** Resolve the filesystem directory for a campaign. */
function getCampaignDir(campaignId) {
  return join(CAMPAIGNS_DIR, resolveCampaignDataDir(campaignId));
}

/** Read and parse a JSON file. Returns null if missing or malformed. */
function readJsonFile(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (err) {
    logger.warn('Failed to parse campaign JSON', { filePath, error: err.message });
    return null;
  }
}

/** Safely parse raw data through a Zod schema. Logs warnings, never throws. */
function parseSafe(schema, rawData, campaignId, section) {
  if (!rawData) return null;
  const result = schema.safeParse(rawData);
  if (!result.success) {
    logger.warn('Campaign data validation warning', {
      campaignId,
      section,
      issues: result.error.issues.slice(0, 3).map((i) => i.message),
    });
    // Return raw data as a best-effort fallback so partial data still surfaces
    return rawData;
  }
  return result.data;
}
