import { useState, useEffect, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const POKEMON_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
];

const TYPE_COLORS = {
  Normal: 'bg-gray-400', Fire: 'bg-orange-500', Water: 'bg-blue-500',
  Electric: 'bg-yellow-400', Grass: 'bg-green-500', Ice: 'bg-cyan-300',
  Fighting: 'bg-red-700', Poison: 'bg-purple-500', Ground: 'bg-yellow-700',
  Flying: 'bg-indigo-300', Psychic: 'bg-pink-500', Bug: 'bg-lime-600',
  Rock: 'bg-yellow-800', Ghost: 'bg-purple-800', Dragon: 'bg-indigo-700',
  Dark: 'bg-gray-800', Steel: 'bg-gray-500', Fairy: 'bg-pink-300',
};

const BASE_STATS = [
  { key: 'hp', label: 'HP', color: 'bg-red-500' },
  { key: 'attack', label: 'Atk', color: 'bg-orange-500' },
  { key: 'defense', label: 'Def', color: 'bg-yellow-500' },
  { key: 'special_attack', label: 'SpAtk', color: 'bg-blue-500' },
  { key: 'special_defense', label: 'SpDef', color: 'bg-green-500' },
  { key: 'speed', label: 'Speed', color: 'bg-pink-500' },
];

const DEFAULT_STATS = { hp: 50, attack: 50, defense: 50, special_attack: 50, special_defense: 50, speed: 50 };

const BLANK_POKEMON = {
  name: '',
  base_species: '',
  type1: 'Normal',
  type2: '',
  base_stats: { ...DEFAULT_STATS },
  moves: [],
  appearance: '',
  lore: '',
  catchable: true,
  shiny_variant: false,
};

const BLANK_MOVE = { name: '', type: 'Normal', category: 'Physical', power: 60, accuracy: 100, pp: 15, description: '' };

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatSlider({ stat, value, onChange }) {
  const pct = Math.round((value / 255) * 100);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 text-right text-gray-400 font-mono text-xs">{stat.label}</span>
      <input
        type="range"
        min={1}
        max={255}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-indigo-500"
      />
      <span className="w-8 text-right font-mono text-white text-xs">{value}</span>
      <div className="w-16 h-2 bg-gray-700 rounded overflow-hidden">
        <div className={`h-full rounded transition-all ${stat.color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TypeBadge({ type, selected, onClick, size = 'sm' }) {
  const base = TYPE_COLORS[type] ?? 'bg-gray-600';
  const ring = selected ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : '';
  return (
    <button
      type="button"
      onClick={() => onClick(type)}
      className={`${base} ${ring} text-white font-semibold rounded px-2 py-0.5 text-xs cursor-pointer hover:opacity-90 transition-opacity`}
    >
      {type}
    </button>
  );
}

function MoveEditor({ moves, onChange }) {
  function addMove() {
    if (moves.length >= 4) return;
    onChange([...moves, { ...BLANK_MOVE }]);
  }

  function removeMove(i) {
    onChange(moves.filter((_, idx) => idx !== i));
  }

  function updateMove(i, field, value) {
    onChange(moves.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300 font-medium">Moves ({moves.length}/4)</span>
        <button
          type="button"
          onClick={addMove}
          disabled={moves.length >= 4}
          className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-2 py-1 rounded"
        >
          + Add Move
        </button>
      </div>
      {moves.map((move, i) => (
        <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Move name"
              value={move.name}
              onChange={(e) => updateMove(i, 'name', e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeMove(i)}
              className="text-red-400 hover:text-red-300 text-sm px-1"
              title="Remove move"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Type selector */}
            <select
              value={move.type}
              onChange={(e) => updateMove(i, 'type', e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {POKEMON_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            {/* Category */}
            <select
              value={move.category}
              onChange={(e) => updateMove(i, 'category', e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option>Physical</option>
              <option>Special</option>
              <option>Status</option>
            </select>
            {/* Power */}
            <label className="flex items-center gap-1 text-xs text-gray-400">
              Pwr
              <input
                type="number"
                min={0}
                max={250}
                value={move.power}
                onChange={(e) => updateMove(i, 'power', Number(e.target.value))}
                className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
            {/* Accuracy */}
            <label className="flex items-center gap-1 text-xs text-gray-400">
              Acc
              <input
                type="number"
                min={0}
                max={100}
                value={move.accuracy}
                onChange={(e) => updateMove(i, 'accuracy', Number(e.target.value))}
                className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
            {/* PP */}
            <label className="flex items-center gap-1 text-xs text-gray-400">
              PP
              <input
                type="number"
                min={1}
                max={64}
                value={move.pp}
                onChange={(e) => updateMove(i, 'pp', Number(e.target.value))}
                className="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
          </div>
          <input
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Description (optional)"
            value={move.description}
            onChange={(e) => updateMove(i, 'description', e.target.value)}
          />
        </div>
      ))}
      {moves.length === 0 && (
        <p className="text-gray-600 text-xs italic text-center py-2">No moves yet — up to 4</p>
      )}
    </div>
  );
}

function StatBlock({ stats }) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  return (
    <div className="bg-gray-900 rounded-lg p-3 space-y-1">
      {BASE_STATS.map((s) => {
        const val = stats[s.key] ?? 0;
        const pct = Math.round((val / 255) * 100);
        return (
          <div key={s.key} className="flex items-center gap-2 text-xs">
            <span className="w-10 text-right text-gray-500">{s.label}</span>
            <div className="flex-1 h-1.5 bg-gray-700 rounded overflow-hidden">
              <div className={`h-full rounded ${s.color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-7 text-right font-mono text-gray-300">{val}</span>
          </div>
        );
      })}
      <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-gray-700">
        <span>Total</span>
        <span className="font-mono text-gray-300">{total}</span>
      </div>
    </div>
  );
}

function TypeMatchupPreview({ type1, type2 }) {
  // Simplified effectiveness chart — just shows the assigned types as badges
  if (!type1) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      <TypeBadge type={type1} selected={false} onClick={() => {}} />
      {type2 && <TypeBadge type={type2} selected={false} onClick={() => {}} />}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * CustomPokemonForm
 *
 * Props:
 *   campaignId     — string, required for save endpoint
 *   initialData    — existing Pokémon object to edit (optional)
 *   onSave(pokemon) — callback with saved data
 *   onCancel()     — dismiss form
 *   apiBase        — API base URL (e.g. '/api/v1')
 */
export default function CustomPokemonForm({ campaignId, initialData, onSave, onCancel, apiBase = '/api/v1' }) {
  const [pokemon, setPokemon] = useState(() => initialData ? { ...BLANK_POKEMON, ...initialData } : { ...BLANK_POKEMON });
  const [activeTab, setActiveTab] = useState('identity');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [speciesSuggestions, setSpeciesSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── Field helpers ──────────────────────────────────────────────────────────

  const set = useCallback((field, value) => {
    setPokemon((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setStat = useCallback((statKey, value) => {
    setPokemon((prev) => ({
      ...prev,
      base_stats: { ...prev.base_stats, [statKey]: value },
    }));
  }, []);

  // ── Type selection (toggle; max 2) ─────────────────────────────────────────

  function handleTypeClick(type) {
    if (pokemon.type1 === type) {
      set('type1', pokemon.type2 || 'Normal');
      set('type2', '');
      return;
    }
    if (pokemon.type2 === type) {
      set('type2', '');
      return;
    }
    if (!pokemon.type1) { set('type1', type); return; }
    if (!pokemon.type2) { set('type2', type); return; }
    // Replace type2 when both slots are filled
    set('type2', type);
  }

  // ── Base species PokeAPI search ────────────────────────────────────────────

  useEffect(() => {
    if (!speciesSearch || speciesSearch.length < 2) { setSpeciesSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=20&offset=0`);
        // Simple client-side filter from a fixed list is impractical;
        // hit the named endpoint directly instead
        const direct = await fetch(`https://pokeapi.co/api/v2/pokemon/${speciesSearch.toLowerCase().trim()}`);
        if (direct.ok) {
          const data = await direct.json();
          setSpeciesSuggestions([{
            name: data.name,
            id: data.id,
            stats: Object.fromEntries(
              data.stats.map((s) => [s.stat.name.replace('-', '_'), s.base_stat])
            ),
            types: data.types.map((t) => capitalize(t.type.name)),
          }]);
        } else {
          setSpeciesSuggestions([]);
        }
      } catch {
        setSpeciesSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [speciesSearch]);

  function applyBaseSpecies(suggestion) {
    const statMap = {
      hp: suggestion.stats.hp ?? 50,
      attack: suggestion.stats.attack ?? 50,
      defense: suggestion.stats.defense ?? 50,
      special_attack: suggestion.stats.special_attack ?? 50,
      special_defense: suggestion.stats.special_defense ?? 50,
      speed: suggestion.stats.speed ?? 50,
    };
    setPokemon((prev) => ({
      ...prev,
      base_species: suggestion.name,
      type1: suggestion.types[0] ?? 'Normal',
      type2: suggestion.types[1] ?? '',
      base_stats: statMap,
    }));
    setSpeciesSearch(suggestion.name);
    setSpeciesSuggestions([]);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!pokemon.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const url = initialData?.id
        ? `${apiBase}/campaigns/${campaignId}/custom-pokemon/${initialData.id}`
        : `${apiBase}/campaigns/${campaignId}/custom-pokemon`;
      const method = initialData?.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pokemon),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      onSave?.(saved);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const TABS = [
    { id: 'identity', label: 'Identity' },
    { id: 'stats', label: 'Stats' },
    { id: 'moves', label: 'Moves' },
    { id: 'lore', label: 'Lore' },
    { id: 'preview', label: 'Preview' },
  ];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
        <h3 className="font-bold text-white text-sm">
          {initialData ? 'Edit' : 'New'} Custom Pokémon
          {pokemon.name && <span className="text-indigo-400 ml-1">— {pokemon.name}</span>}
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-700 bg-gray-800 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── Identity ── */}
        {activeTab === 'identity' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Pokémon Name *</label>
              <input
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. Duskeon"
                value={pokemon.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Base Species (optional — imports stats)</label>
              <div className="relative">
                <input
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Search PokeAPI… e.g. eevee"
                  value={speciesSearch}
                  onChange={(e) => setSpeciesSearch(e.target.value)}
                />
                {searchLoading && (
                  <span className="absolute right-3 top-2.5 text-gray-500 text-xs">searching…</span>
                )}
                {speciesSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full bg-gray-800 border border-gray-600 rounded-lg mt-1 overflow-hidden shadow-xl">
                    {speciesSuggestions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => applyBaseSpecies(s)}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                        >
                          <span className="capitalize font-medium">{s.name}</span>
                          <span className="text-gray-400 text-xs">#{s.id}</span>
                          <span className="ml-auto flex gap-1">
                            {s.types.map((t) => (
                              <TypeBadge key={t} type={t} selected={false} onClick={() => {}} />
                            ))}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {pokemon.base_species && (
                <p className="text-xs text-gray-500 mt-1">
                  Based on <span className="capitalize text-indigo-400">{pokemon.base_species}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Types (click to toggle — max 2)</label>
              <div className="flex flex-wrap gap-1.5">
                {POKEMON_TYPES.map((t) => (
                  <TypeBadge
                    key={t}
                    type={t}
                    selected={pokemon.type1 === t || pokemon.type2 === t}
                    onClick={handleTypeClick}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Selected: {pokemon.type1}{pokemon.type2 ? ` / ${pokemon.type2}` : ''}
              </p>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pokemon.catchable}
                  onChange={(e) => set('catchable', e.target.checked)}
                  className="accent-indigo-500 w-4 h-4"
                />
                Catchable in wild
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pokemon.shiny_variant}
                  onChange={(e) => set('shiny_variant', e.target.checked)}
                  className="accent-indigo-500 w-4 h-4"
                />
                Has shiny variant
              </label>
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        {activeTab === 'stats' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Drag sliders to set base stats (1–255). Total shown below.</p>
            {BASE_STATS.map((s) => (
              <StatSlider
                key={s.key}
                stat={s}
                value={pokemon.base_stats[s.key] ?? 50}
                onChange={(v) => setStat(s.key, v)}
              />
            ))}
            <div className="text-right text-xs text-gray-500 font-mono">
              Total: {Object.values(pokemon.base_stats).reduce((a, b) => a + b, 0)}
            </div>
          </div>
        )}

        {/* ── Moves ── */}
        {activeTab === 'moves' && (
          <MoveEditor
            moves={pokemon.moves}
            onChange={(moves) => set('moves', moves)}
          />
        )}

        {/* ── Lore ── */}
        {activeTab === 'lore' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Appearance Description</label>
              <textarea
                rows={4}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="Describe this Pokémon's appearance — the DM uses this for narration and image generation."
                value={pokemon.appearance}
                onChange={(e) => set('appearance', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Lore / Backstory</label>
              <textarea
                rows={5}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="Origin story, regional myths, connection to the campaign… The DM can reference this in dialogue."
                value={pokemon.lore}
                onChange={(e) => set('lore', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Preview ── */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-2xl">
                  {pokemon.type1 === 'Fire' ? '🔥' : pokemon.type1 === 'Water' ? '💧' : pokemon.type1 === 'Grass' ? '🌿' : '⚡'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">
                    {pokemon.name || <span className="text-gray-500 italic">Unnamed Pokémon</span>}
                  </h4>
                  <TypeMatchupPreview type1={pokemon.type1} type2={pokemon.type2} />
                </div>
              </div>

              <StatBlock stats={pokemon.base_stats} />

              {pokemon.moves.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1 font-medium">Moves</p>
                  <div className="grid grid-cols-2 gap-1">
                    {pokemon.moves.map((m, i) => (
                      <div key={i} className="bg-gray-700 rounded px-2 py-1 text-xs">
                        <span className="text-white font-medium">{m.name || 'Unnamed'}</span>
                        <span className="text-gray-400 ml-1">
                          {m.category !== 'Status' ? `${m.power} pwr` : 'Status'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pokemon.lore && (
                <div>
                  <p className="text-xs text-gray-400 mb-1 font-medium">Lore</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{pokemon.lore}</p>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-600">
              Catchable: {pokemon.catchable ? 'Yes' : 'No'} ·
              Shiny: {pokemon.shiny_variant ? 'Yes' : 'No'}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {error && (
        <div className="px-4 py-2 bg-red-900/40 border-t border-red-700 text-red-300 text-xs">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-700 bg-gray-800">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
        >
          {saving ? 'Saving…' : initialData ? 'Update' : 'Add to Campaign'}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
