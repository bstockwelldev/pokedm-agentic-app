/**
 * Pokémon Override Service — STO-22
 *
 * Resolves a Pokémon species by checking custom-pokemon.json first, then
 * falling back to PokeAPI. Transparent to the battle engine: callers always
 * receive a unified PokemonSpeciesData shape regardless of source.
 *
 * Merge rules (from DESIGN.md):
 *   - custom-pokemon.json typing, ability, signature_move → replace PokeAPI equivalents
 *   - stat_overrides.base_stats (if present) → replace PokeAPI base stats
 *   - All other base stats, learnset, evolution → PokeAPI
 *   - custom_species_id always prefixed `cstm_`
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchPokeAPI } from '../tools/pokeapiHelper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data/campaigns');

/** In-process cache: campaignId → parsed custom-pokemon.json */
const customDexCache = new Map();

/**
 * Load custom-pokemon.json for a campaign (cached).
 * @param {string} campaignId
 * @returns {object} Map of custom_species_id → custom Pokémon entry
 */
function loadCustomDex(campaignId) {
  if (customDexCache.has(campaignId)) return customDexCache.get(campaignId);

  const filePath = join(DATA_DIR, campaignId, 'custom-pokemon.json');
  if (!existsSync(filePath)) {
    customDexCache.set(campaignId, {});
    return {};
  }

  try {
    const { pokemon } = JSON.parse(readFileSync(filePath, 'utf-8'));
    customDexCache.set(campaignId, pokemon || {});
    return pokemon || {};
  } catch {
    customDexCache.set(campaignId, {});
    return {};
  }
}

/**
 * Fetch base stats + type from PokeAPI and normalize to our shape.
 * @param {string} canonRef  e.g. "gyarados"
 */
async function fetchCanonBase(canonRef) {
  const res = await fetchPokeAPI(
    `https://pokeapi.co/api/v2/pokemon/${canonRef.toLowerCase()}/`,
    'Pokemon'
  );
  const data = await res.json();

  const statMap = Object.fromEntries(
    data.stats.map((s) => [s.stat.name, s.base_stat])
  );

  return {
    id: data.id,
    name: data.name,
    typing: data.types.map((t) => t.type.name),
    base_stats: {
      hp:               statMap['hp']               ?? 0,
      attack:           statMap['attack']            ?? 0,
      defense:          statMap['defense']           ?? 0,
      special_attack:   statMap['special-attack']    ?? 0,
      special_defense:  statMap['special-defense']   ?? 0,
      speed:            statMap['speed']             ?? 0,
    },
    abilities: data.abilities.map((a) => ({
      name: a.ability.name,
      hidden: a.is_hidden,
    })),
    moves: data.moves.map((m) => m.move.name),
    source: 'canon',
  };
}

/**
 * Resolve a Pokémon species from a SpeciesRef.
 *
 * @param {{ kind: 'canon' | 'custom', ref: string }} speciesRef
 * @param {string} campaignId  Used to load the correct custom-pokemon.json
 * @returns {Promise<object>}  Unified species data shape
 */
export async function resolvePokemon(speciesRef, campaignId) {
  const { kind, ref } = speciesRef;

  if (kind === 'custom') {
    const dex = loadCustomDex(campaignId);
    const entry = dex[ref];
    if (!entry) throw new Error(`Custom Pokémon "${ref}" not found in campaign "${campaignId}"`);

    // If the custom entry resembles a canon species, fetch the canon base
    // and apply overrides on top.
    if (entry.resembles?.base_canon_ref) {
      const base = await fetchCanonBase(entry.resembles.base_canon_ref);
      return mergeOverrides(base, entry);
    }

    // Fully custom (no canon base) — return as-is with minimal shape normalization
    return {
      id: ref,
      name: entry.display_name,
      typing: entry.typing,
      base_stats: entry.stat_overrides?.base_stats ?? {
        hp: 50, attack: 50, defense: 50,
        special_attack: 50, special_defense: 50, speed: 50,
      },
      abilities: [{ name: entry.ability.name, hidden: false }],
      moves: entry.learnset_simplified ?? [],
      signature_move: entry.signature_move ?? null,
      lore: entry.lore,
      source: 'custom',
      raw: entry,
    };
  }

  // Canon — fetch from PokeAPI directly
  return fetchCanonBase(ref);
}

/**
 * Apply custom-pokemon.json overrides on top of a canon base.
 * @param {object} base   Canon shape from fetchCanonBase
 * @param {object} entry  Custom entry from custom-pokemon.json
 */
function mergeOverrides(base, entry) {
  return {
    ...base,
    // Overrides: typing, ability, signature move, display name, lore
    name: entry.display_name ?? base.name,
    typing: entry.typing ?? base.typing,
    abilities: [{ name: entry.ability.name, hidden: false }],
    signature_move: entry.signature_move ?? null,
    // If explicit stat overrides provided, use them; otherwise keep canon
    base_stats: entry.stat_overrides?.base_stats
      ? entry.stat_overrides.base_stats
      : base.base_stats,
    // Append signature move to learnset if not present
    moves: mergeLearnset(base.moves, entry.learnset_simplified, entry.signature_move),
    lore: entry.lore ?? null,
    design_hooks: entry.design_hooks ?? [],
    source: 'custom_override',
    custom_species_id: entry.custom_species_id,
    raw: entry,
  };
}

function mergeLearnset(canonMoves, customLearnset, signatureMove) {
  const base = Array.isArray(customLearnset) && customLearnset.length
    ? customLearnset
    : canonMoves;
  if (signatureMove && !base.includes(signatureMove.name)) {
    return [signatureMove.name, ...base];
  }
  return base;
}

/** Invalidate the in-process cache for a campaign (call after editing custom-pokemon.json). */
export function invalidateCustomDexCache(campaignId) {
  customDexCache.delete(campaignId);
}
