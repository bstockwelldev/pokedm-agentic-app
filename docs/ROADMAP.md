# PokeDM — Roadmap

> **Audience**: Host, contributors, and anyone deciding what to build next.
> **Issue tracker**: [Linear — Stockwise-productions-prototypes](https://linear.app/stockwise-productions-prototypes)
> **Last updated**: April 2026

---

## MVP Definition

A functional prototype is achieved when a group can sit together, speak to the AI DM, and run a mechanically correct Pokémon TTRPG session — including battles, catching, and type affinity progression. See `docs/PLANNING.md` for the full MVP criteria.

**MVP = Phase 0 + Phase 1 + Phase 2 + Phase 3** (STO-11 through STO-32).

Everything in Phase 4 and beyond is enhancement.

---

## Phase 0 — Foundation & Security

> Prerequisite. Ship nothing else until these are complete.

| Issue | Title | Priority |
|-------|-------|----------|
| [STO-11](https://linear.app/stockwise-productions-prototypes/issue/STO-11) | Install helmet + express-rate-limit; restrict CORS | 🔴 Urgent |
| [STO-12](https://linear.app/stockwise-productions-prototypes/issue/STO-12) | Add `path.basename()` guard in file storage adapter | 🔴 Urgent |
| [STO-13](https://linear.app/stockwise-productions-prototypes/issue/STO-13) | Reduce userInput max to 2000 chars + strip control chars | 🟠 High |
| [STO-14](https://linear.app/stockwise-productions-prototypes/issue/STO-14) | Configure Postgres as default storage; document Vercel session ephemerality | 🔴 Urgent |

**What this unlocks**: a hardened API that is safe to expose to the internet.

---

## Phase 1 — Schema & Data Layer

> Defines the contracts everything else builds on. Complete before writing any engine or UI code.

| Issue | Title | Priority |
|-------|-------|----------|
| [STO-15](https://linear.app/stockwise-productions-prototypes/issue/STO-15) | Define Campaign schema (meta, world, factions, challenges, session-brief) | 🟠 High |
| [STO-16](https://linear.app/stockwise-productions-prototypes/issue/STO-16) | Define Trainer/Player schema with type affinity model | 🟠 High |
| [STO-17](https://linear.app/stockwise-productions-prototypes/issue/STO-17) | Define Pokémon entity schema (individual, party + wild) | 🟠 High |
| [STO-18](https://linear.app/stockwise-productions-prototypes/issue/STO-18) | Define Battle State schema (all battle types) | 🟠 High |
| [STO-19](https://linear.app/stockwise-productions-prototypes/issue/STO-19) | Create Aurora Region sample campaign config (seed data) | 🟠 High |
| [STO-20](https://linear.app/stockwise-productions-prototypes/issue/STO-20) | Create custom Pokémon override entries (regional forms + evolutions) | 🟠 High |

**What this unlocks**: validated data contracts, a reference campaign for dev testing, and custom Pokémon to demonstrate the override layer.

**Custom Pokémon in seed data**: Glacial Gyarados (Ice/Dragon), Aurora Milotic (Water/Fairy), Frost Arcanine (Ice/Fire), Glaceon-Prime (Ice/Psychic).

---

## Phase 2 — Core Engines

> The mechanical heart. AI narrates; these engines compute.

| Issue | Title | Priority |
|-------|-------|----------|
| [STO-21](https://linear.app/stockwise-productions-prototypes/issue/STO-21) | PokeAPI live tool integration (stats, moves, type chart) | 🟠 High |
| [STO-22](https://linear.app/stockwise-productions-prototypes/issue/STO-22) | Custom Pokémon override layer (merge custom-pokemon.json with PokeAPI) | 🟠 High |
| [STO-23](https://linear.app/stockwise-productions-prototypes/issue/STO-23) | Battle engine core (damage formula, hit check, D&D dice) | 🟠 High |
| [STO-24](https://linear.app/stockwise-productions-prototypes/issue/STO-24) | Battle engine — all battle types (wild, trainer, grunt, gym, pvp) | 🟠 High |
| [STO-25](https://linear.app/stockwise-productions-prototypes/issue/STO-25) | Type affinity XP tracking, rank progression, and milestone unlocks | 🟠 High |
| [STO-26](https://linear.app/stockwise-productions-prototypes/issue/STO-26) | Inject campaign config + session brief into DM agent context | 🟠 High |
| [STO-27](https://linear.app/stockwise-productions-prototypes/issue/STO-27) | Hybrid intent classifier (keyword-first with LLM fallback) | 🟡 Normal |
| [STO-28](https://linear.app/stockwise-productions-prototypes/issue/STO-28) | Extract resolveModel() and classifyAgentError() from server.js | 🟡 Normal |

**What this unlocks**: correct battle mechanics, live Pokémon data, campaign-aware DM, type affinity bonuses in combat, and cheaper/faster intent classification.

**Key design notes**:
- STO-23 + STO-24 are pure JS — fully testable without any AI calls.
- STO-26 (DM context injection) is the single most impactful change to DM quality.
- STO-27 replaces the current always-LLM router with a hybrid that is 10× cheaper for common inputs.

---

## Phase 3 — Session Runtime & Voice

> Makes the app playable. After this phase, a group can sit down and run a session.

| Issue | Title | Priority |
|-------|-------|----------|
| [STO-29](https://linear.app/stockwise-productions-prototypes/issue/STO-29) | Local multiplayer — shared session state for same-location group | 🟠 High |
| [STO-30](https://linear.app/stockwise-productions-prototypes/issue/STO-30) | Voice STT — Web Speech API mic input for player actions | 🟠 High |
| [STO-31](https://linear.app/stockwise-productions-prototypes/issue/STO-31) | Voice TTS — DM narration spoken aloud (browser → OpenAI upgrade path) | 🟠 High |
| [STO-32](https://linear.app/stockwise-productions-prototypes/issue/STO-32) | Campaign → Session handoff flow (host starts session with config loaded) | 🟠 High |

**What this unlocks**: voice in/out, group play on one device, and the complete host-to-player flow from campaign selection to live session.

**Dependencies**:
- STO-29 requires STO-16 (Trainer schema)
- STO-32 requires STO-15 + STO-16 + STO-26

---

## Phase 4 — Campaign Builder UI & Polish

> Makes it usable for non-developer campaign hosts. Streaming dramatically improves perceived performance.

| Issue | Title | Priority |
|-------|-------|----------|
| [STO-33](https://linear.app/stockwise-productions-prototypes/issue/STO-33) | Campaign builder — create/edit campaign + session brief composer | 🟡 Normal |
| [STO-34](https://linear.app/stockwise-productions-prototypes/issue/STO-34) | Custom Pokémon form builder (override layer editor) | 🟡 Normal |
| [STO-35](https://linear.app/stockwise-productions-prototypes/issue/STO-35) | Play screen — battle UI, party sidebar, active trainer indicator | 🟡 Normal |
| [STO-36](https://linear.app/stockwise-productions-prototypes/issue/STO-36) | Image generation — DALL-E 3 for encounter scenes + custom Pokémon | 🟡 Normal |

**What this unlocks**: hosts without coding skills can build campaigns. Image generation makes encounters cinematic.

---

## Phase 5 — Infrastructure, Streaming & Docs

> Hardening, cost optimisation, and long-term maintainability.

| Issue | Title | Priority |
|-------|-------|----------|
| [STO-37](https://linear.app/stockwise-productions-prototypes/issue/STO-37) | KB migration — move hardcoded rules to markdown files | 🟡 Normal |
| [STO-38](https://linear.app/stockwise-productions-prototypes/issue/STO-38) | Configure Vercel environment variables + function timeout strategy | 🟠 High |
| [STO-39](https://linear.app/stockwise-productions-prototypes/issue/STO-39) | Streaming DM narration via streamText + StreamingTextResponse | 🟡 Normal |
| [STO-40](https://linear.app/stockwise-productions-prototypes/issue/STO-40) | Archive stale root docs; fix README.md and LOCAL_SETUP.md | 🔵 Low |

**What this unlocks**:
- STO-37: campaign hosts can edit rules without code deploys.
- STO-38: production-ready Vercel config; upgrade path from 10s to 60s function timeout.
- STO-39: DM responses begin rendering in ~1s instead of waiting 15–25s — the single biggest UX improvement for perceived performance.
- STO-40: clean repo for new contributors.

---

## Sequence Diagram — Build Order

```
Phase 0 (security)
  └─→ Phase 1 (schemas)
        ├─→ Phase 2 (engines)     ← can start STO-23 (battle math) in parallel with STO-21/22
        │     └─→ Phase 3 (runtime + voice)
        │               └─→ Phase 4 (UI + images)
        └─→ Phase 5 (infra)       ← STO-38 (Vercel config) should happen before any prod deploy
```

STO-37 (KB migration) and STO-40 (doc cleanup) are independent of all other work and can be picked up at any time as filler tasks.

---

## What's Not On This Roadmap (Post-MVP)

These are known future directions, not scheduled:

- **Online multiplayer** — Socket.io room-based sessions so players can join from separate devices. Deferred until the co-located MVP is validated.
- **OpenAI TTS upgrade** — swap browser synthesis for `tts-1 / onyx`. One env var change once STO-31 is complete.
- **Campaign marketplace** — hosts share campaigns as `.pokedm` bundles. Requires campaign export/import + a hosting service.
- **Session recap & history** — post-session summary of events, battles won/lost, Pokémon caught, affinity XP earned.
- **Trainer profile persistence across campaigns** — a trainer from one campaign carries over to another.
- **Custom type relationships** — campaign-defined types (e.g. a "Shadow" type with custom effectiveness chart).
- **RAG-based KB retrieval** — when the KB grows beyond token budget, use embedding-based retrieval instead of loading all rules into context.

---

## Previously Created Issues (STO-1 to STO-10)

STO-1 through STO-4 are Linear onboarding placeholder issues — cancel these.

STO-5 through STO-10 were created in an earlier session covering security hardening, infrastructure, and UI work items. Review these against the Phase 0–2 issues above for overlap and cancel duplicates.
