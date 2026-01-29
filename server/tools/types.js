import { tool } from 'ai';
import { z } from 'zod';
import { getCachedCanonData, setCachedCanonData } from '../storage/canonCache.js';
import { fetchPokeAPI } from './pokeapiHelper.js';

/**
 * Fetch type effectiveness data from PokeAPI with caching
 */
export const fetchType = tool({
  description:
    'Get type effectiveness tables by type name or id. Use damage relations for simple type advantage narration and lightweight multipliers.',
  inputSchema: z.object({
    idOrName: z.string().min(1).describe('Type name or numeric id (e.g., "fire" or "10")'),
    sessionId: z.string().optional().describe('Session ID for caching'),
  }),
  execute: async ({ idOrName, sessionId }) => {
    // Check cache first
    if (sessionId) {
      const cached = await getCachedCanonData('types', idOrName, sessionId);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetchPokeAPI(
        `https://pokeapi.co/api/v2/type/${idOrName.toLowerCase()}/`,
        'Type'
      );
      const data = await response.json();

      // Simplify damage relations for kid-friendly play
      const simplified = {
        id: data.id,
        name: data.name,
        damage_relations: {
          double_damage_to: data.damage_relations.double_damage_to?.map((t) => t.name) || [],
          half_damage_to: data.damage_relations.half_damage_to?.map((t) => t.name) || [],
          no_damage_to: data.damage_relations.no_damage_to?.map((t) => t.name) || [],
          double_damage_from: data.damage_relations.double_damage_from?.map((t) => t.name) || [],
          half_damage_from: data.damage_relations.half_damage_from?.map((t) => t.name) || [],
          no_damage_from: data.damage_relations.no_damage_from?.map((t) => t.name) || [],
        },
      };

      // Cache if sessionId provided
      if (sessionId) {
        await setCachedCanonData('types', idOrName, simplified, sessionId);
      }

      return simplified;
    } catch (error) {
      throw new Error(`Failed to fetch type ${idOrName}: ${error.message}`);
    }
  },
});
