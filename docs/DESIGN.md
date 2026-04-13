# PokeDM — Technical Design

> **Audience**: Developers building or extending PokeDM.
> **Last updated**: April 2026

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React/Vite)                  │
│  Campaign Builder UI  │  Session Play Screen  │  Lobby      │
│  Voice STT (browser)  │  Voice TTS (browser)  │  Host Ctrl  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / fetch
┌──────────────────────────────▼──────────────────────────────┐
│                    EXPRESS SERVER (Node)                     │
│                                                             │
│  POST /agent          POST /sessions     GET /sessions/:id  │
│  POST /agent/stream   POST /image        POST /campaigns    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Intent Classifier                       │   │
│  │   keyword patterns → LLM fallback (generateObject)  │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │ intent queue                       │
│  ┌──────────┬──────────┬▼──────────┬──────────┬─────────┐  │
│  │ DM Agent │  Rules   │  State    │  Lore    │ Design  │  │
│  │ stream   │  Agent   │  Agent    │  Agent   │  Agent  │  │
│  └──────────┴──────────┴──────────┴──────────┴─────────┘  │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐ │
│  │ Battle Engine │  │ Affinity      │  │ Pokemon        │ │
│  │ (pure JS)     │  │ Engine (pure) │  │ Resolver       │ │
│  └───────────────┘  └───────────────┘  └────────────────┘ │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐                      │
│  │ Campaign      │  │ Session       │                      │
│  │ Config Loader │  │ Storage       │                      │
│  │ + Validator   │  │ (File/Postgres)│                     │
│  └───────────────┘  └───────────────┘                      │
└─────────────────────────────────────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
           PokeAPI          OpenAI          Postgres
         (species/moves)   (LLM/DALL-E)   (session state)
```

---

## Directory Structure

```
server/
  agents/         — AI agent modules (dm, rules, state, lore, design, router)
  battle/         — Pure JS engines (engine.js, battleManager.js, affinityEngine.js)
  campaigns/      — Campaign config directories
    aurora-region/
      meta.json
      world.json
      factions.json
      challenges.json
      custom-pokemon.json
      session-1-brief.json
      kb/           — Campaign-specific KB overrides (optional)
  config/         — Agent configuration (models, maxSteps, etc.)
  kb/
    knowledge/    — Core markdown rule files
    systems/      — Encounter tables, evolution rules
    index.js      — File-system loader
  lib/            — Shared utilities
    contextBuilder.js
    intentClassifier.js
    pokemonResolver.js
    resolveModel.js
    classifyAgentError.js
  middleware/     — validateRequest.js
  prompts/        — System prompts for each agent
  schemas/        — JSON Schema definitions
    campaign/
    trainer.schema.json
    pokemon-entity.schema.json
    battle-state.schema.json
  storage/
    adapters/     — file.js, postgres.js
  tools/
    pokeapi.js    — Live PokeAPI tool calls
  server.js       — Express app

client/
  src/
    components/
      VoiceInput.jsx
      VoiceOutput.jsx
      BattlePanel.jsx
      PartySidebar.jsx
      DMNarration.jsx
    pages/
      CampaignList.jsx
      CampaignEditor.jsx
      SessionLobby.jsx
      SessionPlay.jsx
    hooks/
      useSpeech.js
      useSession.js
```

---

## Data Models

### Campaign Config

The campaign config lives in `server/campaigns/:id/` as a set of JSON files, all validated against schemas in `server/schemas/campaign/` at server startup.

**meta.json**
```json
{
  "id": "aurora-region",
  "name": "Aurora Region Adventure",
  "regionName": "Aurora Region",
  "rulesVariant": "standard",
  "dmPersona": "A wise and dramatic DM who favours dramatic pauses and vivid descriptions of the frozen landscape.",
  "starterPool": ["bulbasaur", "charmander", "squirtle", "regional-vulpix-ice"],
  "affinityRules": {
    "maxAffinities": 2,
    "xpMultiplier": 1.0
  }
}
```

**world.json** — regions, routes, towns, wild encounter tables per area.

**factions.json** — evil teams (ranks, grunt party templates, admin/boss parties), rival trainers, gym leaders.

**challenges.json** — gym/boss encounters with format, scaling mode, special rules, reward definitions.

**session-N-brief.json** — per-session host prep: location unlocks, story beat anchors, NPCs present, encounter table overrides, affinity XP events.

**custom-pokemon.json** — regional forms and custom evolutions (see Custom Pokémon section below).

---

### Trainer / Player State

```json
{
  "trainerId": "uuid",
  "name": "Rowan",
  "trainerClass": "Ace Trainer",
  "level": 12,
  "typeAffinities": [
    {
      "type": "ice",
      "rank": 3,
      "xp": 450,
      "xpToNextRank": 800,
      "unlockedAbilities": ["cryo_sense"]
    }
  ],
  "party": ["pokemon-entity-uuid-1", "pokemon-entity-uuid-2"],
  "storage": [],
  "badges": ["frost-badge"],
  "inventory": {
    "pokeballs": 8,
    "greatballs": 2,
    "potions": 5,
    "items": []
  },
  "currency": 1200,
  "sessionHistory": ["session-uuid-1"]
}
```

---

### Pokémon Entity

```json
{
  "entityId": "uuid",
  "speciesId": "regional-gyarados-ice-dragon",
  "nickname": "Glacius",
  "ownerId": "trainer-uuid",
  "level": 28,
  "experience": 14500,
  "stats": {
    "hp": 142, "attack": 95, "defense": 62,
    "spAtk": 44, "spDef": 78, "speed": 60
  },
  "currentHp": 98,
  "maxHp": 142,
  "moves": ["ice-beam", "dragon-breath", "crunch", "aqua-tail"],
  "nature": "adamant",
  "bondLevel": 4,
  "statusCondition": null,
  "affinityBonus": { "source": "trainer-uuid", "type": "ice", "multiplier": 1.06 },
  "isShiny": false,
  "isCustom": true
}
```

---

### Battle State

```json
{
  "battleId": "uuid",
  "sessionId": "uuid",
  "battleType": "gym",
  "format": "1v1",
  "turn": 3,
  "phase": "action-select",
  "participants": [
    {
      "side": "player",
      "trainerId": "trainer-uuid",
      "trainerName": "Rowan",
      "activePokemon": "entity-uuid",
      "party": ["entity-uuid", "entity-uuid-2"],
      "remainingPokemon": 2,
      "actionThisTurn": null
    },
    {
      "side": "opponent",
      "trainerId": "npc-gym-leader-blaze",
      "trainerName": "Blaze",
      "activePokemon": "npc-entity-uuid",
      "party": ["npc-entity-uuid", "npc-entity-uuid-2", "npc-entity-uuid-3"],
      "remainingPokemon": 3,
      "actionThisTurn": null
    }
  ],
  "field": {
    "weather": "snow",
    "terrain": "none",
    "hazards": { "player": [], "opponent": ["stealth-rock"] }
  },
  "turnOrder": [0, 1],
  "log": [
    { "turn": 1, "event": "Rowan's Glacius used Ice Beam!", "damage": 62 },
    { "turn": 1, "event": "Blaze's Arcanine lost 62 HP.", "damage": null }
  ],
  "outcome": null
}
```

---

### Session State

```json
{
  "sessionId": "uuid",
  "campaignId": "aurora-region",
  "sessionNumber": 2,
  "hostTrainerId": "trainer-uuid-1",
  "players": {
    "trainer-uuid-1": { "name": "Rowan", "isActive": true },
    "trainer-uuid-2": { "name": "Lyra", "isActive": false }
  },
  "activeTrainerId": "trainer-uuid-1",
  "worldState": {
    "currentLocation": "frost-route-1",
    "weather": "snow",
    "timeOfDay": "morning"
  },
  "activeBattle": null,
  "eventLog": [],
  "sessionBrief": {}
}
```

---

## Custom Pokémon

Custom Pokémon are defined in `campaign/custom-pokemon.json` as an object keyed by custom ID. The `pokemonResolver.js` module handles lookups, merging custom data on top of PokeAPI base data.

```json
{
  "regional-gyarados-ice-dragon": {
    "id": "regional-gyarados-ice-dragon",
    "basedOn": "130",
    "name": "Glacial Gyarados",
    "regionVariant": "aurora-region",
    "types": ["ice", "dragon"],
    "baseStats": {
      "hp": 95, "attack": 125, "defense": 79,
      "spAtk": 60, "spDef": 100, "speed": 81
    },
    "appearance": "A massive serpent with crystalline white-blue scales and ice-crystal whiskers trailing frozen mist.",
    "lore": "Evolved from Magikarp that survived the Aurora Region's ice age in the frozen lake system beneath Glacier Peak.",
    "moves": {
      "added": ["dragon-breath", "ice-beam", "freeze-dry"],
      "removed": ["waterfall", "surf"]
    },
    "evolutionCondition": "Magikarp reaches level 20 while holding a Frozen Scale in the Aurora Region.",
    "catchRateBase": 45
  }
}
```

**Merge rules** (applied by `pokemonResolver.js`):
- `types`, `baseStats` → custom overrides completely
- `moves.learnset` → base PokeAPI learnset minus `moves.removed` plus `moves.added`
- `appearance`, `lore` → custom only
- `catchRate`, `baseExperience` → custom if present, else PokeAPI base

---

## Agent Pipeline

### Intent Classification

```
Player input
     │
     ▼
┌────────────────────────┐
│ Keyword/Regex Matcher  │  ~0ms, free
│ (intentClassifier.js)  │
└────────┬───────────────┘
         │
    match found?
    ┌────┴────┐
   YES       NO (or low confidence)
    │         │
    │         ▼
    │   ┌─────────────────┐
    │   │ LLM Classifier  │  generateObject, maxSteps:1
    │   │ (IntentSchema)  │
    │   └────────┬────────┘
    │            │
    └────────────┘
         │
         ▼
   intent queue
  [roll, state]  ← multi-intent: both fire, results merged
```

**Intent types**: `narration | roll | state | lore | design`

**Confidence field**:
- Keyword match → `1.0`
- LLM high confidence → `0.8–1.0`
- LLM uncertain → `0.5–0.7` → DM asks player to clarify
- Below `0.5` → default to `narration`, log warning

### Agent Roles

| Agent | Responsibility | Output type |
|-------|---------------|-------------|
| DM | Narration, choices, story progression | Streamed text with delimiters |
| Rules | Rule lookups, move legality, battle procedure clarification | Structured text |
| State | Party status, inventory, trainer stats, session events | JSON state delta |
| Lore | Region history, NPC backstory, Pokémon lore (custom + canonical) | Text |
| Design | Visual descriptions of Pokémon, locations, characters | Text + optional image trigger |

### DM Context Injection

At session start, the DM agent system prompt receives a compiled context object:

**Static (set once per session)**:
- Campaign meta (name, region, DM persona)
- Custom Pokémon summary (names, types, brief lore — not stat blocks)
- Faction overview (team goals, key NPC names)
- Active session brief (story beats, location unlocks, special rules)

**Per-turn (injected via `messages`)**:
- Current battle state (if in combat)
- Active player trainer summary (name, party HP, badges, active Pokémon)
- Current location
- Last 3–5 session events (continuity window)

Token budget: campaign context ≤ 2000 tokens. `contextBuilder.js` truncates and warns if exceeded.

---

## Battle Engine

Lives in `server/battle/`. Pure functions, no AI, fully unit-testable.

### Core Formula

```js
// Hit check (D&D flavor)
const d20 = rollD20();                  // 1–20
const hit = d20 === 1  ? false          // natural 1 always misses
          : d20 === 20 ? true           // natural 20 always hits (critical)
          : (move.accuracy / 100) * d20 >= hitThreshold;

// Damage (standard Pokémon formula + modifiers)
let damage = Math.floor(
  ((2 * level / 5 + 2) * move.power * (attacker.atk / defender.def)) / 50
) + 2;
damage *= typeEffectiveness;            // 0, 0.5, 1, 2, 4
damage *= stab ? 1.5 : 1;              // same-type attack bonus
damage *= affinityMultiplier;           // trainer affinity bonus (1.0–1.2)
damage *= isCritical ? 1.5 : 1;        // natural 20 on hit roll
damage *= natureModifier;               // +/-10% from nature
damage *= (85 + Math.random() * 15) / 100; // random factor
damage = Math.floor(damage);
```

### Battle Types

| Type | Flee | Catch | NPC AI | Scaling | Reward |
|------|------|-------|--------|---------|--------|
| `wild` | ✓ | ✓ | none | none | XP + catch |
| `trainer` | ✗ | ✗ | basic | none | money + XP |
| `grunt` | ✗ | ✗ | basic | none | money + faction lore |
| `gym` / `boss` | ✗ | ✗ | smart | player-level | badge + TM + affinity XP |
| `pvp` | ✗ | ✗ | none (human) | none | rivalry points |

**NPC AI (basic)**: uses highest-power move not ineffective against defender; switches if HP < 20% and a better matchup exists.

**NPC AI (smart — gym/boss)**: type-effectiveness priority; uses setup moves on turn 1 at full HP; switches strategically.

### Catch Resolution

```js
catchProbability = (3 * maxHp - 2 * currentHp)
                 * ballModifier       // 1× ball, 1.5× great, 2× ultra
                 * statusModifier     // 1.5× if asleep/frozen, 1.2× if paralysed
                 * affinityModifier   // trainer affinity catch bonus
                 / (3 * maxHp);

const catchThreshold = Math.ceil((1 - catchProbability) * 20);
const caught = rollD20() >= catchThreshold;
```

---

## Type Affinity Engine

Lives in `server/battle/affinityEngine.js`. Pure functions.

```
grantAffinityXP(trainer, type, amount)
  → checkRankUp(affinity)
    → applyRankUp(affinity)       if rank threshold crossed
      → emit affinity-rank-up event to DM agent
  → return updated trainer state
```

XP thresholds: 200 → 450 → 800 → 1300 → 2000 → 3000 → 4500 → 6500 → 9500 (rank 1→10).

Bonuses are computed by `getAffinityBonuses(affinity)` and injected into the battle engine at the start of each battle. They are not stored on the Pokémon entity — they are derived from trainer state at runtime.

---

## Storage

### Adapters

| Adapter | Use case | Notes |
|---------|----------|-------|
| `file.js` | Local dev | Writes to `/tmp/sessions/`. Ephemeral on Vercel. |
| `postgres.js` | Production | Requires `DATABASE_URL`. Required for Vercel deploys. |

Selected via `STORAGE_PROVIDER` env var. Default is `postgres`; `file` triggers a startup warning in production.

**Path traversal guard** (file adapter):
```js
const safeId = path.basename(sessionId);
assert(safeId === sessionId, 'Tampered session ID');
const sessionPath = path.join(SESSIONS_DIR, `${safeId}.json`);
```

### Session Lifecycle

1. `POST /sessions` → create session, load + validate campaign config, create trainer entities, assign starters, return `sessionId + dmOpeningNarration`
2. `POST /agent` (per turn) → classify intent → route to agent(s) → update session state → return response
3. Session state is written to storage after every agent turn
4. `GET /sessions/:id` → host can reload and resume after a browser refresh

---

## Voice Pipeline

```
Player speaks
     │
     ▼ Web Speech API (SpeechRecognition)
Transcript text
     │
     ▼ POST /agent (or /agent/stream)
DM response text
     │
     ▼ Strip markdown (**, *, ###)
     │
     ▼ Web Speech Synthesis (MVP) → OpenAI TTS /tts endpoint (v2)
Spoken narration
```

**STT**: `SpeechRecognition.continuous = false`, `interimResults = true`. Chrome/Edge only. Grammar hints loaded from campaign Pokémon names + move names for accuracy.

**TTS (MVP)**: `speechSynthesis.speak()`. Rate `0.9`, pitch `0.85`. Mute button cancels queue.

**TTS (v2)**: `POST /tts → OpenAI tts-1 → audio/mpeg stream`. Voice: `onyx`. Swap controlled by `TTS_PROVIDER=browser|openai` env var.

---

## Image Generation

**Endpoint**: `POST /image`

```
{ prompt: string, style: 'scene' | 'pokemon' | 'portrait' }
→ { url: string, revisedPrompt: string }
```

Style prefixes applied before sending to DALL-E 3:
- `scene`: `"Pokémon anime style, vibrant colors, cinematic, no text: {prompt}"`
- `pokemon`: `"Pokémon anime style, official artwork quality, white background, no text: {prompt}"`
- `portrait`: `"Pokémon anime style, character portrait, detailed, no text: {prompt}"`

Rate limit: `IMAGE_LIMIT_PER_SESSION` env var (default: 5). The DM agent tool description instructs the model to use images sparingly — only for first Pokémon/location encounters, boss intros, and major story reveals.

---

## Security

| Control | Implementation |
|---------|---------------|
| Prompt injection | `system`/`messages` separation in all agents — user input never interpolated into system prompt |
| CORS | Explicit allowlist via `ALLOWED_ORIGINS` env var; `app.use(cors({ origin: allowlist }))` |
| Rate limiting | `express-rate-limit`: 60 req/min on `/agent`, 10 req/min on `/image` |
| Security headers | `helmet()` middleware |
| Path traversal | `path.basename()` guard in file storage adapter |
| Input size | `userInput` max 2000 chars; control characters stripped before reaching any agent |

---

## Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `OPENAI_API_KEY` | Yes | — | All agents + DALL-E 3 |
| `STORAGE_PROVIDER` | No | `postgres` | `file` triggers prod warning |
| `DATABASE_URL` | If postgres | — | Supabase or Vercel Postgres |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | Comma-separated for multiple |
| `TTS_PROVIDER` | No | `browser` | `browser` or `openai` |
| `IMAGE_LIMIT_PER_SESSION` | No | `5` | Cost control for DALL-E 3 |
| `NODE_ENV` | No | `development` | Set to `production` on Vercel |

---

## Vercel Deployment Notes

- **Function timeout**: Hobby plan = 10s max. AI agent calls can take 15–30s.
  - Short-term: implement streaming (`/agent/stream`) — first token arrives in ~1s, rest streams in.
  - Long-term: upgrade to Pro plan (60s timeout) for non-streaming endpoints (image generation, session creation).
- **Session storage**: File adapter uses `/tmp/sessions` — ephemeral between cold starts. Always use `STORAGE_PROVIDER=postgres` in production.
- **PokeAPI**: No API key needed. Rate limit is 100 req/min. Cache responses in LRU cache (species + move data changes rarely).
