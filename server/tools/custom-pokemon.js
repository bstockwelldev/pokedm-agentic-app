import { tool } from 'ai';
import { z } from 'zod';
import { CustomPokemonSchema } from '../schemas/customPokemon.js';
import { loadSession, addCustomPokemon, getCustomDex } from '../storage/sessionStore.js';

/**
 * Create custom Pokémon following KB rules
 */
export const createCustomPokemon = tool({
  description:
    'Create a custom Pokémon (regional variant, evolution, convergent species) following design rules. Never overwrites canon. Requires campaign context and session ID.',
  inputSchema: z.object({
    sessionId: z.string().describe('Session ID'),
    custom_species_id: z.string().regex(/^cstm_/).describe('Custom species ID (must start with cstm_)'),
    display_name: z.string().min(1),
    classification: z.enum([
      'regional_variant',
      'regional_evolution',
      'split_evolution',
      'convergent_species',
      'new_species',
    ]),
    base_canon_ref: z.string().optional().describe('Base canon reference (required for variants/evolutions)'),
    concept: z.string(),
    typing: z.array(z.string()).min(1).max(2),
    lore: z.string(),
    design_hooks: z.array(z.string()),
    ability: z.object({
      name: z.string(),
      description: z.string(),
    }),
    signature_move: z
      .object({
        name: z.string(),
        type: z.string(),
        category: z.enum(['physical', 'special', 'status']),
        pp: z.number().int().min(1).max(40),
        accuracy: z.number().int().min(0).max(100).nullable(),
        power: z.number().int().min(0).max(200).nullable(),
        simple_effect: z.string(),
      })
      .optional(),
    learnset_simplified: z.array(z.string()),
    evolution: z.object({
      kind: z.enum(['none', 'evolves_from', 'evolves_to', 'split_paths']),
      notes: z.string().optional(),
      from_ref: z
        .object({
          kind: z.enum(['canon', 'custom']),
          ref: z.string(),
        })
        .optional(),
      to_refs: z
        .array(
          z.object({
            kind: z.enum(['canon', 'custom']),
            ref: z.string(),
          })
        )
        .optional(),
    }),
    introduced_in: z.object({
      campaign_id: z.string(),
      first_seen_location_id: z.string(),
      first_seen_session_id: z.string(),
    }),
  }),
  execute: async (data) => {
    const session = await loadSession(data.sessionId);
    if (!session) {
      throw new Error(`Session ${data.sessionId} not found`);
    }

    // Check if new species is allowed
    if (data.classification === 'new_species' && !session.custom_dex.ruleset_flags.allow_new_species) {
      throw new Error('New species creation is disabled. Set ruleset_flags.allow_new_species to true.');
    }

    // Validate base_canon_ref for variants/evolutions
    if (
      (data.classification === 'regional_variant' ||
        data.classification === 'regional_evolution' ||
        data.classification === 'split_evolution') &&
      !data.base_canon_ref
    ) {
      throw new Error(`${data.classification} requires base_canon_ref`);
    }

    // Check if already exists
    const existing = await getCustomDex(data.sessionId);
    if (existing[data.custom_species_id]) {
      throw new Error(`Custom Pokémon ${data.custom_species_id} already exists`);
    }

    // Validate schema
    const customPokemon = CustomPokemonSchema.parse(data);

    // Add to custom dex
    await addCustomPokemon(data.sessionId, customPokemon);

    return {
      success: true,
      custom_pokemon: customPokemon,
      message: `Custom Pokémon ${data.custom_species_id} created successfully`,
    };
  },
});

/**
 * Get custom Pokémon by ID
 */
export const getCustomPokemon = tool({
  description: 'Get custom Pokémon data by custom_species_id',
  inputSchema: z.object({
    sessionId: z.string(),
    custom_species_id: z.string(),
  }),
  execute: async ({ sessionId, custom_species_id }) => {
    const customDex = getCustomDex(sessionId);
    const customPokemon = customDex[custom_species_id];
    
    if (!customPokemon) {
      throw new Error(`Custom Pokémon ${custom_species_id} not found`);
    }

    return customPokemon;
  },
});

/**
 * List all custom Pokémon in session
 */
export const listCustomPokemon = tool({
  description: 'List all custom Pokémon in the session',
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: async ({ sessionId }) => {
    const customDex = await getCustomDex(sessionId);
    return {
      count: Object.keys(customDex).length,
      pokemon: Object.values(customDex),
    };
  },
});
