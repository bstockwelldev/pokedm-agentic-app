/**
 * Session Export Utilities
 * Handles exporting session data to JSON files
 */

const EXPORT_VERSION = '1.0.0';
const APP_VERSION = '1.0.0';

/**
 * Format export data based on selected components
 * @param {object} session - Session object
 * @param {array} messages - Messages array
 * @param {object} options - Export options
 * @returns {object} Formatted export data
 */
export function formatExportData(session, messages, options) {
  const {
    includeSession = false,
    includeMessages = false,
    includeCharacters = false,
    includeCampaign = false,
    includeCustomPokemon = false,
    includeContinuity = false,
  } = options;

  const components = {};
  const exportedComponents = [];

  if (includeSession && session?.session) {
    components.session = session.session;
    exportedComponents.push('session');
  }

  if (includeMessages && messages && messages.length > 0) {
    components.messages = messages;
    exportedComponents.push('messages');
  }

  if (includeCharacters && session?.characters) {
    components.characters = session.characters;
    exportedComponents.push('characters');
  }

  if (includeCampaign && session?.campaign) {
    components.campaign = session.campaign;
    exportedComponents.push('campaign');
  }

  if (includeCustomPokemon && session?.custom_dex?.pokemon) {
    components.custom_pokemon = session.custom_dex.pokemon;
    exportedComponents.push('custom_pokemon');
  }

  if (includeContinuity && session?.continuity) {
    components.continuity = session.continuity;
    exportedComponents.push('continuity');
  }

  return {
    export_version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    session_id: session?.session?.session_id || null,
    components,
    metadata: {
      exported_components: exportedComponents,
      app_version: APP_VERSION,
    },
  };
}

/**
 * Generate export filename with timestamp
 * @param {string} sessionId - Session ID
 * @param {string} format - Export format ('single' or 'separate')
 * @returns {string} Filename
 */
export function generateExportFilename(sessionId, format = 'single') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const sessionPrefix = sessionId ? sessionId.substring(0, 8) : 'session';
  return `pokedm-export-${sessionPrefix}-${timestamp}.json`;
}

/**
 * Download JSON data as file
 * @param {object} data - Data to download
 * @param {string} filename - Filename for download
 */
export function downloadJSON(data, filename) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function
 * @param {object} session - Session object
 * @param {array} messages - Messages array
 * @param {object} options - Export options
 */
export function exportSessionData(session, messages, options) {
  if (!session && !messages) {
    throw new Error('No data available to export');
  }

  const exportData = formatExportData(session, messages, options);
  const filename = generateExportFilename(session?.session?.session_id, options.format || 'single');
  
  downloadJSON(exportData, filename);
  
  return {
    success: true,
    filename,
    exportedComponents: exportData.metadata.exported_components,
  };
}

/**
 * Get available components for export
 * @param {object} session - Session object
 * @param {array} messages - Messages array
 * @returns {object} Available components status
 */
export function getAvailableComponents(session, messages) {
  return {
    session: !!session?.session,
    messages: !!(messages && messages.length > 0),
    characters: !!(session?.characters && session.characters.length > 0),
    campaign: !!session?.campaign,
    customPokemon: !!(session?.custom_dex?.pokemon && Object.keys(session.custom_dex.pokemon).length > 0),
    continuity: !!session?.continuity,
  };
}
