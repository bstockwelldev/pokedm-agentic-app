/**
 * Client-side session recap export utilities.
 * Deterministic export works offline; optional polish via API.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Build deterministic recap locally from session data (offline-capable).
 * Mirrors server recapExportService deterministic output.
 * @param {object} session
 * @returns {{ markdown: string, plainText: string }}
 */
export function buildLocalRecapExport(session) {
  const campaignName = session?.campaign?.region?.name || 'Pokémon Adventure';
  const episode = session?.session?.episode_title || 'Session Recap';
  const exportedAt = new Date().toISOString();

  const locations = collectLocationNames(session);
  const npcs = collectNpcNames(session);
  const teamDrift = collectTeamDriftLines(session);
  const pokemon = collectPokemonLines(session);
  const badges = collectBadgeLines(session);
  const hooks = collectHookLines(session);
  const narrative = buildNarrative(session, { locations, npcs, teamDrift, pokemon, hooks });

  const body = [
    '# Session Recap',
    '',
    `**Campaign:** ${campaignName}`,
    `**Episode:** ${episode}`,
    `**Exported:** ${exportedAt.slice(0, 10)}`,
    '',
    '## Story So Far',
    '',
    ...narrative,
    '',
    '## Locations Visited',
    ...listSection(locations, 'No locations recorded yet — your journey is just beginning!'),
    '',
    '## People Met',
    ...listSection(npcs, 'No familiar faces recorded yet.'),
    '',
    '## Team Drift',
    ...listSection(teamDrift, 'No Team Drift encounters recorded yet.'),
    '',
    '## Pokémon Discovered & Bonded',
    ...listSection(pokemon, 'No Pokémon discoveries recorded yet.'),
    '',
    '## Badges & Achievements',
    ...listSection(badges, 'No badges or major achievements yet.'),
    '',
    "## What's Still Open",
    ...listSection(hooks, 'No open story threads — explore freely!'),
    '',
    '---',
    '<!-- pokedm-recap-export: 1.0 -->',
  ].join('\n');

  const frontmatter = [
    '---',
    'pokedm_recap_export: "1.0"',
    `campaign: "${campaignName.replace(/"/g, '\\"')}"`,
    `episode: "${episode.replace(/"/g, '\\"')}"`,
    `exported_at: "${exportedAt}"`,
    '---',
    '',
  ].join('\n');

  const markdown = `${frontmatter}${body}`;
  const plainText = markdown
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^---[\s\S]*?---\n*/m, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  return { markdown, plainText };
}

function listSection(items, emptyLabel) {
  if (!items.length) {
    return [`- ${emptyLabel}`];
  }
  return items.map((item) => `- ${item}`);
}

function resolveLocationName(session, locationId) {
  const location = session?.campaign?.locations?.find((loc) => loc.location_id === locationId);
  return location?.name || '';
}

function resolveSpeciesName(speciesRef) {
  if (!speciesRef?.ref) {
    return 'Unknown Pokémon';
  }
  return speciesRef.ref
    .replace(/^canon:/, '')
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function collectLocationNames(session) {
  const names = new Set();
  for (const location of session?.campaign?.locations || []) {
    const corpus = [
      ...(session?.continuity?.timeline || []).map((entry) => entry.summary),
      ...(session?.session?.event_log || []).map((event) => `${event.summary} ${event.details || ''}`),
    ].join('\n');
    if (corpus.toLowerCase().includes(location.name.toLowerCase())) {
      names.add(location.name);
    }
  }
  const current = resolveLocationName(session, session?.session?.scene?.location_id);
  if (current) {
    names.add(current);
  }
  return [...names].sort();
}

function collectNpcNames(session) {
  const names = new Set();
  const corpus = [
    ...(session?.continuity?.timeline || []).map((entry) => entry.summary),
    ...(session?.session?.event_log || []).map((event) => `${event.summary} ${event.details || ''}`),
  ].join('\n');

  for (const npc of session?.campaign?.recurring_npcs || []) {
    if (corpus.toLowerCase().includes(npc.name.toLowerCase())) {
      names.add(npc.name);
    }
  }
  return [...names].sort();
}

function collectTeamDriftLines(session) {
  const pattern = /team\s*drift|drift\s*(scout|operative|engineer)|kaelix|mira/i;
  const lines = new Set();

  for (const entry of session?.continuity?.timeline || []) {
    if (pattern.test(entry.summary)) {
      lines.add(entry.summary);
    }
  }
  for (const event of session?.session?.event_log || []) {
    const text = `${event.summary}${event.details ? `: ${event.details}` : ''}`;
    if (pattern.test(text)) {
      lines.add(text);
    }
  }
  for (const hook of session?.continuity?.unresolved_hooks || []) {
    if (pattern.test(hook.description)) {
      lines.add(hook.description);
    }
  }
  return [...lines];
}

function collectPokemonLines(session) {
  const lines = new Set();
  for (const discovered of session?.continuity?.discovered_pokemon || []) {
    const species = resolveSpeciesName(discovered.species_ref);
    const location = resolveLocationName(session, discovered.first_seen_location_id);
    lines.add(`${species}${location ? ` (first seen at ${location})` : ''}${discovered.notes ? ` — ${discovered.notes}` : ''}`);
  }
  for (const character of session?.characters || []) {
    for (const pokemon of character.pokemon_party || []) {
      const label = pokemon.nickname
        ? `${pokemon.nickname} (${resolveSpeciesName(pokemon.species_ref)})`
        : resolveSpeciesName(pokemon.species_ref);
      lines.add(`${label} — traveling with ${character.trainer?.name || 'the party'}`);
    }
  }
  return [...lines];
}

function collectBadgeLines(session) {
  const lines = new Set();
  for (const character of session?.characters || []) {
    for (const achievement of character.achievements || []) {
      lines.add(`${achievement.title}: ${achievement.description}`);
    }
  }
  return [...lines];
}

function collectHookLines(session) {
  return (session?.continuity?.unresolved_hooks || [])
    .filter((hook) => hook.status === 'open' || hook.status === 'progressed')
    .map((hook) => hook.description);
}

function buildNarrative(session, sections) {
  const campaignName = session?.campaign?.region?.name || 'your adventure';
  const episode = session?.session?.episode_title || 'the latest session';
  const trainerNames = (session?.characters || [])
    .map((character) => character.trainer?.name)
    .filter(Boolean);

  const paragraphs = [];
  paragraphs.push(
    trainerNames.length
      ? `In ${campaignName}, ${trainerNames.join(', ')} continue their journey in "${episode}".`
      : `In ${campaignName}, the party continues their journey in "${episode}".`
  );

  if (sections.locations.length) {
    paragraphs.push(`So far, the group has explored ${sections.locations.join(', ')}.`);
  }
  if (sections.npcs.length) {
    paragraphs.push(`Along the way, they met ${sections.npcs.join(', ')}.`);
  }
  if (sections.teamDrift.length) {
    paragraphs.push(`Team Drift has been part of the story too: ${sections.teamDrift[0]}`);
  }
  if (sections.hooks.length) {
    paragraphs.push(`Before the next play night, remember: ${sections.hooks[0]}`);
  } else if (session?.session?.scene?.description) {
    paragraphs.push(session.session.scene.description);
  }

  return paragraphs;
}

/**
 * Request AI-polished recap from server.
 * @param {object} session
 * @param {{ format?: string, model?: string }} options
 * @returns {Promise<{ content: string, polished: boolean }>}
 */
export async function fetchPolishedRecapExport(session, { format = 'md', model } = {}) {
  const response = await fetch(`${API_BASE}/api/v1/recap/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session, format, polish: true, model }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to generate polished recap');
  }

  const data = await response.json();
  return { content: data.content, polished: data.polished };
}

/**
 * Generate recap export content.
 * @param {object} session
 * @param {{ format?: string, polish?: boolean, model?: string }} options
 * @returns {Promise<{ content: string, polished: boolean }>}
 */
export async function generateRecapExport(session, { format = 'md', polish = false, model } = {}) {
  if (polish) {
    try {
      return await fetchPolishedRecapExport(session, { format, model });
    } catch {
      // Fall back to local deterministic export
    }
  }

  const local = buildLocalRecapExport(session);
  return {
    content: format === 'txt' ? local.plainText : local.markdown,
    polished: false,
  };
}

/**
 * @param {string} sessionId
 * @param {string} content
 */
export async function attachRecapToSession(sessionId, content) {
  const response = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/recap/attach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to attach recap to session');
  }

  return response.json();
}

/**
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function downloadTextFile(content, filename, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * @param {string} content
 * @returns {Promise<void>}
 */
export async function copyToClipboard(content) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

/**
 * @param {string} sessionId
 * @param {string} format
 * @returns {string}
 */
export function generateRecapFilename(sessionId, format = 'md') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const prefix = sessionId ? sessionId.substring(0, 8) : 'session';
  return `pokedm-recap-${prefix}-${timestamp}.${format}`;
}

/**
 * @param {string} content
 * @returns {boolean}
 */
export function isRecapExportFile(content) {
  return /pokedm_recap_export:\s*["']?[\d.]+["']?/i.test(content)
    || /<!--\s*pokedm-recap-export:/i.test(content);
}
