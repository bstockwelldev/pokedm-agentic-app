import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import MarkdownText from './MarkdownText';
import JsonViewer from './JsonViewer';
import PokemonMedia from './PokemonMedia';
import { parsePokemonRef } from '../lib/pokemonMedia';

/**
 * StateTab - Enhanced session state display with structured sections
 * Phase 3: Structured dashboard with JSON viewer and search
 */
export default function StateTab({ session }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    location: true,
    party: true,
    encounters: true,
    battle: true,
    choices: true,
    controls: false,
    inventory: false,
    failSoftFlags: false,
    customPokemon: false,
    discoveredPokemon: false,
    fullJson: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Filter session data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || !session) return session;
    
    const query = searchQuery.toLowerCase();
    const sessionStr = JSON.stringify(session).toLowerCase();
    
    if (sessionStr.includes(query)) {
      return session;
    }
    return null;
  }, [session, searchQuery]);

  const sessionSummary = useMemo(() => {
    if (!session) {
      return {
        trainers: 0,
        partyPokemon: 0,
        encounters: 0,
        eventLogEntries: 0,
      };
    }

    const characters = session.characters || [];
    const totalPartyPokemon = characters.reduce(
      (sum, character) => sum + (character.pokemon_party?.length || 0),
      0
    );
    return {
      trainers: characters.length,
      partyPokemon: totalPartyPokemon,
      encounters: session.session?.encounters?.length || 0,
      eventLogEntries: session.session?.event_log?.length || 0,
    };
  }, [session]);

  const inventoryByTrainer = useMemo(() => {
    if (!session) {
      return null;
    }

    const trainers = session.characters || [];
    if (trainers.length === 0) {
      return null;
    }

    return trainers.map((character) => ({
      character_id: character.character_id,
      trainer_name: character.trainer?.name || 'Unknown Trainer',
      inventory: character.inventory || {
        items: [],
        pokeballs: {},
        key_items: [],
      },
    }));
  }, [session]);

  if (!session) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 py-8 px-4 text-center',
          'text-muted-foreground text-sm'
        )}
        role="status"
        aria-live="polite"
      >
        <p>Session state will appear after you send a message.</p>
        <p className="text-xs">Send your first prompt in the composer to start your adventure.</p>
      </div>
    );
  }

  const sessionId = session.session?.session_id;

  const getPokemonIdentifier = (pokemon) => {
    const ref = pokemon?.species_ref?.ref || pokemon?.species_ref;
    return parsePokemonRef(ref) || pokemon?.species_name || pokemon?.name || null;
  };

  const getDiscoveredPokemonIdentifier = (entry) => {
    const ref = entry?.species_ref?.ref || entry?.species_ref;
    return parsePokemonRef(ref) || null;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <label htmlFor="state-search" className="sr-only">
          Search session state
        </label>
        <input
          id="state-search"
          type="text"
          placeholder="Search session state..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            'w-full px-3 py-2 rounded-lg',
            'bg-background/60 border border-border/60',
            'text-foreground text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
            'placeholder:text-muted'
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SummaryTile label="Trainers" value={sessionSummary.trainers} />
        <SummaryTile label="Party Pokemon" value={sessionSummary.partyPokemon} />
        <SummaryTile label="Encounters" value={sessionSummary.encounters} />
        <SummaryTile label="Event Log" value={sessionSummary.eventLogEntries} />
      </div>

      {filteredData ? (
        <>
          {/* Location Section */}
          {session.session?.scene && (
            <Section
              title="Location"
              expanded={expandedSections.location}
              onToggle={() => toggleSection('location')}
            >
              <div className="space-y-2">
                <div>
                  <strong className="text-foreground">Location ID:</strong>
                  <div className="text-muted mt-1">
                    {session.session.scene.location_id || 'Unknown'}
                  </div>
                </div>
                {session.session.scene.description && (
                  <div>
                    <strong className="text-foreground">Description:</strong>
                    <MarkdownText variant="compact" className="mt-1">
                      {session.session.scene.description}
                    </MarkdownText>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Party Section */}
          {session.characters && session.characters.length > 0 && (
            <Section
              title="Party"
              expanded={expandedSections.party}
              onToggle={() => toggleSection('party')}
            >
              <div className="space-y-3">
                {session.characters.map((char) => (
                  <div key={char.character_id} className="p-3 rounded-lg border border-border/60 bg-background/40">
                    <div className="font-medium text-foreground">
                      {char.trainer?.name || 'Unknown Trainer'}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {char.pokemon_party?.length || 0} Pokemon in party
                    </div>
                    {char.pokemon_party && char.pokemon_party.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {char.pokemon_party.map((pokemon) => {
                          const idOrName = getPokemonIdentifier(pokemon);
                          const nickname = pokemon.nickname?.trim();
                          const baseName = pokemon.species_name || pokemon.name || idOrName || 'Unknown Pokemon';
                          const label = nickname ? `${nickname} (${baseName})` : baseName;

                          return (
                            <div
                              key={pokemon.instance_id || `${char.character_id}-${baseName}`}
                              className="rounded-lg border border-border/60 bg-background/60 p-3"
                            >
                              <PokemonMedia
                                idOrName={idOrName}
                                sessionId={sessionId}
                                label={label}
                                showOfficial
                                showSprites
                              />
                              {pokemon.level && (
                                <div className="mt-2 text-xs text-muted">
                                  Level {pokemon.level}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Discovered Pokemon Section */}
          {session.continuity?.discovered_pokemon &&
            session.continuity.discovered_pokemon.length > 0 && (
              <Section
                title="Discovered Pokemon"
                expanded={expandedSections.discoveredPokemon}
                onToggle={() => toggleSection('discoveredPokemon')}
              >
                <div className="space-y-3">
                  {session.continuity.discovered_pokemon.map((entry, idx) => {
                    const idOrName = getDiscoveredPokemonIdentifier(entry);
                    const fallbackLabel = entry.species_ref?.ref || `Pokemon ${idx + 1}`;
                    return (
                      <div
                        key={`${entry.first_seen_session_id || 'session'}-${idx}`}
                        className="rounded-lg border border-border/60 bg-background/60 p-3"
                      >
                        <PokemonMedia
                          idOrName={idOrName}
                          sessionId={sessionId}
                          label={fallbackLabel}
                          showOfficial
                        />
                        <div className="mt-2 text-xs text-muted">
                          First seen: {entry.first_seen_location_id || 'Unknown location'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

          {/* Encounters Section */}
          <Section
            title="Encounters"
            expanded={expandedSections.encounters}
            onToggle={() => toggleSection('encounters')}
          >
            {session.session?.encounters && session.session.encounters.length > 0 ? (
              <div className="space-y-3">
                {[...session.session.encounters].slice(-5).reverse().map((encounter) => (
                  <div
                    key={encounter.encounter_id}
                    className="rounded-lg border border-border/60 bg-background/60 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {encounter.type} encounter
                      </span>
                      <span className="text-xs text-muted">
                        {encounter.status} · {encounter.difficulty}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Participants: {encounter.participants?.length || 0}
                    </div>
                    <div className="text-xs text-muted">
                      Wild slots: {encounter.wild_slots?.length || 0}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted italic">No encounters recorded yet</div>
            )}
          </Section>

          {/* Battle State Section */}
          {session.session?.battle_state && (
            <Section
              title="Battle State"
              expanded={expandedSections.battle}
              onToggle={() => toggleSection('battle')}
            >
              {session.session.battle_state.active ? (
                <div className="space-y-2">
                  <div className="text-red-300 font-medium">Battle Active</div>
                  <div className="text-sm text-muted">
                    Round: {session.session.battle_state.round || 0}
                  </div>
                  <div className="text-xs text-muted">
                    Encounter ID: {session.session.battle_state.encounter_id || 'Unknown'}
                  </div>
                  <div className="text-xs text-muted">
                    Turn Order Entries: {session.session.battle_state.turn_order?.length || 0}
                  </div>
                  {session.session.battle_state.last_action_summary && (
                    <div className="text-xs text-muted">
                      {session.session.battle_state.last_action_summary}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted italic">No active battle</div>
              )}
            </Section>
          )}

          {/* Player Choices Section */}
          <Section
            title="Player Choices"
            expanded={expandedSections.choices}
            onToggle={() => toggleSection('choices')}
          >
            {session.session?.player_choices?.options_presented &&
            session.session.player_choices.options_presented.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs text-muted">
                  Safe default: {session.session.player_choices.safe_default || 'Not set'}
                </div>
                {session.session.player_choices.options_presented.map((choice) => (
                  <div
                    key={choice.option_id}
                    className="rounded-lg border border-border/60 bg-background/60 p-2"
                  >
                    <div className="text-sm font-medium text-foreground">{choice.label}</div>
                    <div className="text-xs text-muted mt-1">{choice.description}</div>
                    <div className="text-[11px] text-muted mt-1">
                      {choice.option_id} · {choice.risk_level}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted italic">No choices captured yet</div>
            )}
          </Section>

          {/* Controls Section */}
          <Section
            title="Controls"
            expanded={expandedSections.controls}
            onToggle={() => toggleSection('controls')}
          >
            {session.session?.controls ? (
              <JsonViewer data={session.session.controls} />
            ) : (
              <div className="text-sm text-muted italic">No control flags set</div>
            )}
          </Section>

          {/* Inventory Section */}
          <Section
            title="Inventory"
            expanded={expandedSections.inventory}
            onToggle={() => toggleSection('inventory')}
          >
            {inventoryByTrainer ? (
              <JsonViewer data={inventoryByTrainer} />
            ) : (
              <div className="text-sm text-muted italic">No inventory items</div>
            )}
          </Section>

          {/* Fail-Soft Flags Section */}
          <Section
            title="Fail-Soft Flags"
            expanded={expandedSections.failSoftFlags}
            onToggle={() => toggleSection('failSoftFlags')}
          >
            {session.session?.fail_soft_flags ? (
              <JsonViewer data={session.session.fail_soft_flags} />
            ) : (
              <div className="text-sm text-muted italic">No fail-soft flags set</div>
            )}
          </Section>

          {/* Custom Pokémon Section */}
          {session.custom_dex && Object.keys(session.custom_dex.pokemon || {}).length > 0 && (
            <Section
              title="Custom Pokémon"
              expanded={expandedSections.customPokemon}
              onToggle={() => toggleSection('customPokemon')}
            >
              <div className="space-y-2">
                <div className="text-sm text-muted">
                  {Object.keys(session.custom_dex.pokemon).length} custom Pokémon discovered
                </div>
                <JsonViewer data={session.custom_dex.pokemon} />
              </div>
            </Section>
          )}

          {/* Full JSON Viewer */}
          <Section
            title="Full Session JSON"
            expanded={expandedSections.fullJson}
            onToggle={() => toggleSection('fullJson')}
          >
            <JsonViewer data={session} />
          </Section>
        </>
      ) : (
        <div className="text-muted italic text-sm">
          No results found for "{searchQuery}"
        </div>
      )}
    </div>
  );
}

/**
 * Section - Collapsible section component
 */
function Section({ title, expanded, onToggle, children }) {
  return (
    <div className="border border-border/60 rounded-xl bg-background/50">
      <button
        onClick={onToggle}
        className={cn(
          'w-full px-3 py-2 flex items-center justify-between',
          'text-left font-medium text-foreground',
          'hover:bg-muted/10 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
        )}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className="text-muted">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="p-3 border-t border-border/60">
          {children}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}
