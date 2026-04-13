---
type: log
domain: engineering
source: vault
status: active
authoritative-source: vault
tags: [project/pokedm, type/decision, status/active]
created: 2026-04-12
---

# ADR: AI Narrates; Engines Compute

**Status**: Accepted
**Date**: 2026-04

## Decision

All numerical game logic (damage, catch rates, XP, affinity progression, rank-ups) is handled by pure JS state machines with zero AI involvement. The AI DM handles only narration, NPC dialogue, story progression, and describing outcomes.

## Rationale

AI will hallucinate damage values and forget HP across turns if trusted with game math. Pure JS engines are deterministic, fully testable without any API calls, and produce auditable results that can be logged to session state.

## Consequences

- Battle engine (STO-23/24) has no AI dependency — unit testable, fast, cheap
- DM prompt never contains game math instructions — cleaner, shorter system prompt
- Clear audit trail: engine computes result → DM receives result → DM narrates it
- Two-person mental model: "what happened" (engine) vs. "how it's described" (AI)

## Links
- [[projects/pokedm/_index]]
- [[projects/pokedm/design]]

## Tags
#project/pokedm #type/decision #domain/engineering
