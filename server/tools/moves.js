import { tool } from 'ai';
import { z } from 'zod';
import { getCachedCanonData, setCachedCanonData } from '../storage/canonCache.js';

/**
 * Fetch move data from PokeAPI with caching
 */
export const fetchMove = tool({
  description:
    'Get canon move details by name or id. Enrich move stats (pp/power/accuracy/class) and simplify effects into one sentence for kid-friendly play.',
  inputSchema: z.object({
    idOrName: z.string().min(1).describe('Move name or numeric id (e.g., "tackle" or "33")'),
    sessionId: z.string().optional().describe('Session ID for caching'),
  }),
  execute: async ({ idOrName, sessionId }) => {
    // Check cache first
    if (sessionId) {
      const cached = await getCachedCanonData('moves', idOrName, sessionId);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetchPokeAPI(
        `https://pokeapi.co/api/v2/move/${idOrName.toLowerCase()}/`,
        'Move'
      );
      const data = await response.json();

      // Get English effect
      const effectEntry = data.effect_entries?.find((entry) => entry.language.name === 'en');
      const shortEffect = effectEntry?.short_effect || effectEntry?.effect || '';

      // Simplify for kid-friendly play
      const simplified = {
        id: data.id,
        name: data.name,
        type: data.type?.name || null,
        damage_class: data.damage_class?.name || null,
        accuracy: data.accuracy,
        power: data.power,
        pp: data.pp,
        priority: data.priority,
        simple_effect: shortEffect.substring(0, 200), // Limit length
      };

      // Cache if sessionId provided
      if (sessionId) {
        await setCachedCanonData('moves', idOrName, simplified, sessionId);
      }

      return simplified;
    } catch (error) {
      throw new Error(`Failed to fetch move ${idOrName}: ${error.message}`);
    }
  },
});
