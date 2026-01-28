import { tool } from 'ai';
import { z } from 'zod';
import { getCachedCanonData, setCachedCanonData, isGenerationAllowed } from '../storage/canonCache.js';

/**
 * Fetch Pokémon species data from PokeAPI with caching
 */
export const fetchPokemonSpecies = tool({
  description:
    'Get canon Pokémon species details by name or id. Enrich lore/flavor excerpts and link to evolution chain URL for future evolution planning. Returns simplified data.',
  inputSchema: z.object({
    idOrName: z.string().min(1).describe('Pokémon species name or numeric id (e.g., "pikachu" or "25")'),
    sessionId: z.string().optional().describe('Session ID for caching'),
  }),
  execute: async ({ idOrName, sessionId }) => {
    // Check cache first
    if (sessionId) {
      const cached = await getCachedCanonData('species', idOrName, sessionId);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${idOrName.toLowerCase()}/`);
      if (!response.ok) {
        throw new Error(`Pokémon species not found: ${idOrName}`);
      }
      const data = await response.json();

      // Check generation
      const generation = data.generation?.url
        ? parseInt(data.generation.url.split('/').slice(-2, -1)[0])
        : null;
      if (generation && !isGenerationAllowed(generation)) {
        throw new Error(`Generation ${generation} not allowed (only 1-9)`);
      }

      // Get English flavor text
      const flavorText = data.flavor_text_entries
        ?.find((entry) => entry.language.name === 'en')
        ?.flavor_text?.replace(/\f/g, ' ') || '';

      // Simplify for kid-friendly play
      const simplified = {
        id: data.id,
        name: data.name,
        evolution_chain_url: data.evolution_chain?.url || null,
        flavor_text: flavorText,
        generation: generation,
        habitat: data.habitat?.name || null,
        color: data.color?.name || null,
        shape: data.shape?.name || null,
      };

      // Cache if sessionId provided
      if (sessionId) {
        await setCachedCanonData('species', idOrName, simplified, sessionId);
      }

      return simplified;
    } catch (error) {
      throw new Error(`Failed to fetch Pokémon species ${idOrName}: ${error.message}`);
    }
  },
});
