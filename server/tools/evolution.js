import { tool } from 'ai';
import { z } from 'zod';
import { getCachedCanonData, setCachedCanonData } from '../storage/canonCache.js';

/**
 * Fetch evolution chain data from PokeAPI with caching
 */
export const fetchEvolutionChain = tool({
  description:
    'Get an evolution chain by id. Follow evolution graph for planning and narration; obtain id from pokemon-species.evolution_chain.url.',
  inputSchema: z.object({
    id: z.number().int().min(1).describe('Evolution chain id (integer)'),
    sessionId: z.string().optional().describe('Session ID for caching'),
  }),
  execute: async ({ id, sessionId }) => {
    const idStr = id.toString();
    
    // Check cache first
    if (sessionId) {
      const cached = getCachedCanonData('evolution_chains', idStr, sessionId);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/evolution-chain/${id}/`);
      if (!response.ok) {
        throw new Error(`Evolution chain not found: ${id}`);
      }
      const data = await response.json();

      // Simplify evolution chain structure
      const simplifyChain = (chain) => {
        return {
          species_name: chain.species?.name || null,
          evolves_to: chain.evolves_to?.map(simplifyChain) || [],
          evolution_details: chain.evolution_details?.map((detail) => ({
            trigger: detail.trigger?.name || null,
            min_level: detail.min_level,
            item: detail.item?.name || null,
            held_item: detail.held_item?.name || null,
            time_of_day: detail.time_of_day || null,
            known_move_type: detail.known_move_type?.name || null,
            location: detail.location?.name || null,
          })) || [],
        };
      };

      const simplified = {
        id: data.id,
        chain: simplifyChain(data.chain),
      };

      // Cache if sessionId provided
      if (sessionId) {
        setCachedCanonData('evolution_chains', idStr, simplified, sessionId);
      }

      return simplified;
    } catch (error) {
      throw new Error(`Failed to fetch evolution chain ${id}: ${error.message}`);
    }
  },
});
