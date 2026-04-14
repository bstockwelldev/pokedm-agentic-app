/**
 * KB Loader — reads Markdown knowledge files from the filesystem.
 *
 * Core files live in:      server/kb/knowledge/  and  server/kb/systems/
 * Campaign overrides live in: data/campaigns/<id>/kb/
 *
 * Campaign KB files can override core files by using the same filename.
 * Example: data/campaigns/kanto-classic/kb/battle-rules.md overrides core.
 *
 * Z1: loadKnowledgeBase(campaignDir?)  → { filename: content, ... }
 * Z2: loadMarkdownDir(dir)             → { filename: content, ... }
 *     buildKBText(entries, subset?)    → plain text for prompts
 * Z3: readMarkdownFile(filePath)       → string | null
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CORE_DIRS = [
  join(__dirname, 'knowledge'),
  join(__dirname, 'systems'),
];

// ── Z1: Top-level orchestrator ────────────────────────────────────────────────

/**
 * Load the full knowledge base, optionally merging campaign-specific overrides.
 *
 * @param {string|null} campaignDir - Absolute path to campaign directory
 *   (e.g. `server/data/campaigns/kanto-classic`). Pass null for core only.
 * @returns {{ [filename: string]: string }} Map of filename (no ext) → markdown text
 */
export async function loadKnowledgeBase(campaignDir = null) {
  const coreEntries = await loadCoreDirs();
  const campaignEntries = campaignDir
    ? await loadMarkdownDir(join(campaignDir, 'kb'))
    : {};

  // Campaign-level files override core files with the same name
  return { ...coreEntries, ...campaignEntries };
}

/**
 * Get formatted KB text for a given subset of topics, ready to inject into a prompt.
 *
 * @param {string|null} campaignDir - Campaign directory for overrides
 * @param {string[]} [subset] - Array of filenames (no ext) to include; omit for all
 * @returns {Promise<string>} Formatted markdown text
 */
export async function getKBText(campaignDir = null, subset = null) {
  const entries = await loadKnowledgeBase(campaignDir);
  return buildKBText(entries, subset);
}

/**
 * Get KB rules text for a specific Pokémon classification (backwards-compatible).
 *
 * @param {string} classification - e.g. 'regional_variant', 'new_species'
 * @param {string|null} campaignDir
 * @returns {Promise<string>}
 */
export async function getKBRulesText(classification, campaignDir = null) {
  const subsetMap = {
    regional_variant:  ['custom-pokemon-design', 'regional-variants'],
    regional_evolution: ['custom-pokemon-design', 'regional-variants'],
    split_evolution:   ['custom-pokemon-design', 'regional-variants'],
    convergent_species: ['custom-pokemon-design', 'regional-variants'],
    new_species:       ['custom-pokemon-design', 'regional-variants'],
    battle:            ['battle-rules', 'status-conditions'],
    catch:             ['catch-mechanics'],
    affinity:          ['type-affinity-rules'],
    progression:       ['trainer-progression'],
  };

  const subset = subsetMap[classification] ?? null;
  return getKBText(campaignDir, subset);
}

// ── Z2: Coordinators ──────────────────────────────────────────────────────────

/**
 * Load all core KB directories.
 * @returns {Promise<{ [filename: string]: string }>}
 */
async function loadCoreDirs() {
  const results = {};
  for (const dir of CORE_DIRS) {
    const entries = await loadMarkdownDir(dir);
    Object.assign(results, entries);
  }
  return results;
}

/**
 * Load all .md files from a directory.
 * Returns empty object if directory doesn't exist (safe for optional campaign KB).
 *
 * @param {string} dir - Absolute path to directory
 * @returns {Promise<{ [filename: string]: string }>}
 */
export async function loadMarkdownDir(dir) {
  if (!existsSync(dir)) return {};

  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const entries = {};

  for (const file of files) {
    const key = basename(file, '.md');
    const content = readMarkdownFile(join(dir, file));
    if (content !== null) entries[key] = content;
  }

  return entries;
}

/**
 * Build a single formatted text block from KB entries for prompt injection.
 *
 * @param {{ [filename: string]: string }} entries
 * @param {string[]|null} subset - If provided, only include these keys
 * @returns {string}
 */
export function buildKBText(entries, subset = null) {
  const keys = subset
    ? subset.filter((k) => k in entries)
    : Object.keys(entries);

  return keys
    .map((k) => entries[k].trim())
    .join('\n\n---\n\n');
}

// ── Z3: Pure functions ────────────────────────────────────────────────────────

/**
 * Read a single markdown file safely.
 * @param {string} filePath
 * @returns {string|null}
 */
function readMarkdownFile(filePath) {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// ── Backwards-compat export ───────────────────────────────────────────────────
// Preserve KB_RULES for any code that imports it directly.
// Lazily populated on first access.
let _cachedRules = null;

export async function getKBRulesForClassification(classification) {
  const text = await getKBRulesText(classification);
  return { text, classification };
}

/**
 * @deprecated Use loadKnowledgeBase() or getKBText() instead.
 */
export const KB_RULES = new Proxy({}, {
  get(_, prop) {
    console.warn(`[KB] KB_RULES.${String(prop)} is deprecated. Use loadKnowledgeBase() or getKBText().`);
    return undefined;
  },
});
