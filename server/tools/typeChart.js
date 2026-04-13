/**
 * Type Chart Tool — STO-21
 *
 * Returns the full defensive type effectiveness for a given typing (1 or 2 types).
 * Used by the battle engine to compute damage multipliers without calling the AI.
 *
 * Uses the existing fetchType tool's PokeAPI data + session LRU cache.
 * Result is always a multiplier keyed by attacking type name:
 *   { fire: 2, water: 0.5, ice: 0, ... }
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getCachedCanonData, setCachedCanonData } from '../storage/canonCache.js';
import { fetchPokeAPI } from './pokeapiHelper.js';

const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

/**
 * Fetch defensive multipliers for one type from PokeAPI.
 * Returns { [attackingType]: multiplier }
 */
async function fetchDefensiveMultipliers(typeName, sessionId) {
  const cacheKey = `chart_${typeName}`;

  if (sessionId) {
    const cached = await getCachedCanonData('types', cacheKey, sessionId);
    if (cached) return cached;
  }

  const response = await fetchPokeAPI(
    `https://pokeapi.co/api/v2/type/${typeName.toLowerCase()}/`,
    'Type'
  );
  const data = await response.json();
  const dr = data.damage_relations;

  // Start all multipliers at 1×
  const multipliers = Object.fromEntries(ALL_TYPES.map((t) => [t, 1]));

  for (const t of (dr.double_damage_from || [])) multipliers[t.name] = 2;
  for (const t of (dr.half_damage_from || []))   multipliers[t.name] = 0.5;
  for (const t of (dr.no_damage_from || []))      multipliers[t.name] = 0;

  if (sessionId) await setCachedCanonData('types', cacheKey, multipliers, sessionId);
  return multipliers;
}

/**
 * Combine two defensive multiplier tables (product per attacking type).
 * Handles dual typing: Fire/Flying hit by Ice = 1× × 2× = 2×
 */
function combineMultipliers(m1, m2) {
  const combined = {};
  for (const t of ALL_TYPES) {
    combined[t] = (m1[t] ?? 1) * (m2[t] ?? 1);
  }
  return combined;
}

/**
 * AI SDK tool — used by battle engine and lore agent.
 */
export const fetchTypeChart = tool({
  description:
    'Get the full defensive type effectiveness chart for a Pokémon typing (1 or 2 types). Returns a multiplier map keyed by attacking type name. Values: 0 (immune), 0.25, 0.5 (resistant), 1 (neutral), 2, 4 (weak). Use this before calculating battle damage.',
  inputSchema: z.object({
    typing: z
      .array(z.string().toLowerCase())
      .min(1)
      .max(2)
      .describe("The defending Pokémon's type(s), e.g. [\"water\"] or [\"ice\", \"dragon\"]"),
    sessionId: z.string().optional().describe('Session ID for caching'),
  }),
  execute: async ({ typing, sessionId }) => {
    const [type1, type2] = typing;

    const m1 = await fetchDefensiveMultipliers(type1, sessionId);
    const chart = type2 ? combineMultipliers(m1, await fetchDefensiveMultipliers(type2, sessionId)) : m1;

    // Summarise for the agent (don't dump 18 values into context unless needed)
    const weaknesses  = Object.entries(chart).filter(([, v]) => v > 1).map(([t, v]) => ({ type: t, multiplier: v }));
    const resistances = Object.entries(chart).filter(([, v]) => v > 0 && v < 1).map(([t, v]) => ({ type: t, multiplier: v }));
    const immunities  = Object.entries(chart).filter(([, v]) => v === 0).map(([t]) => t);

    return { typing, chart, weaknesses, resistances, immunities };
  },
});

/**
 * Non-tool helper for the battle engine (bypasses AI SDK wrapper).
 * Returns raw { [attackingType]: multiplier } object.
 */
export async function getTypeEffectiveness(typing, sessionId) {
  const [type1, type2] = typing;
  const m1 = await fetchDefensiveMultipliers(type1, sessionId);
  return type2 ? combineMultipliers(m1, await fetchDefensiveMultipliers(type2, sessionId)) : { ...m1 };
}
