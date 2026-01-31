const MEMORY_CACHE = new Map();
const STORAGE_PREFIX = 'pokedm_pokemon_art_cache';

function buildStorageKey(sessionId) {
  return `${STORAGE_PREFIX}:${sessionId || 'global'}`;
}

function readStorage(sessionId) {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(buildStorageKey(sessionId));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function writeStorage(sessionId, cache) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(buildStorageKey(sessionId), JSON.stringify(cache));
  } catch (error) {
    // Ignore storage errors (quota, etc.)
  }
}

function normalizeIdOrName(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const parts = raw.split(':');
  let slug = (parts[parts.length - 1] || '').trim().toLowerCase();
  if (!slug) return null;

  slug = slug.replace(/♀/g, '-f').replace(/♂/g, '-m');
  slug = slug.replace(/['’.]/g, '');
  slug = slug.replace(/[^a-z0-9\s-_]/g, ' ');
  slug = slug.replace(/[_\s]+/g, '-');
  slug = slug.replace(/-+/g, '-').replace(/^-|-$/g, '');

  return slug || null;
}

export function isCustomPokemonRef(value) {
  if (!value) return false;
  const raw = String(value).toLowerCase();
  return (
    raw.startsWith('custom:') ||
    raw.startsWith('cstm_') ||
    raw.startsWith('cstm-') ||
    raw.includes(':cstm_') ||
    raw.includes(':cstm-')
  );
}

export function parsePokemonRef(ref) {
  if (!ref || typeof ref !== 'string') return null;
  const parts = ref.split(':');
  return normalizeIdOrName(parts[parts.length - 1]);
}

function selectSprite(sprites) {
  const officialArt = sprites?.other?.['official-artwork']?.front_default || null;
  const battleSprite = sprites?.other?.showdown?.front_default || sprites?.front_default || null;
  const overworldSprite =
    sprites?.versions?.['generation-viii']?.icons?.front_default ||
    sprites?.versions?.['generation-vii']?.icons?.front_default ||
    sprites?.front_default ||
    null;

  return {
    officialArt,
    battleSprite,
    overworldSprite,
  };
}

async function fetchFromServer(normalized, sessionId) {
  const query = new URLSearchParams();
  if (sessionId) {
    query.set('sessionId', sessionId);
  }
  const queryString = query.toString();
  const requestUrl = `/api/pokemon-media/${encodeURIComponent(normalized)}${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(requestUrl);
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function fetchPokemonMedia(idOrName, sessionId) {
  if (!idOrName || isCustomPokemonRef(idOrName)) {
    return null;
  }

  const normalized = normalizeIdOrName(idOrName);
  if (!normalized) return null;

  const cacheKey = `${sessionId || 'global'}:${normalized}`;
  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey);
  }

  const storedCache = readStorage(sessionId);
  if (storedCache[normalized]) {
    MEMORY_CACHE.set(cacheKey, storedCache[normalized]);
    return storedCache[normalized];
  }

  let media = null;
  try {
    media = await fetchFromServer(normalized, sessionId);
  } catch (error) {
    media = null;
  }

  if (!media) {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${normalized}`);
    if (!response.ok) {
      throw new Error(`Pokemon not found: ${normalized}`);
    }

    const data = await response.json();
    const sprites = selectSprite(data.sprites);
    media = {
      id: data.id,
      name: data.name,
      ...sprites,
      fetchedAt: new Date().toISOString(),
    };
  }

  MEMORY_CACHE.set(cacheKey, media);
  storedCache[normalized] = media;
  writeStorage(sessionId, storedCache);
  return media;
}
