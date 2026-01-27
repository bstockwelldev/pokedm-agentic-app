import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import {
  parseImportFile,
  validateImportData,
  extractComponents,
  prepareSessionForImport,
  importSession,
  getAvailableImportComponents,
  convertRawSessionToExportFormat,
  isRawSessionFormat,
} from '../lib/importSession';
import MarkdownText from './MarkdownText';

/**
 * ImportDrawer Component
 * Modal drawer for importing session data
 */
export default function ImportDrawer({
  isOpen,
  onClose,
  onImportSuccess,
}) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const [importData, setImportData] = useState(null);
  const [selectedComponents, setSelectedComponents] = useState({});
  const [validation, setValidation] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Reset state when drawer opens/closes
  useEffect(() => {
    if (isOpen) {
      setImportData(null);
      setSelectedComponents({});
      setValidation(null);
      setImportError(null);
      
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Trap focus within drawer
      if (e.key === 'Tab') {
        const focusableElements = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFileSelect = async (file) => {
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportError('Please select a JSON file');
      return;
    }

    try {
      const data = await parseImportFile(file);
      const validationResult = validateImportData(data);
      setValidation(validationResult);

      if (validationResult.valid) {
        // Convert raw session format to export format for consistent handling
        const processedData = validationResult.isRawFormat
          ? convertRawSessionToExportFormat(data)
          : data;
        setImportData(processedData);
        const available = getAvailableImportComponents(processedData);
        // Pre-select all available components
        setSelectedComponents(available);
        setImportError(null);
      } else {
        setImportError(`Validation failed: ${validationResult.errors.join(', ')}`);
        setImportData(null);
      }
    } catch (error) {
      setImportError(error.message || 'Failed to parse file');
      setImportData(null);
      setValidation(null);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleLoadExample = async () => {
    try {
      setImportError(null);
      // Fetch example session from public/examples or server/examples
      // Try multiple paths for different deployment scenarios
      let exampleData = null;
      let fetchError = null;

      // Try fetching from public examples directory first
      const publicPaths = [
        '/examples/example-campaign-session.json',
        '/examples/example-campaign-session-raw.json',
        '/server/examples/example-campaign-session.json',
        '/example-campaign-session.json',
      ];

      for (const path of publicPaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            exampleData = await response.json();
            break;
          }
        } catch (err) {
          fetchError = err;
          continue;
        }
      }

      // If not found via fetch, use embedded example data
      if (!exampleData) {
        // Fallback: use the export format example data directly
        exampleData = {
          export_version: '1.0.0',
          exported_at: new Date().toISOString(),
          session_id: 'session_example_001',
          components: {
            session: {
              session_id: 'session_example_001',
              campaign_id: 'celestide_isles',
              character_ids: ['trainer_alex'],
              episode_title: 'The Journey Begins',
              scene: {
                location_id: 'route_2_southern_approach',
                description: "You're standing at the edge of Route 2, looking out over the Skyfall Expanse. The wind is gentle today, perfect for travel. Professor Liora's words echo in your mind: 'The islands hold many secrets. Trust your Pokémon, and they'll guide you.'",
                mood: 'adventurous',
              },
              current_objectives: [
                {
                  objective_id: 'obj_explore_route_2',
                  description: 'Explore Route 2 and reach Skyfall Expanse',
                  status: 'active',
                  notes: 'First major exploration objective',
                },
                {
                  objective_id: 'obj_meet_wind_wardens',
                  description: 'Learn about the Wind Wardens faction',
                  status: 'active',
                  notes: 'Optional: Discover more about the region's protectors',
                },
              ],
              encounters: [],
              battle_state: {
                active: false,
                round: 0,
                turn_order: [],
                field_effects: [],
              },
              fail_soft_flags: {
                recent_failures: 0,
                recent_successes: 0,
                difficulty_adjusted: false,
                party_confidence: 'medium',
                auto_scaled_last_encounter: false,
              },
              player_choices: {
                options_presented: [],
                safe_default: 'Continue along Route 2',
              },
              controls: {
                pause_requested: false,
                skip_requested: false,
                explain_requested: false,
              },
              event_log: [
                {
                  t: '2026-01-27T00:00:00.000Z',
                  kind: 'scene',
                  summary: 'Arrived in Skysong Harbor',
                  details: 'Met Professor Liora and received starter Pokémon Pikachu',
                },
                {
                  t: '2026-01-27T00:15:00.000Z',
                  kind: 'discovery',
                  summary: 'Received Pokédex from Professor Liora',
                  details: 'The Pokédex will help track discovered Pokémon in the region',
                },
                {
                  t: '2026-01-27T00:30:00.000Z',
                  kind: 'scene',
                  summary: 'Started journey on Route 2',
                  details: 'Left Skysong Harbor and began exploring the Southern Approach',
                },
              ],
            },
            messages: [],
            characters: [
              {
                character_id: 'trainer_alex',
                trainer: {
                  name: 'Alex',
                  age_group: 'teen',
                  background: 'Aspiring Pokémon researcher who just arrived in Celestide Isles',
                  personality_traits: ['curious', 'brave', 'caring'],
                  bonds: [
                    {
                      bond_id: 'bond_starter',
                      target: 'pokemon_pikachu_001',
                      description: 'First Pokémon partner, received from Professor Liora',
                    },
                  ],
                },
                inventory: {
                  items: [
                    { kind: 'canon', ref: 'canon:potion', quantity: 3, notes: 'Basic healing item' },
                    { kind: 'canon', ref: 'canon:antidote', quantity: 2, notes: 'Cures poison status' },
                  ],
                  pokeballs: { poke_ball: 10, great_ball: 0, ultra_ball: 0 },
                  key_items: [{ kind: 'canon', ref: 'canon:pokedex', notes: 'Pokédex from Professor Liora' }],
                },
                pokemon_party: [
                  {
                    instance_id: 'pokemon_pikachu_001',
                    species_ref: { kind: 'canon', ref: 'canon:pikachu' },
                    nickname: 'Sparky',
                    form_ref: { kind: 'none' },
                    typing: ['Electric'],
                    level: 5,
                    ability: { kind: 'canon', name: 'static', description: 'Contact with this Pokémon may cause paralysis' },
                    moves: [
                      { kind: 'canon', name: 'thunder-shock', type: 'Electric', category: 'special', pp: 30, accuracy: 100, power: 40, simple_effect: 'A weak electric attack' },
                      { kind: 'canon', name: 'growl', type: 'Normal', category: 'status', pp: 40, accuracy: 100, power: null, simple_effect: "Lowers the target's Attack stat" },
                    ],
                    stats: { hp: { current: 20, max: 20 }, attack: 20, defense: 15, special_attack: 25, special_defense: 20, speed: 30 },
                    status_conditions: [],
                    friendship: 70,
                    known_info: {
                      met_at: { location_id: 'skysong_harbor', session_id: 'session_example_001' },
                      lore_learned: ['Pikachu is an Electric-type Pokémon', 'Pikachu evolves from Pichu with high friendship'],
                      seen_moves: ['thunder-shock', 'growl'],
                    },
                    notes: 'Starter Pokémon received from Professor Liora. Very friendly and eager to explore.',
                  },
                ],
                achievements: [
                  {
                    achievement_id: 'achievement_starter',
                    title: 'First Partner',
                    description: 'Received your first Pokémon from Professor Liora',
                    earned_in_session_id: 'session_example_001',
                  },
                ],
                progression: {
                  badges: 0,
                  milestones: [
                    { milestone_id: 'milestone_arrival', title: 'Arrived in Celestide Isles', description: 'Started your adventure in the floating archipelago', completed: true },
                    { milestone_id: 'milestone_starter', title: 'Obtained Starter Pokémon', description: 'Received Pikachu from Professor Liora', completed: true },
                    { milestone_id: 'milestone_first_route', title: 'Explore Route 2', description: 'Travel to Skyfall Expanse and discover new Pokémon', completed: false },
                  ],
                },
              },
            ],
            campaign: {
              campaign_id: 'celestide_isles',
              region: {
                name: 'Celestide Isles',
                theme: 'wind, celestial energy, environmental balance',
                description: 'A floating archipelago where wind currents carry celestial energy. The islands are connected by natural bridges and floating platforms. The region is known for its unique Pokémon that have adapted to the high-altitude, wind-swept environment.',
                environment_tags: ['wind', 'celestial energy', 'environmental balance', 'floating islands', 'high altitude'],
                climate: 'clear_wind',
              },
              locations: [
                {
                  location_id: 'skysong_harbor',
                  name: 'Skysong Harbor',
                  type: 'town',
                  description: 'A bustling port town built on the largest floating island. The harbor is filled with wind-powered ships and gliders. Professor Liora's research lab overlooks the harbor, studying the unique Pokémon of the region.',
                  known: true,
                },
                {
                  location_id: 'route_2_southern_approach',
                  name: 'Route 2 - Southern Approach',
                  type: 'route',
                  description: 'A scenic route connecting Skysong Harbor to the Skyfall Expanse. Wind currents make travel easier, and wild Pokémon are more active during certain times of day.',
                  known: true,
                },
                {
                  location_id: 'skyfall_expanse',
                  name: 'Skyfall Expanse',
                  type: 'route',
                  description: 'A vast open area between islands where trainers can practice battling. The wind here is strong, making it a popular spot for Flying-type Pokémon.',
                  known: false,
                },
              ],
              factions: [
                {
                  faction_id: 'wind_wardens',
                  name: 'Wind Wardens',
                  philosophy: 'Protect the natural wind currents and celestial energy balance',
                  tone: 'idealistic',
                  known_members: [{ npc_id: 'ranger_kai', role: 'ranger', notes: 'Leader of the Wind Wardens' }],
                  status: 'active',
                },
              ],
              recurring_npcs: [
                {
                  npc_id: 'professor_liora',
                  name: 'Professor Liora',
                  role: 'researcher',
                  disposition: 'friendly',
                  home_location_id: 'skysong_harbor',
                  notes: 'Expert on Celestide Isles Pokémon and their adaptations to wind and altitude',
                },
                {
                  npc_id: 'assistant_kael',
                  name: 'Assistant Kael',
                  role: 'researcher',
                  disposition: 'friendly',
                  home_location_id: 'skysong_harbor',
                  notes: 'Helps Professor Liora with research and provides starter Pokémon to new trainers',
                },
              ],
              world_facts: [
                {
                  fact_id: 'celestial_alignment',
                  title: 'Celestial Alignment',
                  description: 'Every 100 years, the celestial bodies align perfectly over the Celestide Isles, causing a surge in Pokémon activity and rare encounters.',
                  tags: ['global_effect', 'celestial', 'rare_encounters'],
                  revealed: true,
                },
                {
                  fact_id: 'wind_currents',
                  title: 'Wind Currents',
                  description: 'The wind currents in the region are currently favorable, making travel between islands easier and faster.',
                  tags: ['global_effect', 'travel', 'wind'],
                  revealed: true,
                },
              ],
            },
            custom_pokemon: {},
            continuity: {
              timeline: [
                {
                  session_id: 'session_example_001',
                  episode_title: 'The Journey Begins',
                  summary: 'Arrived in Celestide Isles and met Professor Liora',
                  canonized: true,
                  date: '2026-01-27',
                  tags: ['arrival', 'meeting'],
                },
                {
                  session_id: 'session_example_001',
                  episode_title: 'The Journey Begins',
                  summary: 'Received starter Pokémon Pikachu (nicknamed Sparky)',
                  canonized: true,
                  date: '2026-01-27',
                  tags: ['pokemon', 'starter'],
                },
                {
                  session_id: 'session_example_001',
                  episode_title: 'The Journey Begins',
                  summary: 'Began exploration of Route 2 - Southern Approach',
                  canonized: true,
                  date: '2026-01-27',
                  tags: ['exploration', 'route'],
                },
              ],
              discovered_pokemon: [
                {
                  species_ref: { kind: 'canon', ref: 'canon:pikachu' },
                  form_ref: { kind: 'none' },
                  first_seen_location_id: 'skysong_harbor',
                  first_seen_session_id: 'session_example_001',
                  notes: 'Starter Pokémon received from Professor Liora',
                },
              ],
              unresolved_hooks: [
                {
                  hook_id: 'hook_wind_wardens',
                  description: 'Learn more about the Wind Wardens and their mission',
                  urgency: 'low',
                  introduced_in_session_id: 'session_example_001',
                  linked_faction_id: 'wind_wardens',
                  status: 'open',
                },
              ],
              recaps: [],
            },
          },
          metadata: {
            exported_components: ['session', 'characters', 'campaign', 'continuity'],
            app_version: '1.0.0',
            description: 'Example campaign session for Celestide Isles - ready to import and continue',
          },
        };
      }

      // Validate and process the example data
      const validationResult = validateImportData(exampleData);
      setValidation(validationResult);

      if (validationResult.valid) {
        // Convert raw session format to export format if needed
        const processedData = validationResult.isRawFormat
          ? convertRawSessionToExportFormat(exampleData)
          : exampleData;
        setImportData(processedData);
        const available = getAvailableImportComponents(processedData);
        // Pre-select all available components
        setSelectedComponents(available);
        setImportError(null);
      } else {
        setImportError(`Validation failed: ${validationResult.errors.join(', ')}`);
        setImportData(null);
      }
    } catch (error) {
      setImportError(error.message || 'Failed to load example session');
      setImportData(null);
      setValidation(null);
    }
  };

  const handleComponentToggle = (component) => {
    setSelectedComponents((prev) => ({
      ...prev,
      [component]: !prev[component],
    }));
  };

  const handleImport = async () => {
    if (!importData) {
      setImportError('No file selected');
      return;
    }

    const hasSelection = Object.values(selectedComponents).some((selected) => selected);
    if (!hasSelection) {
      setImportError('Please select at least one component to import');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const components = extractComponents(importData, selectedComponents);
      const importPayload = prepareSessionForImport(components);
      const result = await importSession(importPayload);

      // Call success callback with new session data
      if (onImportSuccess) {
        onImportSuccess(result);
      }

      // Close drawer after short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      setImportError(error.message || 'Failed to import session');
    } finally {
      setIsImporting(false);
    }
  };

  const availableComponents = importData ? getAvailableImportComponents(importData) : {};

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={drawerRef}
        className={cn(
          'bg-background border border-border rounded-lg shadow-lg',
          'w-full max-w-2xl max-h-[90vh] overflow-hidden',
          'flex flex-col',
          'm-4'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="import-drawer-title" className="text-xl font-semibold text-foreground">
            Import Session
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className={cn(
              'px-3 py-1.5 rounded-md',
              'text-muted hover:text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              'transition-colors'
            )}
            aria-label="Close import dialog"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* File Upload */}
          {!importData && (
            <div className="space-y-4">
              {/* Preset/Example Loader */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Load Example Session
                </h3>
                <button
                  onClick={handleLoadExample}
                  className={cn(
                    'w-full px-4 py-3 rounded-md',
                    'bg-purple-900/30 border border-purple-800/50',
                    'text-purple-200 hover:text-purple-100',
                    'font-medium',
                    'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-background',
                    'hover:bg-purple-900/40 active:bg-purple-900/50 transition-colors',
                    'flex items-center justify-center gap-2'
                  )}
                  aria-label="Load example campaign session"
                >
                  <span>📚</span>
                  <span>Load Celestide Isles Example</span>
                </button>
                <p className="text-xs text-muted mt-2 text-center">
                  Start with a pre-configured example campaign session
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted">Or</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Select Export File
                </h3>
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center',
                    'transition-colors',
                    dragActive
                      ? 'border-brand bg-brand/10'
                      : 'border-border hover:border-brand/50'
                  )}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileInputChange}
                    className="hidden"
                    aria-label="Select JSON file to import"
                  />
                  <p className="text-foreground mb-2">
                    Drag and drop a JSON file here, or
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'px-4 py-2 rounded-md',
                      'bg-brand text-background font-medium',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                      'hover:opacity-90 active:opacity-80 transition-opacity'
                    )}
                  >
                    Browse Files
                  </button>
                  <p className="text-xs text-muted mt-2">
                    Select a PokeDM export file (.json) or raw session file
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Import Preview */}
          {importData && (
            <>
              {/* File Info */}
              <div className="p-3 rounded-md bg-muted/10 border border-border">
                <div className="text-sm text-foreground font-medium mb-1">
                  File Loaded Successfully
                </div>
                {importData.session_id && (
                  <div className="text-xs text-muted">
                    Original Session: {importData.session_id.substring(0, 20)}...
                  </div>
                )}
                {importData.exported_at && (
                  <div className="text-xs text-muted">
                    Exported: {new Date(importData.exported_at).toLocaleString()}
                  </div>
                )}
                {validation?.warnings && validation.warnings.length > 0 && (
                  <div className="mt-2 text-xs text-orange-300">
                    Warnings: {validation.warnings.join(', ')}
                  </div>
                )}
              </div>

              {/* Component Selection */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Select Components to Import
                </h3>
                <div className="space-y-2">
                  {[
                    { key: 'session', label: 'Session State', description: 'Current scene, objectives, battle state' },
                    { key: 'messages', label: 'Chat Messages', description: 'All conversation history' },
                    { key: 'characters', label: 'Characters', description: 'Trainers, inventory, Pokémon party' },
                    { key: 'campaign', label: 'Campaign/Lore', description: 'Region, locations, NPCs, world facts' },
                    { key: 'customPokemon', label: 'Custom Pokémon', description: 'All custom Pokémon created' },
                    { key: 'continuity', label: 'Continuity', description: 'Timeline, discovered Pokémon, hooks' },
                  ].map(({ key, label, description }) => (
                    <label
                      key={key}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-md border cursor-pointer',
                        'transition-colors',
                        availableComponents[key]
                          ? selectedComponents[key]
                            ? 'border-brand bg-brand/10'
                            : 'border-border hover:border-brand/50'
                          : 'border-border/50 bg-muted/10 opacity-50 cursor-not-allowed'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedComponents[key] || false}
                        onChange={() => handleComponentToggle(key)}
                        disabled={!availableComponents[key]}
                        className="mt-1"
                        aria-label={`Import ${label}`}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{label}</div>
                        <div className="text-xs text-muted mt-0.5">{description}</div>
                        {!availableComponents[key] && (
                          <div className="text-xs text-muted mt-1 italic">Not available in file</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Change File Button */}
              <button
                onClick={() => {
                  setImportData(null);
                  setSelectedComponents({});
                  setValidation(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className={cn(
                  'w-full px-4 py-2 rounded-md',
                  'bg-input border border-border',
                  'text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                  'hover:bg-muted/20 transition-colors'
                )}
              >
                Select Different File
              </button>
            </>
          )}

          {/* Error Message */}
          {importError && (
            <div
              className="p-3 rounded-md bg-red-900/20 border border-red-800/30 text-sm"
              role="alert"
            >
              <MarkdownText variant="error">
                {importError}
              </MarkdownText>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 rounded-md',
              'bg-input border border-border',
              'text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              'hover:bg-muted/20 transition-colors'
            )}
            disabled={isImporting}
          >
            Cancel
          </button>
          {importData && (
            <button
              onClick={handleImport}
              disabled={isImporting || !Object.values(selectedComponents).some((s) => s)}
              className={cn(
                'px-4 py-2 rounded-md',
                'bg-brand text-background font-medium',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'hover:opacity-90 active:opacity-80 transition-opacity'
              )}
              aria-label="Import selected components"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
