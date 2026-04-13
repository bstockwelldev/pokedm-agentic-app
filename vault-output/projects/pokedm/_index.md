---
type: knowledge
domain: game-design
source: vault
status: active
authoritative-source: vault
tags: [project/pokedm, type/concept, status/active]
created: 2026-04-12
---

# PokeDM

An AI Dungeon Master for Pokémon TTRPG campaigns. Two-mode app: Campaign Builder (host prep) + Session Runtime (live AI DM).

**Repo**: `pokedm-agentic-app` (Express.js + React/Vite, Vercel AI SDK)
**Linear**: [Stockwise-productions-prototypes](https://linear.app/stockwise-productions-prototypes)
**Stack**: Node/Express, React, Vite, Vercel AI SDK, PokeAPI, Web Speech API

---

## What It Does

A group of 2–4 co-located players runs a Pokémon TTRPG session with:
- AI DM that narrates, responds to voice input, and speaks aloud
- Mechanically correct battles (Pokémon damage formula × D&D d20 hit check)
- Type affinity progression per trainer (rank 1–10, milestone bonuses)
- Campaign config defines region, custom Pokémon forms, factions, session briefs
- PokeAPI for live species/move/type data; `custom-pokemon.json` override layer

---

## MVP Criteria

1. Host creates a campaign config with ≥1 custom Pokémon form + session brief
2. 2–4 players join same-device session
3. Players speak → AI DM responds aloud (Web Speech STT/TTS)
4. Wild encounter runs mechanically correct battle
5. Type affinities tracked, provide in-battle bonuses
6. Session state persists across turns

MVP = STO-11 through STO-32 (Phase 0–3).

---

## Build Phases

| Phase | Scope | Issues |
|-------|-------|--------|
| 0 | Security hardening | STO-11–14 |
| 1 | Schema & data layer | STO-15–20 |
| 2 | Core engines | STO-21–28 |
| 3 | Session runtime + voice | STO-29–32 |
| 4 | Campaign builder UI | STO-33–36 |
| 5 | Infra, streaming, docs | STO-37–40 |

---

## Key Architecture Decisions

- AI narrates; pure JS engines compute all game math (no AI in damage/catch/XP)
- Hybrid intent classifier: keyword-first (~0ms) + LLM fallback for ambiguous input
- Campaign config = DM's world model (not hardcoded system prompt knowledge)
- Same-device multiplayer for MVP (no Socket.io)
- Storage adapters: File (dev) / Postgres (prod) via `STORAGE_PROVIDER` env var

---

## Links
- [[projects/pokedm/planning]]
- [[projects/pokedm/design]]
- [[projects/pokedm/roadmap]]
- [[projects/pokedm/decisions/ai-vs-engine-separation]]
- [[projects/pokedm/decisions/two-mode-architecture]]
- [[projects/pokedm/decisions/hybrid-intent-classifier]]

## Tags
#project/pokedm #domain/game-design #domain/engineering #status/active
