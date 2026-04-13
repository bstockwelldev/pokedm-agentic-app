---
type: reference
domain: engineering
source: vault
source-url: https://linear.app/stockwise-productions-prototypes
status: active
authoritative-source: vault
tags: [project/pokedm, type/reference, status/active]
created: 2026-04-12
---

# PokeDM — Roadmap

→ **[Linear board](https://linear.app/stockwise-productions-prototypes)**
→ **[Full doc in repo](https://github.com/stockwise-productions/pokedm-agentic-app/blob/main/docs/ROADMAP.md)**

**MVP = Phase 0 + 1 + 2 + 3 (STO-11–32)**

---

## Phase Summary

| Phase | Title | Issues | Status |
|-------|-------|--------|--------|
| 0 | Security hardening | STO-11–14 | 🔴 Prerequisite |
| 1 | Schema & data layer | STO-15–20 | 🟠 High |
| 2 | Core engines | STO-21–28 | 🟠 High |
| 3 | Session runtime + voice | STO-29–32 | 🟠 High |
| 4 | Campaign builder UI | STO-33–36 | 🟡 Normal |
| 5 | Infra, streaming, docs | STO-37–40 | Mixed |

---

## Phase 0 — Security (Ship Nothing Else First)

- STO-11: helmet + express-rate-limit + CORS restriction
- STO-12: `path.basename()` guard in file storage adapter
- STO-13: userInput max 2000 chars + strip control chars
- STO-14: Postgres as default storage; document Vercel session ephemerality

## Phase 1 — Schema & Data Layer

- STO-15: Campaign schema (meta, world, factions, challenges, session-brief)
- STO-16: Trainer/Player schema with type affinity model
- STO-17: Pokémon entity schema (individual, party, wild)
- STO-18: Battle State schema (all battle types)
- STO-19: Aurora Region seed campaign config
- STO-20: Custom Pokémon overrides (Glacial Gyarados, Aurora Milotic, Frost Arcanine, Glaceon-Prime)

## Phase 2 — Core Engines

- STO-21: PokeAPI live tool (stats, moves, type chart)
- STO-22: Custom Pokémon override layer (custom-pokemon.json merge)
- STO-23: Battle engine core (damage formula, hit check, D&D dice) ← pure JS, fully testable
- STO-24: Battle engine — all battle types (wild, trainer, grunt, gym, pvp)
- STO-25: Type affinity XP tracking, rank progression, milestone unlocks
- STO-26: Inject campaign config + session brief into DM agent context ← highest DM quality impact
- STO-27: Hybrid intent classifier (keyword-first + LLM fallback) ← 10× cheaper
- STO-28: Extract `resolveModel()` and `classifyAgentError()` from server.js

## Phase 3 — Session Runtime + Voice

- STO-29: Local multiplayer — shared session state, same-location group
- STO-30: Voice STT — Web Speech API mic input
- STO-31: Voice TTS — DM narration spoken aloud (browser → OpenAI upgrade path)
- STO-32: Campaign → Session handoff flow

---

## Post-MVP Backlog

- Online multiplayer (Socket.io rooms)
- OpenAI TTS upgrade (`tts-1 / onyx`, one env var)
- Campaign marketplace (`.pokedm` bundles)
- Session recap + history
- Trainer profile persistence across campaigns
- Custom type relationships
- RAG-based KB retrieval

---

## Links
- [[projects/pokedm/_index]]
- [[projects/pokedm/planning]]
- [[projects/pokedm/design]]

## Tags
#project/pokedm #domain/engineering #status/active #type/reference
