import { tool } from 'ai';
import { z } from 'zod';
import { getCachedCanonData, setCachedCanonData } from '../storage/canonCache.js';

/**
 * Fetch location data from PokeAPI with caching
 * Note: This is for flavor inspiration only; campaign locations must remain original
 */
export const fetchLocation = tool({
  description:
    'Get location details by name or id. Optional flavor inspiration only; campaign locations must remain original and newly created.',
  inputSchema: z.object({
    idOrName: z.string().min(1).describe('Location name or numeric id'),
    sessionId: z.string().optional().describe('Session ID for caching'),
  }),
  execute: async ({ idOrName, sessionId }) => {
    // Check cache first
    if (sessionId) {
      const cached = getCachedCanonData('locations', idOrName, sessionId);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/location/${idOrName.toLowerCase()}/`);
      if (!response.ok) {
        throw new Error(`Location not found: ${idOrName}`);
      }
      const data = await response.json();

      // Simplify for reference only
      const simplified = {
        id: data.id,
        name: data.name,
        region: data.region?.name || null,
        areas: data.areas?.map((area) => area.name) || [],
      };

      // Cache if sessionId provided
      if (sessionId) {
        setCachedCanonData('locations', idOrName, simplified, sessionId);
      }

      return simplified;
    } catch (error) {
      throw new Error(`Failed to fetch location ${idOrName}: ${error.message}`);
    }
  },
});
