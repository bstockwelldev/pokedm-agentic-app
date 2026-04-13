/**
 * CampaignBuilder — STO-33
 *
 * Host-facing UI for creating and editing campaigns.
 * Renders as a multi-tab form: Meta | World | Factions | Challenges | Custom Pokémon
 *
 * State is kept in a single `draft` object and written to the server on Save.
 * No React Router — controlled by a `view` prop from the parent.
 *
 * Props:
 *   campaignId       — existing campaign ID (null = create new)
 *   onClose()        — return to campaign list
 *   apiBase          — e.g. '/api/v1'
 */

import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { cn } from '../lib/utils';
import CustomPokemonForm from './CustomPokemonForm';
import SessionBriefComposer from './SessionBriefComposer';

// ── POKEMON TYPES ──────────────────────────────────────────────────────────────
const POKEMON_TYPES = [
  'normal','fire','water','electric','grass','ice','fighting','poison',
  'ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy',
];

// ── Draft Reducer ──────────────────────────────────────────────────────────────
function draftReducer(state, action) {
  switch (action.type) {
    case 'LOAD': return action.payload;
    case 'SET_META': return { ...state, meta: { ...state.meta, ...action.payload } };
    case 'SET_WORLD': return { ...state, world: { ...state.world, ...action.payload } };
    case 'ADD_LOCATION': return {
      ...state,
      world: { ...state.world, locations: [...(state.world?.locations ?? []), action.payload] },
    };
    case 'REMOVE_LOCATION': return {
      ...state,
      world: {
        ...state.world,
        locations: (state.world?.locations ?? []).filter((_, i) => i !== action.index),
      },
    };
    case 'ADD_FACTION': return {
      ...state,
      factions: { ...state.factions, factions: [...(state.factions?.factions ?? []), action.payload] },
    };
    case 'REMOVE_FACTION': return {
      ...state,
      factions: {
        ...state.factions,
        factions: (state.factions?.factions ?? []).filter((_, i) => i !== action.index),
      },
    };
    case 'ADD_NPC': return {
      ...state,
      world: {
        ...state.world,
        recurring_npcs: [...(state.world?.recurring_npcs ?? []), action.payload],
      },
    };
    case 'ADD_CHALLENGE': return {
      ...state,
      challenges: {
        ...state.challenges,
        challenges: [...(state.challenges?.challenges ?? []), action.payload],
      },
    };
    default: return state;
  }
}

const EMPTY_DRAFT = {
  meta: { title: '', region_name: '', tone: 'adventure', age_rating: 'all-ages', max_players: 4 },
  world: { region: { starting_location_id: '' }, locations: [], world_facts: [], recurring_npcs: [] },
  factions: { factions: [] },
  challenges: { challenges: [] },
};

const TABS = ['Meta', 'World', 'Factions', 'Challenges', 'Custom Pokémon', 'Session Brief'];

export default function CampaignBuilder({ campaignId, onClose, apiBase = '/api/v1' }) {
  const [draft, dispatch] = useReducer(draftReducer, EMPTY_DRAFT);
  const [activeTab, setActiveTab] = useState('Meta');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(!!campaignId);

  // Load existing campaign on mount
  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    fetch(`${apiBase}/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then((data) => {
        dispatch({ type: 'LOAD', payload: data.campaign ?? EMPTY_DRAFT });
      })
      .catch((err) => setSaveError(`Failed to load campaign: ${err.message}`))
      .finally(() => setLoading(false));
  }, [campaignId, apiBase]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const url = campaignId
        ? `${apiBase}/campaigns/${campaignId}`
        : `${apiBase}/campaigns`;
      const method = campaignId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }, [draft, campaignId, apiBase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-sm">
        Loading campaign...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors text-sm"
            aria-label="Back to campaign list"
          >
            ← Back
          </button>
          <h1 className="text-base font-semibold">
            {campaignId ? `Edit: ${draft.meta?.title || 'Campaign'}` : 'New Campaign'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {saveError && <span className="text-xs text-red-400">{saveError}</span>}
          {saveSuccess && <span className="text-xs text-green-400">✓ Saved</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-brand/90 text-background hover:opacity-90',
              'transition-opacity focus:outline-none focus:ring-2 focus:ring-ring',
              saving && 'opacity-50 cursor-not-allowed'
            )}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 border-b border-border/40 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-2 text-sm rounded-t-lg whitespace-nowrap transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
              activeTab === tab
                ? 'bg-background border border-border/60 border-b-background text-foreground font-medium -mb-px'
                : 'text-muted hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'Meta' && <MetaTab draft={draft} dispatch={dispatch} />}
        {activeTab === 'World' && <WorldTab draft={draft} dispatch={dispatch} />}
        {activeTab === 'Factions' && <FactionsTab draft={draft} dispatch={dispatch} />}
        {activeTab === 'Challenges' && <ChallengesTab draft={draft} dispatch={dispatch} />}
        {activeTab === 'Custom Pokémon' && (
          <CustomPokemonForm
            campaignId={campaignId}
            apiBase={apiBase}
          />
        )}
        {activeTab === 'Session Brief' && (
          <SessionBriefComposer
            campaignId={campaignId}
            locations={draft.world?.locations ?? []}
            npcs={draft.world?.recurring_npcs ?? []}
            apiBase={apiBase}
          />
        )}
      </div>
    </div>
  );
}

// ── Meta Tab ───────────────────────────────────────────────────────────────────
function MetaTab({ draft, dispatch }) {
  const meta = draft.meta ?? {};
  const set = (key, val) => dispatch({ type: 'SET_META', payload: { [key]: val } });

  return (
    <div className="max-w-lg space-y-5">
      <Field label="Campaign Title" required>
        <input type="text" value={meta.title ?? ''} onChange={(e) => set('title', e.target.value)}
          className={inputCls} placeholder="Aurora Region Chronicles" maxLength={80} />
      </Field>
      <Field label="Region Name" required>
        <input type="text" value={meta.region_name ?? ''} onChange={(e) => set('region_name', e.target.value)}
          className={inputCls} placeholder="Aurora Region" maxLength={60} />
      </Field>
      <Field label="Tone">
        <select value={meta.tone ?? 'adventure'} onChange={(e) => set('tone', e.target.value)} className={inputCls}>
          {['adventure','mystery','horror','comedy','epic','slice-of-life'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Age Rating">
        <select value={meta.age_rating ?? 'all-ages'} onChange={(e) => set('age_rating', e.target.value)} className={inputCls}>
          {['all-ages','teen','mature'].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Max Players">
        <input type="number" min={1} max={6} value={meta.max_players ?? 4}
          onChange={(e) => set('max_players', parseInt(e.target.value, 10) || 4)}
          className={cn(inputCls, 'w-24')} />
      </Field>
      <Field label="DM Persona" hint="How the DM presents itself to players">
        <textarea value={meta.dm_persona ?? ''} onChange={(e) => set('dm_persona', e.target.value)}
          rows={3} className={inputCls} placeholder="A wise and dramatic narrator with knowledge of all things Pokémon..." />
      </Field>
    </div>
  );
}

// ── World Tab ──────────────────────────────────────────────────────────────────
function WorldTab({ draft, dispatch }) {
  const world = draft.world ?? {};
  const locations = world.locations ?? [];
  const [newLoc, setNewLoc] = useState({ location_id: '', name: '', type: 'town', description: '' });

  const addLocation = () => {
    if (!newLoc.name.trim()) return;
    const id = newLoc.location_id.trim() || newLoc.name.toLowerCase().replace(/\s+/g, '-');
    dispatch({ type: 'ADD_LOCATION', payload: { ...newLoc, location_id: id } });
    setNewLoc({ location_id: '', name: '', type: 'town', description: '' });
  };

  return (
    <div className="space-y-6">
      <Field label="Starting Location ID" hint="Must match a location below">
        <input type="text" value={world.region?.starting_location_id ?? ''}
          onChange={(e) => dispatch({ type: 'SET_WORLD', payload: { region: { ...world.region, starting_location_id: e.target.value } } })}
          className={cn(inputCls, 'max-w-xs')} placeholder="frostholm-town" />
      </Field>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Locations ({locations.length})</h3>
        {locations.map((loc, i) => (
          <div key={i} className="flex items-start gap-3 p-3 border border-border/40 rounded-lg bg-background/40">
            <div className="flex-1 text-sm">
              <span className="font-medium">{loc.name}</span>
              <span className="ml-2 text-xs text-muted">[{loc.type}]</span>
              {loc.location_id && <span className="ml-2 text-xs text-muted/60">{loc.location_id}</span>}
              {loc.description && <p className="text-xs text-muted mt-0.5 line-clamp-1">{loc.description}</p>}
            </div>
            <button type="button" onClick={() => dispatch({ type: 'REMOVE_LOCATION', index: i })}
              className="text-muted hover:text-red-400 text-xs transition-colors">✕</button>
          </div>
        ))}

        {/* Add location form */}
        <div className="border border-dashed border-border/60 rounded-lg p-3 space-y-2">
          <p className="text-xs text-muted font-medium">Add Location</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Name" value={newLoc.name}
              onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })} className={inputCls} />
            <select value={newLoc.type} onChange={(e) => setNewLoc({ ...newLoc, type: e.target.value })} className={inputCls}>
              {['town','route','dungeon','landmark','gym','wilderness'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Description (optional)" value={newLoc.description}
            onChange={(e) => setNewLoc({ ...newLoc, description: e.target.value })} className={inputCls} />
          <button type="button" onClick={addLocation}
            className="px-3 py-1.5 text-xs rounded-lg bg-brand/80 text-background hover:opacity-90 transition-opacity">
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Factions Tab ───────────────────────────────────────────────────────────────
function FactionsTab({ draft, dispatch }) {
  const factions = draft.factions?.factions ?? [];
  const [newFaction, setNewFaction] = useState({ name: '', alignment: 'evil', motivation: '' });

  const addFaction = () => {
    if (!newFaction.name.trim()) return;
    dispatch({ type: 'ADD_FACTION', payload: { ...newFaction, faction_id: newFaction.name.toLowerCase().replace(/\s+/g, '-') } });
    setNewFaction({ name: '', alignment: 'evil', motivation: '' });
  };

  return (
    <div className="space-y-4">
      {factions.map((f, i) => (
        <div key={i} className="flex items-start gap-3 p-3 border border-border/40 rounded-lg">
          <div className="flex-1 text-sm">
            <span className="font-medium">{f.name}</span>
            <span className="ml-2 text-xs text-muted">[{f.alignment}]</span>
            {f.motivation && <p className="text-xs text-muted mt-0.5">{f.motivation}</p>}
          </div>
          <button type="button" onClick={() => dispatch({ type: 'REMOVE_FACTION', index: i })}
            className="text-muted hover:text-red-400 text-xs transition-colors">✕</button>
        </div>
      ))}

      <div className="border border-dashed border-border/60 rounded-lg p-3 space-y-2">
        <p className="text-xs text-muted font-medium">Add Faction</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="Faction name" value={newFaction.name}
            onChange={(e) => setNewFaction({ ...newFaction, name: e.target.value })} className={inputCls} />
          <select value={newFaction.alignment} onChange={(e) => setNewFaction({ ...newFaction, alignment: e.target.value })} className={inputCls}>
            {['evil','neutral','good','chaotic'].map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <input type="text" placeholder="Motivation / goal" value={newFaction.motivation}
          onChange={(e) => setNewFaction({ ...newFaction, motivation: e.target.value })} className={inputCls} />
        <button type="button" onClick={addFaction}
          className="px-3 py-1.5 text-xs rounded-lg bg-brand/80 text-background hover:opacity-90 transition-opacity">
          + Add Faction
        </button>
      </div>
    </div>
  );
}

// ── Challenges Tab ─────────────────────────────────────────────────────────────
function ChallengesTab({ draft, dispatch }) {
  const challenges = draft.challenges?.challenges ?? [];
  const [newChallenge, setNewChallenge] = useState({
    battle_type: 'gym', location_id: '', leader_name: '', level_cap: 15, badge_id: '',
  });

  const addChallenge = () => {
    if (!newChallenge.location_id.trim()) return;
    dispatch({ type: 'ADD_CHALLENGE', payload: { ...newChallenge } });
    setNewChallenge({ battle_type: 'gym', location_id: '', leader_name: '', level_cap: 15, badge_id: '' });
  };

  return (
    <div className="space-y-4">
      {challenges.map((c, i) => (
        <div key={i} className="p-3 border border-border/40 rounded-lg text-sm space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">{c.battle_type}</span>
            <span className="text-xs text-muted">@ {c.location_id}</span>
          </div>
          {c.leader_name && <div className="text-xs text-muted">Leader: {c.leader_name}</div>}
          <div className="text-xs text-muted">Level cap: {c.level_cap}</div>
        </div>
      ))}

      <div className="border border-dashed border-border/60 rounded-lg p-3 space-y-2">
        <p className="text-xs text-muted font-medium">Add Challenge</p>
        <div className="grid grid-cols-2 gap-2">
          <select value={newChallenge.battle_type}
            onChange={(e) => setNewChallenge({ ...newChallenge, battle_type: e.target.value })} className={inputCls}>
            {['gym','boss','rival','grunt'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input type="text" placeholder="Location ID" value={newChallenge.location_id}
            onChange={(e) => setNewChallenge({ ...newChallenge, location_id: e.target.value })} className={inputCls} />
          <input type="text" placeholder="Leader name" value={newChallenge.leader_name}
            onChange={(e) => setNewChallenge({ ...newChallenge, leader_name: e.target.value })} className={inputCls} />
          <input type="number" placeholder="Level cap" min={1} max={100} value={newChallenge.level_cap}
            onChange={(e) => setNewChallenge({ ...newChallenge, level_cap: parseInt(e.target.value) || 15 })} className={inputCls} />
          {newChallenge.battle_type === 'gym' && (
            <input type="text" placeholder="Badge ID (e.g. glacier-badge)" value={newChallenge.badge_id}
              onChange={(e) => setNewChallenge({ ...newChallenge, badge_id: e.target.value })} className={inputCls} />
          )}
        </div>
        <button type="button" onClick={addChallenge}
          className="px-3 py-1.5 text-xs rounded-lg bg-brand/80 text-background hover:opacity-90 transition-opacity">
          + Add Challenge
        </button>
      </div>
    </div>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2 rounded-lg text-sm bg-background/60 border border-border/60 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background';

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}
