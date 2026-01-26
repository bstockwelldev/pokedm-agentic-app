import { tool } from 'ai';

/**
 * Wrap tools to inject sessionId automatically
 * Tools from AI SDK v6 use inputSchema (not parameters)
 * @param {object} originalTool - Original tool from tools/
 * @param {string} sessionId - Session ID to inject
 * @returns {object} Wrapped tool
 */
export function wrapToolWithSession(originalTool, sessionId) {
  // Tools from AI SDK v6 are created with tool() and have a specific structure
  // The tool object should have: description, parameters (which contains inputSchema), and execute
  // However, the exact structure may vary, so we try multiple approaches
  
  try {
    // Approach 1: Direct property access (if tool exposes them)
    if (originalTool.description && originalTool.inputSchema && originalTool.execute) {
      return tool({
        description: originalTool.description,
        inputSchema: originalTool.inputSchema,
        execute: async (args) => {
          return originalTool.execute({ ...args, sessionId });
        },
      });
    }
    
    // Approach 2: Check if tool has parameters property (AI SDK internal structure)
    if (originalTool.parameters && originalTool.execute) {
      return tool({
        description: originalTool.description || originalTool.parameters?.description,
        inputSchema: originalTool.parameters?.schema || originalTool.inputSchema,
        execute: async (args) => {
          return originalTool.execute({ ...args, sessionId });
        },
      });
    }
  } catch (error) {
    console.warn('Could not wrap tool, using original:', error.message);
  }
  
  // Fallback: return original tool
  // The model will need to provide sessionId based on prompt context
  return originalTool;
}

/**
 * Wrap multiple tools with sessionId
 * @param {object} tools - Object of tools
 * @param {string} sessionId - Session ID
 * @returns {object} Wrapped tools
 */
export function wrapToolsWithSession(tools, sessionId) {
  const wrapped = {};
  Object.entries(tools).forEach(([name, toolObj]) => {
    // Check if tool needs sessionId (PokeAPI tools and custom tools)
    if (
      name.startsWith('fetch') ||
      name === 'getCustomPokemon' ||
      name === 'listCustomPokemon' ||
      name === 'createCustomPokemon'
    ) {
      wrapped[name] = wrapToolWithSession(toolObj, sessionId);
    } else {
      wrapped[name] = toolObj;
    }
  });
  return wrapped;
}
