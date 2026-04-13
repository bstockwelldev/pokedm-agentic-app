---
type: template
domain: pkm
source: vault
status: active
authoritative-source: vault
tags: [project/vault, type/template, status/active]
created: 2026-04-12
---

# Vault Ingestion Config — Stockwise Productions

Configuration and instructions for running future ingestion sessions into this vault.

---

## Vault Location

Mount the `stockwise-productions` Obsidian vault folder in Cowork before starting any ingestion session. The vault root should be the selected workspace folder.

---

## Ingestion Scope by Project

### `projects/pokedm/`

**Sources**: `pokedm-agentic-app` repo (`docs/PLANNING.md`, `docs/DESIGN.md`, `docs/ROADMAP.md`, `AGENTS.md`), Linear board (`stockwise-productions-prototypes`), session transcripts.

**Ingest as**: distilled knowledge nodes — do NOT copy full docs verbatim. Extract decisions, key schemas, open questions, and phase summaries. Full docs live in the repo; vault nodes are the compressed, wikilinked intelligence layer.

**Node targets**:
```
projects/pokedm/_index.md          ← project overview (update on major milestones)
projects/pokedm/planning.md        ← goals, MVP, type affinity model, open questions
projects/pokedm/design.md          ← architecture stub, key schemas summary
projects/pokedm/roadmap.md         ← phase summary, Linear links
projects/pokedm/decisions/         ← one ADR per major design decision
projects/pokedm/sessions/          ← dated session logs (optional, chronological)
```

**Update triggers**:
- After any session that produces new docs or resolves open questions
- After a phase completes (mark roadmap node)
- After major architectural changes

### `projects/tabletop-studio/`

Not yet scoped. Create `_index.md` when project begins.

---

## Node Writing Rules

1. **Frontmatter always required** — use the schema from `[[_taxonomy]]`
2. **Distill, don't copy** — if the source is a large doc in the repo, write a reference stub with a link back; don't replicate full content
3. **Wikilinks at the bottom** of every node under `## Links`
4. **Tags at the bottom** under `## Tags` (inline hashtags, not YAML-only)
5. **Pre-2023 content → skip** — tag `status: archived` if a stub already exists
6. **DCM content → never ingest** (see vault-ingestion skill rules)

---

## Ingestion Checklist (run each session)

```
[ ] Mount vault folder in Cowork
[ ] Read _taxonomy.md to confirm folder structure hasn't drifted
[ ] Check existing nodes for staleness (any open questions resolved?)
[ ] Identify new session outputs (docs created, decisions made, phases completed)
[ ] Write/update nodes — distill only
[ ] Update wikilinks on affected nodes
[ ] Mark any resolved open questions in planning.md
[ ] Update roadmap.md phase status if a phase completed
```

---

## Source URLs

| Source | URL |
|--------|-----|
| Repo | `pokedm-agentic-app` (workspace mount) |
| Linear | https://linear.app/stockwise-productions-prototypes |
| PLANNING.md | `docs/PLANNING.md` in repo |
| DESIGN.md | `docs/DESIGN.md` in repo |
| ROADMAP.md | `docs/ROADMAP.md` in repo |

---

## Links
- [[_taxonomy]]
- [[projects/pokedm/_index]]

## Tags
#project/vault #type/template #domain/pkm #status/active
