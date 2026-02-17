/**
 * Agent Configuration
 * Defines default models, max steps, tool availability, and safety rules per agent
 */

export const agentConfig = {
  router: {
    defaultModel: process.env.LLM_MODEL || 'groq/llama-3.1-8b-instant',
    maxSteps: 2,
    tools: [], // Classification only, no tools needed
    description: 'Intent classification agent',
  },
  dm: {
    defaultModel: process.env.LLM_MODEL || 'groq/llama-3.1-8b-instant',
    maxSteps: 10,
    tools: [], // Will have access to state agent for mutations
    description: 'Narration and story agent',
    safetyRules: {
      noMatureContent: true,
      noPolitics: true,
      noHorror: true,
      familyFriendly: true,
    },
  },
  rules: {
    defaultModel: process.env.LLM_MODEL || 'groq/llama-3.1-8b-instant',
    maxSteps: 5,
    tools: ['fetchType', 'fetchMove', 'fetchAbility'], // Battle-related tools
    description: 'Battle mechanics and rules agent',
  },
  state: {
    defaultModel: process.env.LLM_MODEL || 'groq/llama-3.1-8b-instant',
    maxSteps: 3,
    tools: [], // State mutations only, no external tools
    description: 'Session state mutator agent',
  },
  lore: {
    defaultModel: process.env.LLM_MODEL || 'groq/llama-3.1-8b-instant',
    maxSteps: 5,
    tools: [
      'fetchPokemon',
      'fetchPokemonSpecies',
      'fetchMove',
      'fetchAbility',
      'fetchType',
      'fetchEvolutionChain',
      'fetchGeneration',
      'fetchItem',
      'fetchLocation',
      'getCustomPokemon',
      'listCustomPokemon',
    ],
    description: 'Pokémon data lookup agent',
  },
  design: {
    defaultModel: process.env.LLM_MODEL || 'groq/llama-3.1-8b-instant',
    maxSteps: 8,
    tools: ['createCustomPokemon', 'getCustomPokemon', 'fetchPokemon', 'fetchPokemonSpecies'],
    description: 'Custom Pokémon creation agent',
    safetyRules: {
      noMatureContent: true,
      familyFriendly: true,
      pokemonAuthentic: true,
    },
  },
};

/**
 * Get configuration for a specific agent
 * @param {string} agentName - Agent name
 * @returns {object} Agent configuration
 */
export function getAgentConfig(agentName) {
  return agentConfig[agentName] || null;
}

/**
 * Get available tools for an agent
 * @param {string} agentName - Agent name
 * @param {object} allTools - All available tools object
 * @returns {object} Filtered tools for the agent
 */
export function getAgentTools(agentName, allTools) {
  const config = getAgentConfig(agentName);
  if (!config || !config.tools) {
    return {};
  }

  const agentTools = {};
  config.tools.forEach((toolName) => {
    if (allTools[toolName]) {
      agentTools[toolName] = allTools[toolName];
    }
  });

  return agentTools;
}
