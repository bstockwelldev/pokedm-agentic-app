/**
 * KB Document Integration
 * Loads and structures KB documents following KB_INDEX.md hierarchy
 */

// KB Rules as structured data (loaded from markdown files)
// In production, these would be loaded from files, but for now we'll embed key rules

export const KB_RULES = {
  version: '1.0.0',
  hierarchy: [
    'System Instructions',
    'KB Index',
    'Core Design Rules',
    'Mechanics Rules',
    'Variant/Evolution Rules',
    'Templates & Integration Docs',
    'Reference-Only Documents',
  ],
  coreDesign: {
    title: 'Custom Pokémon Design Rules',
    status: 'Mandatory',
    rules: [
      'All custom Pokémon must remain consistent with Pokémon themes, tone, and mechanics',
      'Custom Pokémon must never replace or overwrite canon Pokémon data',
      'Custom Pokémon are treated as in-world regional discoveries or rare phenomena',
      'All custom Pokémon must be designed to be understandable and approachable for mixed-age groups',
      'Custom Pokémon should emphasize creativity, environment, and story relevance over power',
      'No custom Pokémon may introduce mature, frightening, or disturbing concepts',
      'Custom Pokémon always faint instead of dying',
      'Each custom Pokémon must have: a clear concept, a simple lore explanation, Pokémon-appropriate typing, at least one recognizable design hook',
    ],
  },
  mechanics: {
    title: 'Custom Pokémon Mechanics Rules',
    status: 'Mandatory',
    rules: [
      'Custom Pokémon use standard Pokémon mechanics',
      'Typing must use existing Pokémon types',
      'Abilities must be simple and explainable in one sentence',
      'Signature moves must avoid complex effects',
    ],
  },
  regionalVariants: {
    title: 'Regional Variant Design Rules',
    status: 'Mandatory when creating regional variants',
    rules: [
      'Regional variants must share the same base species as the original Pokémon',
      'Regional variants may change: typing, abilities, learnable moves, visual theme, behavior and habitat',
      'Regional variants must retain recognizable traits of the original Pokémon',
      'Regional variants must be explained by regional environment, culture, or history',
      'Regional variants may evolve differently than their original forms',
      'Regional variants must not invalidate the original Pokémon\'s canon form',
    ],
  },
  regionalEvolutions: {
    title: 'Regional Evolution Rules',
    status: 'Mandatory when adding new evolutions',
    rules: [
      'Regional evolutions are new evolutions exclusive to a specific region',
      'A regional evolution evolves from either a regional variant or a base Pokémon under regional conditions',
      'Evolution triggers should be simple and narrative-driven',
      'Regional evolutions must feel like natural extensions of the base Pokémon',
      'Trade evolutions should be avoided unless simplified',
    ],
  },
  splitEvolutions: {
    title: 'Split Evolution Rules',
    status: 'Optional',
    rules: [
      'Split evolutions allow one Pokémon to evolve into multiple forms',
      'Each evolution path must be distinct and balanced',
      'Evolution paths may depend on environment, items, or player choice',
      'No split evolution may be strictly superior to another',
    ],
  },
  convergentSpecies: {
    title: 'Convergent Species Rules',
    status: 'Optional, Restricted',
    rules: [
      'Convergent species resemble existing Pokémon but are not related',
      'They must have different names and evolutionary lines',
      'They exist due to similar environments or ecological roles',
      'Convergent species must NOT share evolution lines with the Pokémon they resemble',
    ],
  },
  newSpecies: {
    title: 'New Pokémon Species Rules',
    status: 'Reference Only - Disabled by Default',
    rules: [
      'Creation of entirely new species may be disabled depending on campaign rules',
      'New species creation is NOT allowed unless ruleset_flags.allow_new_species is true',
    ],
  },
  integration: {
    title: 'Integration with Session State',
    status: 'Mandatory',
    rules: [
      'Custom Pokémon are stored in session JSON alongside canon Pokémon',
      'Each custom Pokémon entry must include species, typing, ability, moves, and lore',
      'Custom Pokémon persist across sessions once discovered',
      'Custom Pokémon stored in custom_dex.pokemon, never overwriting canon_cache',
    ],
  },
};

/**
 * Get KB rules for a specific classification
 * @param {string} classification - Classification type
 * @returns {object} Relevant KB rules
 */
export function getKBRulesForClassification(classification) {
  const rules = {
    core: KB_RULES.coreDesign,
    mechanics: KB_RULES.mechanics,
    integration: KB_RULES.integration,
  };

  switch (classification) {
    case 'regional_variant':
      rules.variant = KB_RULES.regionalVariants;
      break;
    case 'regional_evolution':
      rules.evolution = KB_RULES.regionalEvolutions;
      break;
    case 'split_evolution':
      rules.evolution = KB_RULES.splitEvolutions;
      break;
    case 'convergent_species':
      rules.variant = KB_RULES.convergentSpecies;
      break;
    case 'new_species':
      rules.species = KB_RULES.newSpecies;
      break;
  }

  return rules;
}

/**
 * Get formatted KB rules text for prompts
 * @param {string} classification - Classification type
 * @returns {string} Formatted rules text
 */
export function getKBRulesText(classification) {
  const rules = getKBRulesForClassification(classification);
  let text = '';

  text += `# Core Design Rules\n${rules.core.rules.map((r) => `- ${r}`).join('\n')}\n\n`;
  text += `# Mechanics Rules\n${rules.mechanics.rules.map((r) => `- ${r}`).join('\n')}\n\n`;

  if (rules.variant) {
    text += `# ${rules.variant.title}\n${rules.variant.rules.map((r) => `- ${r}`).join('\n')}\n\n`;
  }

  if (rules.evolution) {
    text += `# ${rules.evolution.title}\n${rules.evolution.rules.map((r) => `- ${r}`).join('\n')}\n\n`;
  }

  if (rules.species) {
    text += `# ${rules.species.title}\n${rules.species.rules.map((r) => `- ${r}`).join('\n')}\n\n`;
  }

  text += `# Integration Rules\n${rules.integration.rules.map((r) => `- ${r}`).join('\n')}\n`;

  return text;
}
