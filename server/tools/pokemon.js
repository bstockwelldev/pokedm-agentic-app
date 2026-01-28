import { tool } from 'ai';
import { z } from 'zod';
import { getCachedCanonData, setCachedCanonData, isGenerationAllowed } from '../storage/canonCache.js';

/**
 * Fetch Pokémon data from PokeAPI with caching
 */
export const fetchPokemon = tool({
  description:
    'Retrieve Pokémon stats and move/ability references by name or id. Use for party/encounter typing, baseline stats, and move/ability references. Returns simplified, kid-friendly data.',
  inputSchema: z.object({
    idOrName: z.string().min(1).describe('Pokémon name or numeric id (e.g., "pikachu" or "25")'),
    sessionId: z.string().optional().describe('Session ID for caching'),
  }),
  execute: async ({ idOrName, sessionId }) => {
    // Check cache first if sessionId provided
    if (sessionId) {
      const cached = await getCachedCanonData('pokemon', idOrName, sessionId);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName.toLowerCase()}/`);
      if (!response.ok) {
        throw new Error(`Pokémon not found: ${idOrName}`);
      }
      const data = await response.json();

      // Check generation (if available)
      if (data.species?.url) {
        const speciesResponse = await fetch(data.species.url);
        if (speciesResponse.ok) {
          const speciesData = await speciesResponse.json();
          const generation = speciesData.generation?.url
            ? parseInt(speciesData.generation.url.split('/').slice(-2, -1)[0])
            : null;
          if (generation && !isGenerationAllowed(generation)) {
            throw new Error(`Generation ${generation} not allowed (only 1-9)`);
          }
        }
      }

      // Simplify for kid-friendly play
      const simplified = {
        id: data.id,
        name: data.name,
        height: data.height,
        weight: data.weight,
        types: data.types.map((t) => t.type.name),
        stats: data.stats.map((s) => ({
          name: s.stat.name,
          base: s.base_stat,
        })),
        abilities: data.abilities.map((a) => ({
          name: a.ability.name,
          is_hidden: a.is_hidden,
        })),
        moves: data.moves.slice(0, 10).map((m) => m.move.name), // Limit moves
        species_url: data.species?.url || null,
      };

      // Cache if sessionId provided
      if (sessionId) {
        await setCachedCanonData('pokemon', idOrName, simplified, sessionId);
      }

      return simplified;
    } catch (error) {
      throw new Error(`Failed to fetch Pokémon ${idOrName}: ${error.message}`);
    }
  },
});
