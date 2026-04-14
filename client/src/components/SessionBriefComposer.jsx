import { useState, useReducer } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const BLANK_KEY_BEAT = { order: 1, description: '', optional: false };
const BLANK_AFFINITY_EVENT = { trigger: '', type: '', xp_award: 10, notes: '' };
const BLANK_NPC_PRESENT = { name: '', role: '', attitude: 'neutral' };

const BLANK_BRIEF = {
  episode_number: 1,
  episode_title: '',
  summary: '',
  location_ids: [],
  new_location_unlocks: [],
  key_beats: [],
  special_rules: '',
  affinity_xp_events: [],
  npcs_present: [],
  dm_notes: '',
};

const ATTITUDE_OPTIONS = ['friendly', 'neutral', 'hostile', 'unknown'];

// ─── Reducer ──────────────────────────────────────────────────────────────────

function briefReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'ADD_BEAT':
      return {
        ...state,
        key_beats: [...state.key_beats, { ...BLANK_KEY_BEAT, order: state.key_beats.length + 1 }],
      };
    case 'UPDATE_BEAT':
      return {
        ...state,
        key_beats: state.key_beats.map((b, i) => i === action.index ? { ...b, [action.field]: action.value } : b),
      };
    case 'REMOVE_BEAT':
      return {
        ...state,
        key_beats: state.key_beats.filter((_, i) => i !== action.index)
          .map((b, i) => ({ ...b, order: i + 1 })),
      };
    case 'MOVE_BEAT': {
      const beats = [...state.key_beats];
      const { from, to } = action;
      if (to < 0 || to >= beats.length) return state;
      [beats[from], beats[to]] = [beats[to], beats[from]];
      return { ...state, key_beats: beats.map((b, i) => ({ ...b, order: i + 1 })) };
    }
    case 'ADD_AFFINITY_EVENT':
      return { ...state, affinity_xp_events: [...state.affinity_xp_events, { ...BLANK_AFFINITY_EVENT }] };
    case 'UPDATE_AFFINITY_EVENT':
      return {
        ...state,
        affinity_xp_events: state.affinity_xp_events.map((e, i) =>
          i === action.index ? { ...e, [action.field]: action.value } : e
        ),
      };
    case 'REMOVE_AFFINITY_EVENT':
      return { ...state, affinity_xp_events: state.affinity_xp_events.filter((_, i) => i !== action.index) };
    case 'ADD_NPC':
      return { ...state, npcs_present: [...state.npcs_present, { ...BLANK_NPC_PRESENT }] };
    case 'UPDATE_NPC':
      return {
        ...state,
        npcs_present: state.npcs_present.map((n, i) =>
          i === action.index ? { ...n, [action.field]: action.value } : n
        ),
      };
    case 'REMOVE_NPC':
      return { ...state, npcs_present: state.npcs_present.filter((_, i) => i !== action.index) };
    case 'TOGGLE_LOCATION': {
      const has = state.location_ids.includes(action.id);
      return {
        ...state,
        location_ids: has
          ? state.location_ids.filter((l) => l !== action.id)
          : [...state.location_ids, action.id],
      };
    }
    case 'ADD_UNLOCK':
      return { ...state, new_location_unlocks: [...state.new_location_unlocks, ''] };
    case 'UPDATE_UNLOCK':
      return {
        ...state,
        new_location_unlocks: state.new_location_unlocks.map((u, i) => i === action.index ? action.value : u),
      };
    case 'REMOVE_UNLOCK':
      return { ...state, new_location_unlocks: state.new_location_unlocks.filter((_, i) => i !== action.index) };
    case 'RESET':
      return action.payload ?? { ...BLANK_BRIEF };
    default:
      return state;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-semibold text-gray-300">{title}</h4>
      {action}
    </div>
  );
}

function AddButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded"
    >
      + {label}
    </button>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-red-400 hover:text-red-300 text-xs px-1 shrink-0"
      title="Remove"
    >
      ✕
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * SessionBriefComposer
 *
 * Props:
 *   campaignId  — string, required
 *   locations   — [{ id, name }] from campaign world data
 *   npcs        — [{ name, role }] recurring NPCs from campaign
 *   onSave(brief) — called with saved brief
 *   onCancel()
 *   apiBase
 */
export default function SessionBriefComposer({
  campaignId,
  locations = [],
  npcs = [],
  onSave,
  onCancel,
  apiBase = '/api/v1',
}) {
  const [brief, dispatch] = useReducer(briefReducer, { ...BLANK_BRIEF });
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ── Pre-fill NPC list from campaign npcs ───────────────────────────────────
  function prefillNpcs() {
    const existing = brief.npcs_present.map((n) => n.name);
    const toAdd = npcs
      .filter((n) => !existing.includes(n.name))
      .map((n) => ({ name: n.name, role: n.role ?? '', attitude: 'neutral' }));
    if (toAdd.length === 0) return;
    toAdd.forEach(() => dispatch({ type: 'ADD_NPC' }));
    // update each new entry
    toAdd.forEach((npc, i) => {
      const idx = brief.npcs_present.length + i;
      dispatch({ type: 'UPDATE_NPC', index: idx, field: 'name', value: npc.name });
      dispatch({ type: 'UPDATE_NPC', index: idx, field: 'role', value: npc.role });
    });
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!brief.episode_title.trim()) { setError('Episode title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/campaigns/${campaignId}/session-briefs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brief),
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

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'beats', label: `Key Beats (${brief.key_beats.length})` },
    { id: 'locations', label: 'Locations' },
    { id: 'npcs', label: `NPCs (${brief.npcs_present.length})` },
    { id: 'affinity', label: `Affinity (${brief.affinity_xp_events.length})` },
    { id: 'dm', label: 'DM Notes' },
  ];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
        <h3 className="font-bold text-white text-sm">
          Session Brief Composer
          {brief.episode_title && (
            <span className="text-indigo-400 ml-2 font-normal">
              Ep. {brief.episode_number} — {brief.episode_title}
            </span>
          )}
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-700 bg-gray-800 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-24">
                <label className="block text-xs text-gray-400 mb-1">Episode #</label>
                <input
                  type="number"
                  min={1}
                  value={brief.episode_number}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'episode_number', value: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Episode Title *</label>
                <input
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. The Ruins of Stormshard Tower"
                  value={brief.episode_title}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'episode_title', value: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Episode Summary</label>
              <textarea
                rows={3}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="1–2 sentence brief the DM uses to set the scene. Players may hear a version of this as an opening narration."
                value={brief.summary}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'summary', value: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Special Rules</label>
              <textarea
                rows={2}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="e.g. No Poké Ball usage inside the tower. Doubles rules apply for all trainer battles."
                value={brief.special_rules}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'special_rules', value: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* ── Key Beats ── */}
        {activeTab === 'beats' && (
          <div className="space-y-3">
            <SectionHeader
              title="Key Beats"
              action={<AddButton onClick={() => dispatch({ type: 'ADD_BEAT' })} label="Add Beat" />}
            />
            <p className="text-xs text-gray-500">
              Story milestones the DM should hit. Mark optional beats so the DM can skip them if pacing demands.
            </p>
            {brief.key_beats.length === 0 && (
              <p className="text-gray-600 text-xs italic text-center py-4">No beats yet — add the first one.</p>
            )}
            {brief.key_beats.map((beat, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'MOVE_BEAT', from: i, to: i - 1 })}
                      disabled={i === 0}
                      className="text-gray-500 hover:text-gray-300 disabled:opacity-20 text-xs leading-none"
                    >▲</button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'MOVE_BEAT', from: i, to: i + 1 })}
                      disabled={i === brief.key_beats.length - 1}
                      className="text-gray-500 hover:text-gray-300 disabled:opacity-20 text-xs leading-none"
                    >▼</button>
                  </div>
                  <span className="w-5 h-5 bg-indigo-600 rounded-full text-xs text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
                    {beat.order}
                  </span>
                  <textarea
                    rows={2}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    placeholder="Describe this story beat…"
                    value={beat.description}
                    onChange={(e) => dispatch({ type: 'UPDATE_BEAT', index: i, field: 'description', value: e.target.value })}
                  />
                  <RemoveButton onClick={() => dispatch({ type: 'REMOVE_BEAT', index: i })} />
                </div>
                <div className="flex items-center gap-2 pl-12">
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={beat.optional}
                      onChange={(e) => dispatch({ type: 'UPDATE_BEAT', index: i, field: 'optional', value: e.target.checked })}
                      className="accent-indigo-500"
                    />
                    Optional beat
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Locations ── */}
        {activeTab === 'locations' && (
          <div className="space-y-4">
            <div>
              <SectionHeader title="Active Locations This Session" />
              <p className="text-xs text-gray-500 mb-2">
                Select which locations from your campaign are in play.
              </p>
              {locations.length === 0 && (
                <p className="text-gray-600 text-xs italic">No locations in campaign yet. Add them in the World tab.</p>
              )}
              <div className="space-y-1">
                {locations.map((loc) => {
                  const locId = typeof loc === 'string' ? loc : loc.id;
                  const locName = typeof loc === 'string' ? loc : (loc.name ?? loc.id);
                  const active = brief.location_ids.includes(locId);
                  return (
                    <label key={locId} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => dispatch({ type: 'TOGGLE_LOCATION', id: locId })}
                        className="accent-indigo-500 w-4 h-4"
                      />
                      {locName}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionHeader
                title="New Location Unlocks"
                action={<AddButton onClick={() => dispatch({ type: 'ADD_UNLOCK' })} label="Add" />}
              />
              <p className="text-xs text-gray-500 mb-2">
                Locations that become accessible after this session.
              </p>
              {brief.new_location_unlocks.map((unlock, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <input
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Location ID or name"
                    value={unlock}
                    onChange={(e) => dispatch({ type: 'UPDATE_UNLOCK', index: i, value: e.target.value })}
                  />
                  <RemoveButton onClick={() => dispatch({ type: 'REMOVE_UNLOCK', index: i })} />
                </div>
              ))}
              {brief.new_location_unlocks.length === 0 && (
                <p className="text-gray-600 text-xs italic">None yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ── NPCs ── */}
        {activeTab === 'npcs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-300">NPCs Present</h4>
              <div className="flex gap-2">
                {npcs.length > 0 && (
                  <button
                    type="button"
                    onClick={prefillNpcs}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded"
                  >
                    Import from campaign
                  </button>
                )}
                <AddButton onClick={() => dispatch({ type: 'ADD_NPC' })} label="Add NPC" />
              </div>
            </div>
            {brief.npcs_present.length === 0 && (
              <p className="text-gray-600 text-xs italic text-center py-4">No NPCs listed for this session.</p>
            )}
            {brief.npcs_present.map((npc, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex gap-2 items-start">
                  <input
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="NPC Name"
                    value={npc.name}
                    onChange={(e) => dispatch({ type: 'UPDATE_NPC', index: i, field: 'name', value: e.target.value })}
                  />
                  <RemoveButton onClick={() => dispatch({ type: 'REMOVE_NPC', index: i })} />
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Role (e.g. Gym Leader, shopkeeper)"
                    value={npc.role}
                    onChange={(e) => dispatch({ type: 'UPDATE_NPC', index: i, field: 'role', value: e.target.value })}
                  />
                  <select
                    value={npc.attitude}
                    onChange={(e) => dispatch({ type: 'UPDATE_NPC', index: i, field: 'attitude', value: e.target.value })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {ATTITUDE_OPTIONS.map((a) => (
                      <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Affinity XP Events ── */}
        {activeTab === 'affinity' && (
          <div className="space-y-3">
            <SectionHeader
              title="Affinity XP Events"
              action={<AddButton onClick={() => dispatch({ type: 'ADD_AFFINITY_EVENT' })} label="Add Event" />}
            />
            <p className="text-xs text-gray-500">
              Define in-session triggers that award type affinity XP. The affinity engine checks these when actions resolve.
            </p>
            {brief.affinity_xp_events.length === 0 && (
              <p className="text-gray-600 text-xs italic text-center py-4">No affinity events defined.</p>
            )}
            {brief.affinity_xp_events.map((evt, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex gap-2 items-start">
                  <input
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder='Trigger (e.g. "defeat_tower_boss")'
                    value={evt.trigger}
                    onChange={(e) => dispatch({ type: 'UPDATE_AFFINITY_EVENT', index: i, field: 'trigger', value: e.target.value })}
                  />
                  <RemoveButton onClick={() => dispatch({ type: 'REMOVE_AFFINITY_EVENT', index: i })} />
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder='Type (e.g. "ghost", or "all")'
                    value={evt.type}
                    onChange={(e) => dispatch({ type: 'UPDATE_AFFINITY_EVENT', index: i, field: 'type', value: e.target.value })}
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    XP
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={evt.xp_award}
                      onChange={(e) => dispatch({ type: 'UPDATE_AFFINITY_EVENT', index: i, field: 'xp_award', value: Number(e.target.value) })}
                      className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </label>
                </div>
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Notes (optional)"
                  value={evt.notes}
                  onChange={(e) => dispatch({ type: 'UPDATE_AFFINITY_EVENT', index: i, field: 'notes', value: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── DM Notes ── */}
        {activeTab === 'dm' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Private DM Notes</label>
              <p className="text-xs text-gray-600 mb-2">
                These notes are injected into the DM system prompt and are not visible to players.
              </p>
              <textarea
                rows={10}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="Twists, secrets, red herrings, exact wording for key dramatic moments, contingency plans if players go off-script…"
                value={brief.dm_notes}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'dm_notes', value: e.target.value })}
              />
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
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 bg-gray-800">
        <span className="text-xs text-gray-600">
          {brief.key_beats.length} beats · {brief.npcs_present.length} NPCs · {brief.affinity_xp_events.length} XP events
        </span>
        <div className="flex gap-2">
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
            {saving ? 'Saving…' : 'Save Brief'}
          </button>
        </div>
      </div>
    </div>
  );
}
