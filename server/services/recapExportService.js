/**
 * Session Recap Export Service
 * Deterministic family-friendly recap export with optional AI polish.
 */

import { randomUUID } from 'crypto';
import logger from '../lib/logger.js';

export const RECAP_EXPORT_VERSION = '1.0';

const TEAM_DRIFT_PATTERN = /team\s*drift|drift\s*(scout|operative|engineer)|kaelix|npc_mira|faction_team_drift/i;

/**
 * Resolve a location ID to a human-readable name.
 * @param {object} session
 * @param {string} locationId
 * @returns {string}
 */
export function resolveLocationName(session, locationId) {
  if (!locationId) {
    return '';
  }
  const location = session.campaign?.locations?.find((loc) => loc.location_id === locationId);
  return location?.name || humanizeId(locationId);
}

/**
 * Resolve species ref to display name.
 * @param {{ kind: string, ref: string }} speciesRef
 * @returns {string}
 */
export function resolveSpeciesName(speciesRef) {
  if (!speciesRef?.ref) {
    return 'Unknown Pokémon';
  }
  const slug = speciesRef.ref.replace(/^canon:/, '');
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * @param {string} value
 * @returns {string}
 */
function humanizeId(value) {
  return value
    .replace(/^(loc_|npc_|hook_)/, '')
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * @param {object} session
 * @returns {string[]}
 */
export function collectLocationsVisited(session) {
  const names = new Set();

  for (const entry of session.continuity?.timeline || []) {
    for (const tag of entry.tags || []) {
      if (tag === 'exploration' || tag === 'arrival' || tag === 'route') {
        const match = entry.summary.match(/(?:at|in|on|to)\s+([A-Za-z0-9][\w\s'-]+)/i);
        if (match?.[1]) {
          names.add(match[1].trim());
        }
      }
    }
    addLocationFromText(names, entry.summary, session);
  }

  for (const event of session.session?.event_log || []) {
    addLocationFromText(names, `${event.summary} ${event.details || ''}`, session);
  }

  for (const discovered of session.continuity?.discovered_pokemon || []) {
    const name = resolveLocationName(session, discovered.first_seen_location_id);
    if (name) {
      names.add(name);
    }
  }

  const currentLocation = resolveLocationName(session, session.session?.scene?.location_id);
  if (currentLocation) {
    names.add(currentLocation);
  }

  return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

/**
 * @param {Set<string>} names
 * @param {string} text
 * @param {object} session
 */
function addLocationFromText(names, text, session) {
  for (const location of session.campaign?.locations || []) {
    if (text.toLowerCase().includes(location.name.toLowerCase())) {
      names.add(location.name);
    }
  }
}

/**
 * @param {object} session
 * @returns {string[]}
 */
export function collectNpcsMet(session) {
  const names = new Set();
  const npcs = session.campaign?.recurring_npcs || [];

  const corpus = [
    ...(session.continuity?.timeline || []).map((entry) => `${entry.summary} ${(entry.tags || []).join(' ')}`),
    ...(session.session?.event_log || []).map((event) => `${event.summary} ${event.details || ''}`),
  ].join('\n');

  for (const npc of npcs) {
    if (corpus.toLowerCase().includes(npc.name.toLowerCase())) {
      names.add(npc.name);
    }
  }

  for (const faction of session.campaign?.factions || []) {
    for (const member of faction.known_members || []) {
      const npc = npcs.find((candidate) => candidate.npc_id === member.npc_id);
      if (npc && corpus.toLowerCase().includes(npc.name.toLowerCase())) {
        names.add(npc.name);
      }
    }
  }

  return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

/**
 * @param {object} session
 * @returns {string[]}
 */
export function collectTeamDriftActions(session) {
  const actions = new Set();

  const sources = [
    ...(session.continuity?.timeline || []).map((entry) => entry.summary),
    ...(session.session?.event_log || []).map((event) => `${event.summary}${event.details ? `: ${event.details}` : ''}`),
    ...(session.continuity?.unresolved_hooks || [])
      .filter((hook) => hook.linked_faction_id === 'faction_team_drift' || TEAM_DRIFT_PATTERN.test(hook.description))
      .map((hook) => hook.description),
  ];

  for (const text of sources) {
    if (TEAM_DRIFT_PATTERN.test(text)) {
      actions.add(cleanRecapLine(text));
    }
  }

  return [...actions];
}

/**
 * @param {object} session
 * @returns {string[]}
 */
export function collectPokemonBonded(session) {
  const entries = [];

  for (const discovered of session.continuity?.discovered_pokemon || []) {
    const species = resolveSpeciesName(discovered.species_ref);
    const location = resolveLocationName(session, discovered.first_seen_location_id);
    const note = discovered.notes ? ` — ${discovered.notes}` : '';
    entries.push(`${species}${location ? ` (first seen at ${location})` : ''}${note}`);
  }

  for (const character of session.characters || []) {
    for (const pokemon of character.pokemon_party || []) {
      const label = pokemon.nickname
        ? `${pokemon.nickname} (${resolveSpeciesName(pokemon.species_ref)})`
        : resolveSpeciesName(pokemon.species_ref);
      const bond = character.trainer?.bonds?.find((item) => item.target === pokemon.instance_id);
      if (bond) {
        entries.push(`${label} — ${bond.description}`);
      } else if (!entries.some((entry) => entry.startsWith(label))) {
        entries.push(`${label} — traveling with ${character.trainer?.name || 'the party'}`);
      }
    }
  }

  return [...new Set(entries)];
}

/**
 * @param {object} session
 * @returns {string[]}
 */
export function collectBadgesEarned(session) {
  const badges = new Set();

  for (const character of session.characters || []) {
    const badgeCount = character.progression?.badges || 0;
    if (badgeCount > 0) {
      badges.add(`${character.trainer?.name || 'A trainer'} has earned ${badgeCount} badge${badgeCount === 1 ? '' : 's'}`);
    }

    for (const achievement of character.achievements || []) {
      badges.add(`${achievement.title}: ${achievement.description}`);
    }

    for (const milestone of character.progression?.milestones || []) {
      if (milestone.completed && /badge|gym|champion/i.test(`${milestone.title} ${milestone.description}`)) {
        badges.add(`${milestone.title} — ${milestone.description}`);
      }
    }
  }

  return [...badges];
}

/**
 * @param {object} session
 * @returns {string[]}
 */
export function collectUnresolvedHooks(session) {
  return (session.continuity?.unresolved_hooks || [])
    .filter((hook) => hook.status === 'open' || hook.status === 'progressed')
    .map((hook) => cleanRecapLine(hook.description));
}

/**
 * @param {string} text
 * @returns {string}
 */
function cleanRecapLine(text) {
  return text
    .replace(/\b[a-z]+_[a-z0-9_]+\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Build short narrative paragraphs for family read-aloud.
 * @param {object} session
 * @param {object} sections
 * @returns {string[]}
 */
export function buildNarrativeParagraphs(session, sections) {
  const campaignName = session.campaign?.region?.name || 'your adventure';
  const episode = session.session?.episode_title || 'the latest session';
  const trainerNames = (session.characters || [])
    .map((character) => character.trainer?.name)
    .filter(Boolean);

  const paragraphs = [];

  const opener = trainerNames.length > 0
    ? `In ${campaignName}, ${trainerNames.join(', ')} continue their journey in "${episode}".`
    : `In ${campaignName}, the party continues their journey in "${episode}".`;
  paragraphs.push(opener);

  if (sections.locations.length > 0) {
    paragraphs.push(
      `So far, the group has explored ${formatList(sections.locations)}.`
    );
  }

  if (sections.npcs.length > 0) {
    paragraphs.push(
      `Along the way, they met ${formatList(sections.npcs)}.`
    );
  }

  if (sections.teamDrift.length > 0) {
    paragraphs.push(
      `Team Drift has been part of the story too: ${sections.teamDrift[0]}`
    );
  }

  if (sections.pokemon.length > 0) {
    paragraphs.push(
      `Their Pokémon companions include ${formatList(sections.pokemon.slice(0, 3))}.`
    );
  }

  if (sections.hooks.length > 0) {
    paragraphs.push(
      `Before the next play night, remember: ${sections.hooks[0]}`
    );
  } else if (session.session?.scene?.description) {
    paragraphs.push(session.session.scene.description);
  }

  return paragraphs;
}

/**
 * @param {string[]} items
 * @returns {string}
 */
function formatList(items) {
  if (items.length === 0) {
    return '';
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * @param {string[]} items
 * @param {string} emptyLabel
 * @returns {string[]}
 */
function sectionLines(items, emptyLabel) {
  if (!items.length) {
    return [`- ${emptyLabel}`];
  }
  return items.map((item) => `- ${item}`);
}

/**
 * Collect structured recap sections from session continuity and event log.
 * @param {object} session
 * @returns {object}
 */
export function collectRecapSections(session) {
  return {
    locations: collectLocationsVisited(session),
    npcs: collectNpcsMet(session),
    teamDrift: collectTeamDriftActions(session),
    pokemon: collectPokemonBonded(session),
    badges: collectBadgesEarned(session),
    hooks: collectUnresolvedHooks(session),
  };
}

/**
 * Build deterministic recap content (works offline).
 * @param {object} session
 * @returns {{ markdown: string, plainText: string, sections: object, narrative: string[] }}
 */
export function buildDeterministicRecap(session) {
  const sections = collectRecapSections(session);
  const narrative = buildNarrativeParagraphs(session, sections);
  const campaignName = session.campaign?.region?.name || 'Pokémon Adventure';
  const episode = session.session?.episode_title || 'Session Recap';
  const exportedAt = new Date().toISOString();

  const body = [
    '# Session Recap',
    '',
    `**Campaign:** ${campaignName}`,
    `**Episode:** ${episode}`,
    `**Exported:** ${exportedAt.slice(0, 10)}`,
    '',
    '## Story So Far',
    '',
    ...narrative.map((paragraph) => paragraph),
    '',
    '## Locations Visited',
    ...sectionLines(sections.locations, 'No locations recorded yet — your journey is just beginning!'),
    '',
    '## People Met',
    ...sectionLines(sections.npcs, 'No familiar faces recorded yet.'),
    '',
    '## Team Drift',
    ...sectionLines(sections.teamDrift, 'No Team Drift encounters recorded yet.'),
    '',
    '## Pokémon Discovered & Bonded',
    ...sectionLines(sections.pokemon, 'No Pokémon discoveries recorded yet.'),
    '',
    '## Badges & Achievements',
    ...sectionLines(sections.badges, 'No badges or major achievements yet.'),
    '',
    '## What\'s Still Open',
    ...sectionLines(sections.hooks, 'No open story threads — explore freely!'),
    '',
    '---',
    `<!-- pokedm-recap-export: ${RECAP_EXPORT_VERSION} -->`,
  ].join('\n');

  const frontmatter = [
    '---',
    `pokedm_recap_export: "${RECAP_EXPORT_VERSION}"`,
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

  return { markdown, plainText, sections, narrative };
}

/**
 * Generate source data for AI recap (used by generateRecap).
 * @param {object} session
 * @returns {string}
 */
export function generateSimpleRecap(session) {
  const recaps = [];

  if (session.session?.event_log && session.session.event_log.length > 0) {
    const recentEvents = session.session.event_log.slice(-10);
    const eventSummaries = recentEvents
      .filter((event) => event.kind !== 'recap')
      .map((event) => `- ${event.summary}${event.details ? `: ${event.details}` : ''}`)
      .join('\n');

    if (eventSummaries) {
      recaps.push('## Recent Events\n' + eventSummaries);
    }
  }

  if (session.continuity?.recaps?.length > 0) {
    const existingRecaps = session.continuity.recaps
      .slice(-3)
      .map((recap) => recap.text)
      .join('\n\n');
    if (existingRecaps) {
      recaps.push('## Previous Recap\n' + existingRecaps);
    }
  }

  const sections = collectRecapSections(session);
  if (sections.locations.length) {
    recaps.push(`## Locations Visited\n${sections.locations.map((item) => `- ${item}`).join('\n')}`);
  }
  if (sections.npcs.length) {
    recaps.push(`## NPCs Met\n${sections.npcs.map((item) => `- ${item}`).join('\n')}`);
  }
  if (sections.teamDrift.length) {
    recaps.push(`## Team Drift\n${sections.teamDrift.map((item) => `- ${item}`).join('\n')}`);
  }
  if (sections.pokemon.length) {
    recaps.push(`## Pokémon\n${sections.pokemon.map((item) => `- ${item}`).join('\n')}`);
  }
  if (sections.badges.length) {
    recaps.push(`## Badges\n${sections.badges.map((item) => `- ${item}`).join('\n')}`);
  }
  if (sections.hooks.length) {
    recaps.push(`## Open Hooks\n${sections.hooks.map((item) => `- ${item}`).join('\n')}`);
  }

  if (session.continuity?.timeline?.length > 0) {
    const timelineEntries = session.continuity.timeline
      .slice(-5)
      .map((entry) => `- ${entry.summary}`)
      .join('\n');
    if (timelineEntries) {
      recaps.push('## Timeline\n' + timelineEntries);
    }
  }

  const stateSummary = [];
  const currentLocation = resolveLocationName(session, session.session?.scene?.location_id);
  if (currentLocation) {
    stateSummary.push(`**Current Location:** ${currentLocation}`);
  }
  if (session.session?.scene?.description) {
    stateSummary.push(`**Scene:** ${session.session.scene.description}`);
  }
  if (session.characters?.length > 0) {
    const partySize = session.characters.reduce((sum, character) => sum + character.pokemon_party.length, 0);
    stateSummary.push(`**Party:** ${partySize} Pokémon`);
  }
  if (session.session?.current_objectives?.length > 0) {
    const objectives = session.session.current_objectives
      .map((objective) => `- ${objective.description} (${objective.status})`)
      .join('\n');
    stateSummary.push(`**Objectives:**\n${objectives}`);
  }

  if (stateSummary.length > 0) {
    recaps.push('## Current State\n' + stateSummary.join('\n'));
  }

  if (recaps.length === 0) {
    return 'No recap data available yet. Start your adventure to build up session history!';
  }

  return recaps.join('\n\n');
}

/**
 * Optional AI-polished narrative recap.
 * @param {object} session
 * @param {string} model
 * @returns {Promise<string>}
 */
export async function generatePolishedRecap(session, model) {
  const simpleRecap = generateSimpleRecap(session);

  if (simpleRecap === 'No recap data available yet. Start your adventure to build up session history!') {
    return simpleRecap;
  }

  try {
    const { generateText } = await import('ai');
    const { getModel } = await import('../lib/modelProvider.js');

    const recapPrompt = `You are a friendly narrator for a Pokémon adventure session.

The player has requested a recap of their adventure so far. Based on the following session data, create a warm, engaging recap that:

1. Summarizes what has happened in the adventure
2. Highlights key moments and discoveries
3. Reminds them of their current situation and objectives
4. Uses a friendly, encouraging tone suitable for all ages
5. Uses short paragraphs suitable for family read-aloud
6. Never mentions internal IDs, debug fields, or technical metadata

## Session Data

${simpleRecap}

Create a narrative recap (2-3 paragraphs) that brings the player back into the story.`;

    const result = await generateText({
      model: await getModel(model),
      prompt: recapPrompt,
      maxSteps: 1,
    });

    return result.text;
  } catch (error) {
    logger.error('AI recap generation failed, using deterministic recap', {
      error: error.message,
      stack: error.stack,
    });
    const { narrative } = buildDeterministicRecap(session);
    return narrative.join('\n\n');
  }
}

/**
 * Export session recap with optional AI polish.
 * @param {object} session
 * @param {{ polish?: boolean, model?: string, format?: 'md'|'txt' }} options
 * @returns {Promise<{ content: string, format: string, polished: boolean, sections: object }>}
 */
export async function exportSessionRecap(session, options = {}) {
  const { polish = false, model, format = 'md' } = options;
  const deterministic = buildDeterministicRecap(session);

  if (!polish) {
    return {
      content: format === 'txt' ? deterministic.plainText : deterministic.markdown,
      format,
      polished: false,
      sections: deterministic.sections,
    };
  }

  const polishedNarrative = await generatePolishedRecap(session, model);
  const lines = deterministic.markdown.split('\n');
  const storyIndex = lines.findIndex((line) => line === '## Story So Far');
  if (storyIndex >= 0) {
    let endIndex = lines.findIndex((line, index) => index > storyIndex && line.startsWith('## '));
    if (endIndex < 0) {
      endIndex = lines.length;
    }
    const replacement = [
      '## Story So Far',
      '',
      polishedNarrative,
    ];
    const updated = [
      ...lines.slice(0, storyIndex),
      ...replacement,
      ...lines.slice(endIndex),
    ];
    const markdown = updated.join('\n');
    return {
      content: format === 'txt'
        ? markdown.replace(/^#+\s+/gm, '').replace(/\*\*/g, '').replace(/^---[\s\S]*?---\n*/m, '').trim()
        : markdown,
      format,
      polished: true,
      sections: deterministic.sections,
    };
  }

  return {
    content: format === 'txt' ? deterministic.plainText : deterministic.markdown,
    format,
    polished: false,
    sections: deterministic.sections,
  };
}

/**
 * @param {string} content
 * @returns {boolean}
 */
export function isRecapExportDocument(content) {
  return /pokedm_recap_export:\s*["']?[\d.]+["']?/i.test(content)
    || /<!--\s*pokedm-recap-export:/i.test(content);
}

/**
 * Parse exported recap markdown/text for re-import.
 * @param {string} content
 * @returns {{ text: string, metadata: object } | null}
 */
export function parseRecapExport(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  if (!isRecapExportDocument(content)) {
    return null;
  }

  const metadata = {};
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    for (const line of frontmatterMatch[1].split('\n')) {
      const [key, ...rest] = line.split(':');
      if (key && rest.length) {
        metadata[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
      }
    }
  }

  const text = content
    .replace(/^---\n[\s\S]*?\n---\n*/m, '')
    .replace(/<!--\s*pokedm-recap-export:[\s\S]*?-->\s*/g, '')
    .trim();

  return { text, metadata };
}

/**
 * Create a recap entry for continuity.recaps.
 * @param {object} session
 * @param {string} text
 * @returns {object}
 */
export function createRecapEntry(session, text) {
  return {
    recap_id: randomUUID(),
    scope: 'campaign',
    target_id: session.campaign?.campaign_id || session.session?.campaign_id || 'campaign',
    text,
    updated_in_session_id: session.session?.session_id || '',
  };
}

/**
 * Attach recap text to session continuity.
 * @param {object} session
 * @param {string} text
 * @returns {object}
 */
export function attachRecapToSession(session, text) {
  const entry = createRecapEntry(session, text);
  return {
    ...session,
    continuity: {
      ...session.continuity,
      recaps: [...(session.continuity?.recaps || []), entry],
    },
  };
}
