import { retryApiCall } from './retryUtils.js';

const MEMORY_CACHE = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

function buildCacheKey(idOrName, sessionId) {
  return `${sessionId || 'global'}:${idOrName}`;
}

function getFromCache(cacheKey) {
  const entry = MEMORY_CACHE.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    MEMORY_CACHE.delete(cacheKey);
    return null;
  }
  return entry.data;
}

function setCache(cacheKey, data) {
  MEMORY_CACHE.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
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

export function normalizePokemonIdOrName(value) {
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

function selectSprites(sprites) {
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

export async function fetchPokemonMedia({ idOrName, sessionId }) {
  if (!idOrName || isCustomPokemonRef(idOrName)) {
    return null;
  }

  const normalized = normalizePokemonIdOrName(idOrName);
  if (!normalized) return null;

  const cacheKey = buildCacheKey(normalized, sessionId);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await retryApiCall(async () => {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${normalized}`);
    if (!res.ok) {
      throw new Error(`Pokemon not found: ${normalized}`);
    }
    return res;
  });

  const data = await response.json();
  const sprites = selectSprites(data.sprites);

  const media = {
    id: data.id,
    name: data.name,
    ...sprites,
    fetchedAt: new Date().toISOString(),
  };

  setCache(cacheKey, media);
  return media;
}

export default {
  fetchPokemonMedia,
  normalizePokemonIdOrName,
  isCustomPokemonRef,
};
