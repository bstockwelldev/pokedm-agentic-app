import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import MarkdownText from './MarkdownText';
import JsonViewer from './JsonViewer';

/**
 * StateTab - Enhanced session state display with structured sections
 * Phase 3: Structured dashboard with JSON viewer and search
 */
export default function StateTab({ session }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    location: true,
    party: true,
    battle: true,
    inventory: false,
    flags: false,
    customPokemon: false,
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
                      <div className="text-xs text-muted mt-1">
                        {char.pokemon_party.map((p, idx) => (
                          <span key={idx}>
                            {p.name || p.species_name || 'Unknown'}
                            {idx < char.pokemon_party.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

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
                </div>
              ) : (
                <div className="text-sm text-muted italic">No active battle</div>
              )}
            </Section>
          )}

          {/* Inventory Section */}
          <Section
            title="Inventory"
            expanded={expandedSections.inventory}
            onToggle={() => toggleSection('inventory')}
          >
            {session.session?.inventory && Object.keys(session.session.inventory).length > 0 ? (
              <JsonViewer data={session.session.inventory} />
            ) : (
              <div className="text-sm text-muted italic">No inventory items</div>
            )}
          </Section>

          {/* Flags Section */}
          <Section
            title="Flags"
            expanded={expandedSections.flags}
            onToggle={() => toggleSection('flags')}
          >
            {session.session?.flags && Object.keys(session.session.flags).length > 0 ? (
              <JsonViewer data={session.session.flags} />
            ) : (
              <div className="text-sm text-muted italic">No flags set</div>
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
