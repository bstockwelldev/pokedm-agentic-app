/**
 * Tool Registry
 * Exports all tools organized by category
 */

// Pokemon tools - Import first, then re-export
import { fetchPokemon } from './pokemon.js';
import { fetchPokemonSpecies } from './species.js';
export { fetchPokemon, fetchPokemonSpecies };

// Battle tools - Import first, then re-export
import { fetchMove } from './moves.js';
import { fetchAbility } from './abilities.js';
import { fetchType } from './types.js';
export { fetchMove, fetchAbility, fetchType };

// World tools - Import first, then re-export
import { fetchEvolutionChain } from './evolution.js';
import { fetchGeneration } from './generation.js';
import { fetchItem } from './items.js';
import { fetchLocation } from './locations.js';
export { fetchEvolutionChain, fetchGeneration, fetchItem, fetchLocation };

// Custom tools - Import first, then re-export
import { createCustomPokemon, getCustomPokemon, listCustomPokemon } from './custom-pokemon.js';
export { createCustomPokemon, getCustomPokemon, listCustomPokemon };

/**
 * Get all PokeAPI tools
 */
export function getPokeAPITools() {
  return {
    fetchPokemon,
    fetchPokemonSpecies,
    fetchMove,
    fetchAbility,
    fetchType,
    fetchEvolutionChain,
    fetchGeneration,
    fetchItem,
    fetchLocation,
  };
}

/**
 * Get all custom Pokémon tools
 */
export function getCustomPokemonTools() {
  return {
    createCustomPokemon,
    getCustomPokemon,
    listCustomPokemon,
  };
}

/**
 * Get all tools (PokeAPI + Custom)
 */
export function getAllTools() {
  return {
    ...getPokeAPITools(),
    ...getCustomPokemonTools(),
  };
}
