import { z } from 'zod';

/**
 * Species Reference Schema
 * References either canon or custom Pokémon species
 * Format: "canon:pikachu" or "custom:cstm_embermole"
 */
export const SpeciesRefSchema = z.object({
  kind: z.enum(['canon', 'custom']),
  ref: z.string().min(1),
});

/**
 * Form Reference Schema
 * Describes variant forms of Pokémon (regional variants, evolutions, etc.)
 */
export const FormRefSchema = z.object({
  kind: z.enum([
    'none',
    'regional_variant',
    'regional_evolution',
    'split_evolution',
    'convergent_species',
    'new_species',
  ]),
  region: z.string().optional(),
  lore: z.string().optional(),
  base_canon_ref: z.string().optional(),
});

// TypeScript types (for TypeScript projects):
// export type SpeciesRef = z.infer<typeof SpeciesRefSchema>;
// export type FormRef = z.infer<typeof FormRefSchema>;
