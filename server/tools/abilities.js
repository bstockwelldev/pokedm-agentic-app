import { tool } from 'ai';
import { z } from 'zod';
import { getCachedCanonData, setCachedCanonData } from '../storage/canonCache.js';

/**
 * Fetch ability data from PokeAPI with caching
 */
export const fetchAbility = tool({
  description:
    'Get canon ability details by name or id. Enrich ability effects and distill to a single sentence in session state.',
  inputSchema: z.object({
    idOrName: z.string().min(1).describe('Ability name or numeric id (e.g., "static" or "9")'),
    sessionId: z.string().optional().describe('Session ID for caching'),
  }),
  execute: async ({ idOrName, sessionId }) => {
    // Check cache first
    if (sessionId) {
      const cached = await getCachedCanonData('abilities', idOrName, sessionId);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/ability/${idOrName.toLowerCase()}/`);
      if (!response.ok) {
        throw new Error(`Ability not found: ${idOrName}`);
      }
      const data = await response.json();

      // Get English effect
      const effectEntry = data.effect_entries?.find((entry) => entry.language.name === 'en');
      const shortEffect = effectEntry?.short_effect || effectEntry?.effect || '';

      // Simplify for kid-friendly play
      const simplified = {
        id: data.id,
        name: data.name,
        simple_effect: shortEffect.substring(0, 200), // Limit length
      };

      // Cache if sessionId provided
      if (sessionId) {
        await setCachedCanonData('abilities', idOrName, simplified, sessionId);
      }

      return simplified;
    } catch (error) {
      throw new Error(`Failed to fetch ability ${idOrName}: ${error.message}`);
    }
  },
});
