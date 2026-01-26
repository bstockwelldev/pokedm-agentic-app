import { tool } from 'ai';
import { z } from 'zod';
import { getCachedCanonData, setCachedCanonData } from '../storage/canonCache.js';

/**
 * Fetch item data from PokeAPI with caching
 */
export const fetchItem = tool({
  description:
    'Get item details by name or id. Enrich inventory items (cost/effects) for shops and rewards; keep canon references separate from player state.',
  inputSchema: z.object({
    idOrName: z.string().min(1).describe('Item name or numeric id (e.g., "potion" or "17")'),
    sessionId: z.string().optional().describe('Session ID for caching'),
  }),
  execute: async ({ idOrName, sessionId }) => {
    // Check cache first
    if (sessionId) {
      const cached = getCachedCanonData('items', idOrName, sessionId);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/item/${idOrName.toLowerCase()}/`);
      if (!response.ok) {
        throw new Error(`Item not found: ${idOrName}`);
      }
      const data = await response.json();

      // Get English effect
      const effectEntry = data.effect_entries?.find((entry) => entry.language.name === 'en');
      const shortEffect = effectEntry?.short_effect || effectEntry?.effect || '';

      // Simplify for kid-friendly play
      const simplified = {
        id: data.id,
        name: data.name,
        cost: data.cost || 0,
        category: data.category?.name || null,
        simple_effect: shortEffect.substring(0, 200), // Limit length
      };

      // Cache if sessionId provided
      if (sessionId) {
        setCachedCanonData('items', idOrName, simplified, sessionId);
      }

      return simplified;
    } catch (error) {
      throw new Error(`Failed to fetch item ${idOrName}: ${error.message}`);
    }
  },
});
