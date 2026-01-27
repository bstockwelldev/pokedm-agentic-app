/**
 * Session Migration Utility
 * Transforms example/legacy session JSON to schema-compliant format
 */

/**
 * Check if a session object is in example/legacy format
 * @param {Object} session - Session object to check
 * @returns {boolean} True if it appears to be in legacy format
 */
export function isLegacyFormat(session) {
  // Check for legacy indicators
  return (
    session.trainers !== undefined ||
    session.world_state !== undefined ||
    session.known_species_flags !== undefined ||
    session.next_actions !== undefined ||
    (session.campaign && !session.campaign.region) ||
    (session.session && !session.session.scene)
  );
}

/**
 * Migrate example session JSON to PokemonSessionSchema format
 * @param {Object} exampleSession - The example session JSON
 * @returns {Object} Schema-compliant session object
 */
export function migrateExampleToSchema(exampleSession) {
  // Extract data from example
  const {
    state_version,
    campaign: exampleCampaign,
    session: exampleSessionData,
    world_state,
    trainers,
    known_species_flags,
    next_actions,
  } = exampleSession;

  // Build schema-compliant structure
  const migrated = {
    // Root level
    schema_version: state_version || '1.0.0',
    
    // Required: dex
    dex: {
      canon_cache: {
        pokemon: {},
        moves: {},
        abilities: {},
        types: {},
        species: {},
        evolution_chains: {},
        items: {},
        locations: {},
        generations: {},
      },
      cache_policy: {
        source: 'pokeapi',
        gen_range: '1-9',
        ttl_hours: 24,
        max_entries_per_kind: 1000,
      },
    },

    // Required: custom_dex
    custom_dex: {
      pokemon: {},
      ruleset_flags: {
        allow_new_species: true,
      },
    },

    // Required: campaign (transform from example)
    campaign: migrateCampaign(exampleCampaign, world_state),

    // Required: characters (transform from trainers) - do this first to get character IDs
    ...(() => {
      const migratedChars = migrateTrainersToCharacters(trainers || []);
      const charIds = migratedChars.map((c) => c.character_id);
      return {
        characters: migratedChars,
        // Required: session (transform from example) - use character IDs from migrated characters
        session: migrateSessionData(exampleSessionData, exampleCampaign, world_state, next_actions, charIds),
      };
    })(),

    // Required: continuity (transform from known_species_flags and other data)
    continuity: migrateContinuity(known_species_flags, exampleSessionData, exampleCampaign),

    // Required: state_versioning
    state_versioning: {
      current_version: state_version || '1.0.0',
      previous_versions: exampleSessionData?.previous_session_id ? [exampleSessionData.previous_session_id] : [],
      migration_notes: 'Migrated from example session format',
      last_migrated_at: new Date().toISOString(),
    },
  };

  return migrated;
}

/**
 * Migrate campaign object
 */
function migrateCampaign(exampleCampaign, worldState) {
  if (!exampleCampaign) {
    return {
      campaign_id: '',
      region: { name: '', theme: '', description: '', environment_tags: [], climate: '' },
      locations: [],
      factions: [],
      recurring_npcs: [],
      world_facts: [],
    };
  }

  // Transform theme array to string (take first or join)
  const themeString = Array.isArray(exampleCampaign.theme)
    ? exampleCampaign.theme.join(', ')
    : exampleCampaign.theme || '';

  // Transform world_state.locations to campaign.locations
  const locations = [];
  if (worldState?.locations) {
    for (const [locationName, locationData] of Object.entries(worldState.locations)) {
      // Determine type from name or data
      let type = 'route';
      if (locationName.toLowerCase().includes('harbor') || locationName.toLowerCase().includes('town')) {
        type = 'town';
      } else if (locationName.toLowerCase().includes('crossing') || locationName.toLowerCase().includes('arch')) {
        type = 'landmark';
      }

      locations.push({
        location_id: locationName.toLowerCase().replace(/\s+/g, '_'),
        name: locationName,
        type: type,
        description: `${locationName} - ${locationData.status || 'active'}`,
        known: true,
      });
    }
  }

  // Extract NPCs from world_state
  const recurringNpcs = [];
  if (worldState?.locations) {
    for (const [locationName, locationData] of Object.entries(worldState.locations)) {
      if (locationData.npc_presence) {
        locationData.npc_presence.forEach((npcName) => {
          recurringNpcs.push({
            npc_id: npcName.toLowerCase().replace(/\s+/g, '_'),
            name: npcName,
            role: 'researcher', // Default, could be inferred
            disposition: 'friendly',
            home_location_id: locationName.toLowerCase().replace(/\s+/g, '_'),
          });
        });
      }
    }
  }

  // Transform global_effects to world_facts
  const worldFacts = [];
  if (worldState?.global_effects) {
    for (const [effectName, effectValue] of Object.entries(worldState.global_effects)) {
      worldFacts.push({
        fact_id: effectName.toLowerCase().replace(/\s+/g, '_'),
        title: effectName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        description: typeof effectValue === 'string' ? effectValue : JSON.stringify(effectValue),
        tags: ['global_effect'],
        revealed: true,
      });
    }
  }

  return {
    campaign_id: exampleCampaign.campaign_id || '',
    region: {
      name: exampleCampaign.name || exampleCampaign.campaign_id || '',
      theme: themeString,
      description: `${exampleCampaign.region_type || 'region'} with themes: ${themeString}`,
      environment_tags: Array.isArray(exampleCampaign.theme) ? exampleCampaign.theme : [themeString],
      climate: exampleCampaign.weather || 'temperate',
    },
    locations: locations,
    factions: [],
    recurring_npcs: recurringNpcs,
    world_facts: worldFacts,
  };
}

/**
 * Migrate trainers array to characters array
 */
function migrateTrainersToCharacters(trainers) {
  if (!Array.isArray(trainers)) {
    return [];
  }

  return trainers.map((trainer) => {
    const trainerId = trainer.trainer_id || trainer.character_id || `trainer_${Math.random().toString(36).substr(2, 9)}`;
    
    // Transform party to pokemon_party
    const pokemonParty = (trainer.party || []).map((pokemon) => migratePokemonToPartyMember(pokemon, trainerId));

    // Transform milestones
    const milestones = (trainer.milestones || []).map((milestone, index) => ({
      milestone_id: `${trainer.trainer_id}_milestone_${index}`,
      title: milestone.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      description: milestone,
      completed: true,
    }));

    return {
      character_id: trainer.trainer_id,
      trainer: {
        name: trainer.name,
        age_group: 'teen', // Default, could be inferred from class
        background: trainer.class || 'Trainer',
        personality_traits: [],
        bonds: [],
      },
      inventory: {
        items: [],
        pokeballs: {
          poke_ball: 5,
          great_ball: 0,
          ultra_ball: 0,
        },
        key_items: [],
      },
      pokemon_party: pokemonParty,
      achievements: [],
      progression: {
        badges: 0,
        milestones: milestones,
      },
    };
  });
}

/**
 * Migrate Pokemon from example format to PokemonPartyMemberSchema
 */
function migratePokemonToPartyMember(pokemon, trainerId) {
  // Determine species_ref
  const speciesName = pokemon.species?.toLowerCase() || '';
  const speciesRef = {
    kind: pokemon.variant ? 'custom' : 'canon',
    ref: pokemon.variant ? `custom:${speciesName}_${pokemon.variant.toLowerCase()}` : `canon:${speciesName}`,
  };

  // Determine form_ref
  const formRef = {
    kind: pokemon.variant ? 'regional_variant' : 'none',
    region: pokemon.variant || undefined,
    lore: pokemon.form_stage ? `Form stage: ${pokemon.form_stage}` : undefined,
    base_canon_ref: pokemon.variant ? speciesName : undefined,
  };

  // Transform HP to stats
  const hp = pokemon.hp || { current: 20, max: 20 };
  const level = pokemon.level || 1;
  
  // Calculate base stats (simplified - would need proper calculation)
  const baseStat = 10 + (level * 2);
  const stats = {
    hp: hp,
    attack: baseStat,
    defense: baseStat,
    special_attack: baseStat,
    special_defense: baseStat,
    speed: baseStat,
  };

  // Transform status string to array
  const statusConditions = [];
  if (pokemon.status && pokemon.status !== 'healthy') {
    statusConditions.push(pokemon.status);
  }

  // Get typing
  const typing = pokemon.typing || (pokemon.species ? ['Normal'] : ['Normal']);

  // Determine ability (default if not provided)
  const ability = {
    kind: 'canon',
    name: 'Unknown Ability', // Would need to look up actual ability
    description: 'Ability description not available',
  };

  // Determine moves (default if not provided)
  const moves = []; // Would need to look up level-appropriate moves

  return {
    instance_id: pokemon.pokemon_id,
    species_ref: speciesRef,
    nickname: pokemon.nickname,
    form_ref: formRef,
    typing: typing,
    level: level,
    ability: ability,
    moves: moves,
    stats: stats,
    status_conditions: statusConditions,
    friendship: 70, // Default
    known_info: {
      met_at: {
        location_id: 'unknown',
        session_id: 'unknown',
      },
      lore_learned: [],
      seen_moves: [],
    },
    notes: pokemon.experience ? `XP: ${pokemon.experience.current_xp}/${pokemon.experience.xp_to_next}` : undefined,
  };
}

/**
 * Migrate session data
 */
function migrateSessionData(exampleSession, campaign, worldState, nextActions, characterIds = []) {
  if (!exampleSession) {
    return createDefaultSession();
  }

  // Determine current location from world_state or session data
  let locationId = 'unknown';
  let locationDescription = 'Unknown location';
  
  if (worldState?.locations) {
    const locationEntries = Object.entries(worldState.locations);
    if (locationEntries.length > 0) {
      const [locationName, locationData] = locationEntries.find(([name]) => 
        name.includes(exampleSession.starting_location || exampleSession.last_checkpoint || '')
      ) || locationEntries[0];
      locationId = locationName.toLowerCase().replace(/\s+/g, '_');
      locationDescription = `${locationName} - ${locationData.status || 'active'}`;
    }
  }

  // Transform narrative_flags to objectives
  const objectives = [];
  if (exampleSession.narrative_flags) {
    for (const [flagName, flagValue] of Object.entries(exampleSession.narrative_flags)) {
      if (flagValue === true) {
        objectives.push({
          objective_id: flagName,
          description: flagName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          status: 'completed',
        });
      }
    }
  }

  // Add next_actions as objectives
  if (nextActions?.session_2_entry) {
    objectives.push({
      objective_id: 'session_entry',
      description: nextActions.session_2_entry,
      status: 'active',
    });
  }

  // Transform next_actions.default_choice to player_choices
  const playerChoices = {
    options_presented: [],
    safe_default: nextActions?.default_choice || undefined,
    last_choice: undefined,
  };

  // Extract character IDs from trainers
  const characterIds = trainers ? trainers.map((t) => t.trainer_id || t.character_id).filter(Boolean) : [];

  return {
    session_id: exampleSession.session_id,
    campaign_id: campaign?.campaign_id || '',
    character_ids: characterIds,
    episode_title: exampleSession.title || exampleSession.session_id,
    scene: {
      location_id: locationId,
      description: locationDescription,
      mood: 'calm', // Default
    },
    current_objectives: objectives,
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
    player_choices: playerChoices,
    controls: {
      pause_requested: false,
      skip_requested: false,
      explain_requested: false,
    },
    event_log: [],
  };
}

/**
 * Migrate continuity data
 */
function migrateContinuity(knownSpeciesFlags, sessionData, campaign) {
  const discoveredPokemon = [];
  
  if (knownSpeciesFlags) {
    for (const [flagName, flagValue] of Object.entries(knownSpeciesFlags)) {
      if (flagValue === true && flagName.includes('variant')) {
        // Extract species name from flag
        const speciesMatch = flagName.match(/(\w+)_variant/);
        if (speciesMatch) {
          const speciesName = speciesMatch[1];
          discoveredPokemon.push({
            species_ref: {
              kind: 'custom',
              ref: `custom:${speciesName.toLowerCase()}`,
            },
            form_ref: {
              kind: 'regional_variant',
              region: campaign?.campaign_id || 'unknown',
            },
            first_seen_location_id: 'unknown',
            first_seen_session_id: sessionData?.session_id || 'unknown',
            notes: `Discovered via flag: ${flagName}`,
          });
        }
      }
    }
  }

  return {
    timeline: [],
    discovered_pokemon: discoveredPokemon,
    unresolved_hooks: [],
    recaps: [],
  };
}

/**
 * Create default session structure
 */
function createDefaultSession() {
  return {
    session_id: 'session_default',
    campaign_id: '',
    character_ids: [],
    episode_title: 'New Session',
    scene: {
      location_id: 'unknown',
      description: 'Unknown location',
      mood: 'calm',
    },
    current_objectives: [],
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
    },
    controls: {
      pause_requested: false,
      skip_requested: false,
      explain_requested: false,
    },
    event_log: [],
  };
}

/**
 * Validate migrated session against schema
 * @param {Object} migratedSession - The migrated session object
 * @param {Object} PokemonSessionSchema - The Zod schema
 * @returns {Object} Validation result
 */
export function validateMigratedSession(migratedSession, PokemonSessionSchema) {
  try {
    const validated = PokemonSessionSchema.parse(migratedSession);
    return {
      valid: true,
      data: validated,
      errors: null,
    };
  } catch (error) {
    return {
      valid: false,
      data: null,
      errors: error.errors || [error.message],
    };
  }
}
