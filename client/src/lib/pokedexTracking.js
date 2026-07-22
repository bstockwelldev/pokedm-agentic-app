import { parsePokemonRef } from './pokemonMedia';

const CAUGHT_NOTE_PATTERN = /\b(caught|captured|starter|received|gift|obtained|partner)\b/i;
const SEEN_NOTE_PATTERN = /\b(sighting|sighted|spotted|seen|fled|encounter|discovered via flag)\b/i;

const POKEDEX_CAMPAIGN_IDS = new Set([
  'celestide_isles',
  'celestide-isles-v1',
  'aurora_region',
  'aurora-region',
]);

/**
 * Whether the active session supports Pokédex tracking UI.
 */
export function isPokedexTrackingEnabled(session) {
  if (!session) return false;

  const campaignId = session.campaign?.campaign_id?.toLowerCase() || '';
  if (POKEDEX_CAMPAIGN_IDS.has(campaignId)) {
    return true;
  }

  if (POKEDEX_CAMPAIGN_IDS.has(campaignId.replace(/-/g, '_'))) {
    return true;
  }

  return (session.continuity?.discovered_pokemon?.length || 0) > 0;
}

function normalizeSpeciesRef(ref) {
  if (!ref) return '';
  const raw = typeof ref === 'string' ? ref : ref.ref || '';
  return raw.toLowerCase();
}

/**
 * Collect species refs from all trainer parties for caught inference.
 */
export function collectPartySpeciesRefs(session) {
  const refs = new Set();
  for (const character of session?.characters || []) {
    for (const pokemon of character.pokemon_party || []) {
      const speciesRef = normalizeSpeciesRef(pokemon.species_ref);
      if (speciesRef) {
        refs.add(speciesRef);
      }
    }
  }
  return refs;
}

/**
 * Infer seen vs caught from optional field, party membership, or notes.
 */
export function getDiscoveryStatus(entry, partySpeciesRefs = new Set()) {
  if (entry?.discovery_status === 'caught' || entry?.discovery_status === 'seen') {
    return entry.discovery_status;
  }

  const speciesRef = normalizeSpeciesRef(entry?.species_ref);
  if (speciesRef && partySpeciesRefs.has(speciesRef)) {
    return 'caught';
  }

  const notes = entry?.notes || '';
  if (CAUGHT_NOTE_PATTERN.test(notes)) {
    return 'caught';
  }
  if (SEEN_NOTE_PATTERN.test(notes)) {
    return 'seen';
  }

  return 'seen';
}

/**
 * True when entry represents a regional variant or custom campaign species.
 */
export function isRegionalVariant(entry) {
  const formKind = entry?.form_ref?.kind;
  if (
    formKind === 'regional_variant' ||
    formKind === 'regional_evolution' ||
    formKind === 'convergent_species'
  ) {
    return true;
  }

  const ref = normalizeSpeciesRef(entry?.species_ref);
  return (
    ref.includes('cstm_') ||
    ref.includes('celestide') ||
    ref.includes('_alolan') ||
    ref.includes('_galarian') ||
    ref.includes('_hisuian')
  );
}

function titleCaseSlug(value) {
  if (!value) return 'Unknown';
  return value
    .replace(/^custom:/, '')
    .replace(/^canon:/, '')
    .replace(/^cstm[_-]?/i, '')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Resolve a display name for a discovered entry.
 */
export function formatSpeciesName(entry, customDex = {}) {
  const ref = normalizeSpeciesRef(entry?.species_ref);
  const rawRef = ref.replace(/^custom:/, '').replace(/^canon:/, '');
  const slug = parsePokemonRef(ref) || rawRef;

  const lookupKeys = [
    rawRef,
    slug,
    `cstm_${rawRef}`,
    rawRef.replace(/^cstm_/, ''),
    `cstm_${slug}`,
    slug?.replace(/^cstm_/, ''),
  ];

  for (const key of lookupKeys) {
    if (key && customDex[key]?.display_name) {
      return customDex[key].display_name;
    }
  }

  const fuzzyKey = Object.keys(customDex).find((key) => {
    const normalizedKey = key.toLowerCase().replace(/^cstm_/, '');
    const normalizedRef = rawRef.toLowerCase().replace(/^cstm_/, '');
    return normalizedKey === normalizedRef;
  });

  if (fuzzyKey && customDex[fuzzyKey]?.display_name) {
    return customDex[fuzzyKey].display_name;
  }

  if (slug) {
    return titleCaseSlug(slug);
  }

  return 'Unknown Species';
}

/**
 * Format the Form column per Expansion §10.
 */
export function formatFormLabel(entry) {
  const formRef = entry?.form_ref;
  if (!formRef || formRef.kind === 'none') {
    return 'Standard';
  }

  if (formRef.region) {
    const regionLabel = formRef.region
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
    return regionLabel;
  }

  if (formRef.kind === 'regional_variant') {
    return 'Regional variant';
  }

  return formRef.kind
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Resolve location_id to campaign location name when available.
 */
export function resolveLocationName(locationId, locations = []) {
  if (!locationId || locationId === 'unknown') {
    return 'Unknown';
  }

  const match = locations.find((loc) => loc.location_id === locationId);
  if (match?.name) {
    return match.name;
  }

  return locationId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Build normalized rows for the Pokédex table.
 */
export function buildPokedexRows(session) {
  const discovered = session?.continuity?.discovered_pokemon || [];
  const locations = session?.campaign?.locations || [];
  const customDex = session?.custom_dex?.pokemon || {};
  const partySpeciesRefs = collectPartySpeciesRefs(session);

  return discovered.map((entry, index) => ({
    id: `${entry.first_seen_session_id || 'session'}-${index}`,
    species: formatSpeciesName(entry, customDex),
    form: formatFormLabel(entry),
    location: resolveLocationName(entry.first_seen_location_id, locations),
    notes: entry.notes?.trim() || '—',
    status: getDiscoveryStatus(entry, partySpeciesRefs),
    isRegionalVariant: isRegionalVariant(entry),
    entry,
  }));
}
