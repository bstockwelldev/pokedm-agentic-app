---
type: reference
domain: engineering
source: vault
source-url: https://github.com/stockwise-productions/pokedm-agentic-app/blob/main/docs/DESIGN.md
status: active
authoritative-source: vault
tags: [project/pokedm, type/reference, status/active]
created: 2026-04-12
---

# PokeDM — Design

→ **[Full doc in repo](https://github.com/stockwise-productions/pokedm-agentic-app/blob/main/docs/DESIGN.md)**

High-signal architecture summary. Read the full doc for schemas, env vars, and security table.

---

## System Architecture

```
Client (React/Vite)
  └─→ Express API (server.js)
        ├─→ Intent Classifier (router agent)
        │     ├─ keyword/regex (~0ms, free)
        │     └─ LLM fallback (ambiguous only)
        ├─→ Agent Pipeline
        │     ├─ DM Agent (narration, NPC dialogue)
        │     ├─ Rules Agent (game rules lookup)
        │     ├─ State Agent (session state mutation)
        │     ├─ Lore Agent (campaign lore)
        │     └─ Design Agent (image generation)
        ├─→ Game Engines (pure JS, no AI)
        │     ├─ Battle Engine (damage, hit check, types)
        │     ├─ Catch Engine (catch resolution)
        │     └─ Affinity Engine (XP, rank-ups)
        ├─→ Storage Adapter
        │     ├─ File (dev / Vercel ephemeral)
        │     └─ Postgres (production)
        └─→ External APIs
              ├─ PokeAPI (live stats, moves, type chart)
              ├─ OpenAI (LLM, TTS v2, DALL-E 3)
              └─ Web Speech API (STT + TTS MVP, browser)
```

---

## Key Schemas (summary)

**Campaign config** (5 JSON files per campaign):
`meta.json` | `world.json` | `factions.json` | `challenges.json` | `session-brief.json`

**Trainer/Player**: `id`, `name`, `typeAffinities[]` (type + rank + xp), `party[]` (Pokémon refs), `badges[]`

**Pokémon entity**: `speciesId`, `nickname`, `level`, `hp/maxHp`, `bondLevel`, `moves[]`, `statusEffects[]`

**Battle State**: `battleType` (wild|trainer|grunt|gym|pvp), `turn`, `participants[]`, `log[]`, `catchAttempts`

**Session State**: `campaignId`, `players{}` map, `activeTrainerId`, `worldState`, `activeBattle`

---

## Agent Pipeline

Intent classifier routes to one or more agents. Multi-intent inputs build an ordered execution queue (state checks → rolls → narration). DM context injection (STO-26) is the highest-impact quality improvement — loads campaign config + session brief at session start.

DM context budget: ~2000 tokens static (system prompt) + per-turn dynamic state (active Pokémon, HP, last 3 turns).

---

## Voice Pipeline (MVP)

- STT: `window.SpeechRecognition` (Chrome/Edge), browser-native, zero backend
- TTS: `window.speechSynthesis` MVP → `OpenAI tts-1/onyx` via `TTS_PROVIDER=openai` env var

---

## Security

- Prompt injection: `system`/`messages` separation — user input never interpolated into system prompt
- Path traversal: `path.basename()` guard on all file storage writes
- Rate limiting: `express-rate-limit` on all `/api/*` routes
- CORS: origin whitelist via `helmet` + explicit `cors()` config
- Input: userInput max 2000 chars, control chars stripped

---

## Links
- [[projects/pokedm/_index]]
- [[projects/pokedm/planning]]
- [[projects/pokedm/decisions/ai-vs-engine-separation]]
- [[projects/pokedm/decisions/hybrid-intent-classifier]]

## Tags
#project/pokedm #domain/engineering #status/active #type/reference
