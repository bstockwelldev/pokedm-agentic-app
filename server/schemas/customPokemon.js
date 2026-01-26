import { z } from 'zod';
import { SpeciesRefSchema } from './references.js';

/**
 * Custom Pokémon Template Schema
 * Matches custom_dex.pokemon.template.json structure
 */
export const CustomPokemonSchema = z.object({
  custom_species_id: z.string().regex(/^cstm_/), // Must start with cstm_
  display_name: z.string().min(1),
  classification: z.enum([
    'regional_variant',
    'regional_evolution',
    'split_evolution',
    'convergent_species',
    'new_species',
  ]),
  resembles: z
    .object({
      base_canon_ref: z.string(),
      note: z.string().optional(),
    })
    .optional(),
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
    from_ref: SpeciesRefSchema.optional(),
    to_refs: z.array(SpeciesRefSchema).optional(),
  }),
  introduced_in: z.object({
    campaign_id: z.string(),
    first_seen_location_id: z.string(),
    first_seen_session_id: z.string(),
  }),
});

// TypeScript type (for TypeScript projects):
// export type CustomPokemon = z.infer<typeof CustomPokemonSchema>;
