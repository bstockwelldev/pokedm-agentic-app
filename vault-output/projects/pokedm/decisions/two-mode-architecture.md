---
type: log
domain: engineering
source: vault
status: active
authoritative-source: vault
tags: [project/pokedm, type/decision, status/active]
created: 2026-04-12
---

# ADR: Two-Mode Architecture (Builder + Runtime)

**Status**: Accepted
**Date**: 2026-04

## Decision

The app has two distinct modes: Campaign Builder (host prep) and Session Runtime (live play). Builder writes JSON config; Runtime reads it. Clean separation — neither mode needs to understand the other's UI or data flow.

## Rationale

Host experience (world-building, Pokémon customization, story briefs) and player experience (voice commands, battles, narration) are different enough in UX, data flow, and timing to warrant clean separation. The JSON config acts as the contract.

## Consequences

- Campaign config is the DM's world model — no general knowledge hardcoded in system prompt
- Any campaign a host creates automatically becomes the DM's reality (custom Pokémon, lore, factions)
- Builder can evolve independently of Runtime (host tool vs. player tool)
- Config validation at session start catches problems before play begins

## Config Structure

5 JSON files per campaign: `meta.json` | `world.json` | `factions.json` | `challenges.json` | `session-brief.json`

## Links
- [[projects/pokedm/_index]]
- [[projects/pokedm/design]]

## Tags
#project/pokedm #type/decision #domain/engineering #domain/game-design
