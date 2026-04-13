---
type: log
domain: engineering
source: vault
status: active
authoritative-source: vault
tags: [project/pokedm, type/decision, status/active]
created: 2026-04-12
---

# ADR: Hybrid Intent Classifier (Keyword-First + LLM Fallback)

**Status**: Accepted (STO-27)
**Date**: 2026-04

## Decision

Player input is classified by a keyword/regex matcher first (~0ms, $0). The LLM classifier fires only for ambiguous inputs where keyword matching fails to reach a confidence threshold. Multi-intent inputs ("I use Ember and then check my HP") are detected and dispatched as an ordered execution queue.

## Rationale

The common case (attack commands, status checks, lore questions) has unambiguous intent. Routing all input through the LLM classifier is ~10× more expensive and ~100ms slower than it needs to be for these cases.

## Execution Queue Ordering

For multi-intent: state checks → dice rolls → narration. This ensures HP check happens before damage resolves, and narration reflects final state.

## Consequences

- 10× cheaper router for common inputs
- Latency: common path ~0ms vs. LLM path ~300–800ms
- LLM classifier still handles ambiguous / nuanced / roleplay inputs correctly
- Confidence threshold: use the LLM's own confidence score (from structured output)
- Keyword list needs maintenance as new commands are added

## Links
- [[projects/pokedm/_index]]
- [[projects/pokedm/design]]

## Tags
#project/pokedm #type/decision #domain/engineering
