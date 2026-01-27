/**
 * Session Import Utilities
 * Handles importing session data from JSON files
 */

const SUPPORTED_EXPORT_VERSION = '1.0.0';

/**
 * Parse and validate import file
 * @param {File} file - File to parse
 * @returns {Promise<object>} Parsed import data
 */
export async function parseImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error(`Invalid JSON file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Validate import data structure
 * @param {object} data - Import data
 * @returns {object} Validation result with errors and warnings
 */
export function validateImportData(data) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!data.export_version) {
    errors.push('Missing export_version field');
  } else if (data.export_version !== SUPPORTED_EXPORT_VERSION) {
    warnings.push(`Export version ${data.export_version} may not be fully compatible with current version ${SUPPORTED_EXPORT_VERSION}`);
  }

  if (!data.components || typeof data.components !== 'object') {
    errors.push('Missing or invalid components field');
  }

  if (!data.metadata) {
    warnings.push('Missing metadata field');
  }

  // Validate component structures
  if (data.components) {
    if (data.components.session && typeof data.components.session !== 'object') {
      errors.push('Invalid session component');
    }
    if (data.components.messages && !Array.isArray(data.components.messages)) {
      errors.push('Invalid messages component (must be array)');
    }
    if (data.components.characters && !Array.isArray(data.components.characters)) {
      errors.push('Invalid characters component (must be array)');
    }
    if (data.components.campaign && typeof data.components.campaign !== 'object') {
      errors.push('Invalid campaign component');
    }
    if (data.components.custom_pokemon && typeof data.components.custom_pokemon !== 'object') {
      errors.push('Invalid custom_pokemon component');
    }
    if (data.components.continuity && typeof data.components.continuity !== 'object') {
      errors.push('Invalid continuity component');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extract selected components from import data
 * @param {object} data - Import data
 * @param {object} selectedComponents - Selected components object
 * @returns {object} Extracted components
 */
export function extractComponents(data, selectedComponents) {
  const components = {};

  if (selectedComponents.session && data.components?.session) {
    components.session = data.components.session;
  }

  if (selectedComponents.messages && data.components?.messages) {
    components.messages = data.components.messages;
  }

  if (selectedComponents.characters && data.components?.characters) {
    components.characters = data.components.characters;
  }

  if (selectedComponents.campaign && data.components?.campaign) {
    components.campaign = data.components.campaign;
  }

  if (selectedComponents.customPokemon && data.components?.custom_pokemon) {
    components.custom_pokemon = data.components.custom_pokemon;
  }

  if (selectedComponents.continuity && data.components?.continuity) {
    components.continuity = data.components.continuity;
  }

  return components;
}

/**
 * Prepare session data for import
 * @param {object} components - Extracted components
 * @returns {object} Prepared session data for API
 */
export function prepareSessionForImport(components) {
  const importData = {
    session_data: null,
    messages: null,
    characters: null,
    campaign: null,
    custom_pokemon: null,
    continuity: null,
    options: {
      create_new_session: true,
      import_components: [],
    },
  };

  if (components.session) {
    importData.session_data = components.session;
    importData.options.import_components.push('session');
  }

  if (components.messages) {
    importData.messages = components.messages;
    importData.options.import_components.push('messages');
  }

  if (components.characters) {
    importData.characters = components.characters;
    importData.options.import_components.push('characters');
  }

  if (components.campaign) {
    importData.campaign = components.campaign;
    importData.options.import_components.push('campaign');
  }

  if (components.custom_pokemon) {
    importData.custom_pokemon = components.custom_pokemon;
    importData.options.import_components.push('custom_pokemon');
  }

  if (components.continuity) {
    importData.continuity = components.continuity;
    importData.options.import_components.push('continuity');
  }

  return importData;
}

/**
 * Import session via API
 * @param {object} importData - Prepared import data
 * @returns {Promise<object>} Import result
 */
export async function importSession(importData) {
  const response = await fetch('/api/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(importData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Import failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get available components from import data
 * @param {object} data - Import data
 * @returns {object} Available components status
 */
export function getAvailableImportComponents(data) {
  if (!data.components) {
    return {
      session: false,
      messages: false,
      characters: false,
      campaign: false,
      customPokemon: false,
      continuity: false,
    };
  }

  return {
    session: !!data.components.session,
    messages: !!(data.components.messages && data.components.messages.length > 0),
    characters: !!(data.components.characters && data.components.characters.length > 0),
    campaign: !!data.components.campaign,
    customPokemon: !!(data.components.custom_pokemon && Object.keys(data.components.custom_pokemon).length > 0),
    continuity: !!data.components.continuity,
  };
}
