import { tool } from 'ai';
import { z } from 'zod';
import { getCachedCanonData, setCachedCanonData, isGenerationAllowed } from '../storage/canonCache.js';

/**
 * Fetch generation data from PokeAPI with caching
 */
export const fetchGeneration = tool({
  description:
    'Get generation details by id. Use for Gen 1–9 filtering; do not import canon regions/storylines into your custom region.',
  inputSchema: z.object({
    id: z.number().int().min(1).max(9).describe('Generation id (1–9 recommended)'),
    sessionId: z.string().optional().describe('Session ID for caching'),
  }),
  execute: async ({ id, sessionId }) => {
    // Validate generation
    if (!isGenerationAllowed(id)) {
      throw new Error(`Generation ${id} not allowed (only 1-9)`);
    }

    const idStr = id.toString();
    
    // Check cache first
    if (sessionId) {
      const cached = await getCachedCanonData('generations', idStr, sessionId);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/generation/${id}/`);
      if (!response.ok) {
        throw new Error(`Generation not found: ${id}`);
      }
      const data = await response.json();

      // Simplify for reference
      const simplified = {
        id: data.id,
        name: data.name,
        pokemon_species: data.pokemon_species?.map((s) => s.name) || [],
      };

      // Cache if sessionId provided
      if (sessionId) {
        await setCachedCanonData('generations', idStr, simplified, sessionId);
      }

      return simplified;
    } catch (error) {
      throw new Error(`Failed to fetch generation ${id}: ${error.message}`);
    }
  },
});
