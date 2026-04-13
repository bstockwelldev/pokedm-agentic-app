---
type: knowledge
domain: pkm
source: vault
status: active
authoritative-source: vault
tags: [taxonomy, meta, vault-structure]
created: 2026-04-12
---

# Stockwise Productions — Vault Taxonomy

Canonical folder structure and tag schema for the `stockwise-productions` Obsidian vault.

---

## Folder Structure

```
stockwise-productions/
  _taxonomy.md                ← this file
  projects/
    pokedm/                   ← PokeDM TTRPG app
    tabletop-studio/          ← future tabletop platform
    vault/                    ← vault infrastructure work itself
  concepts/                   ← evergreen ideas, frameworks, patterns
  decisions/                  ← cross-project ADRs and design choices
  reference/                  ← external docs, specs, large stubs
  systems/                    ← ingestion configs, tooling, meta
  log/                        ← timestamped events, session notes
```

Each project folder follows a consistent internal structure:

```
projects/<project>/
  _index.md                   ← project overview node (always present)
  planning.md                 ← goals, MVP, open questions
  design.md                   ← architecture, schemas, key decisions
  roadmap.md                  ← phases, issues, build order
  decisions/                  ← project-scoped ADRs
  sessions/                   ← dated session logs (optional)
```

---

## Tag Schema

### Project tags
```
#project/pokedm
#project/tabletop-studio
#project/vault
```

### Type tags
```
#type/decision          ← architectural or product decision
#type/concept           ← evergreen reusable idea
#type/reference         ← external doc stub
#type/log               ← timestamped session or event record
#type/template          ← reusable structure
```

### Status tags
```
#status/active          ← current, in-use
#status/draft           ← in-progress, not settled
#status/archived        ← superseded or pre-2023
#status/lineage         ← older version, preserved for history
```

### Domain tags
```
#domain/engineering
#domain/game-design
#domain/pkm             ← personal knowledge management
#domain/systems
```

---

## Node Naming Conventions

- Folder names: `kebab-case`
- File names: `kebab-case.md`
- Node titles (H1): Title Case
- Wikilinks: always use full path from vault root — `[[projects/pokedm/_index]]`

---

## Links
- [[projects/pokedm/_index]]
- [[systems/_ingestion]]

## Tags
#meta #vault-structure #taxonomy
