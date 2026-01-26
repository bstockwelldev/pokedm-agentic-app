/**
 * Tool Registry
 * Exports all tools organized by category
 */

// Pokemon tools
export { fetchPokemon } from './pokemon.js';
export { fetchPokemonSpecies } from './species.js';

// Battle tools
export { fetchMove } from './moves.js';
export { fetchAbility } from './abilities.js';
export { fetchType } from './types.js';

// World tools
export { fetchEvolutionChain } from './evolution.js';
export { fetchGeneration } from './generation.js';
export { fetchItem } from './items.js';
export { fetchLocation } from './locations.js';

// Custom tools
export { createCustomPokemon, getCustomPokemon, listCustomPokemon } from './custom-pokemon.js';

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
