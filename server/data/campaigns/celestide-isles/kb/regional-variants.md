# Celestide Isles — Regional Variant & Environment Rules
status: Mandatory for Celestide Isles campaign (overrides core regional-variants.md)

## Gravity Crystals

- Gravity crystals alter local gravity on floating islands. Stable crystals keep towns level; destabilized crystals can lift or drop terrain sections.
- Team Drift seeks to harness crystals for forced stabilization — players may oppose, negotiate, or gather evidence.
- Narrative triggers: crystal hum, floating debris, NPC evacuations. Never instant TPK from environmental collapse; use fail-soft outcomes.

## Wind & Route Effects

- **Breeze Path** and exposed routes have persistent light wind. Use for atmosphere; optional +1 evasion for Flying types in wild encounters (narrative, not mandatory math outside Gym).
- **Tailwind** is thematically common on Celestide routes. Celestide Mareep's **Sky Baah** ability interacts with Tailwind (see `custom-pokemon.json`).

## Gym 1 — Zephyra's Wind Trial

- **Format:** 2 Pokémon per trainer.
- **Environment:** Strong winds (describe each round).
- **Wind initiative rule:** Each round, Flying-type Pokémon gain **+1 initiative** (act earlier in turn order). Apply in battle engine when available; otherwise narrate priority shifts.
- **Fail-soft:** If the party loses, Zephyra pauses the battle, teaches strategy, and offers a retry. No badge penalty for failure.
- **Badge:** Gale Badge (`badge_gale`).

## Celestide Regional Variants

### Celestide Mareep (`cstm_celestide_mareep`)

- Typing: Electric / Flying (canon Mareep is Electric only).
- Ability: **Sky Baah** — evasion boost during Tailwind.
- Evolution: Celestide Ampharos (Electric / Psychic) — document on evolution; stats from Flaaffy/Ampharos canon unless campaign defines Ampharos entry later.
- Habitat: Breeze Path, windy platforms near crystal harmonics.

### Celestide Dreepy (`cstm_dreepy_celestide`)

- Typing: Dragon / Ghost (canon Dreepy typing retained).
- Regional flavor: juvenile wind-current bond, shy behavior, Valion's starter Drift.
- Ability: **Celestial Current** — Speed +1 on entry in route/wilderness battles.
- Evolution: standard Dreepy → Drakloak → Dragapult line.

## Team Drift Encounters

- Members are engineers, not cartoon villains. They retreat, surrender, or accept reasoned arguments.
- Key NPCs: **Kaelix** (field leader), **Mira** (support). See `factions.json`.
- Moral choices from Session 1 carry forward: stop theft, help civilians, gather proof.

## Pokédex Tracking (Expansion §10)

Track in session `continuity.discovered_pokemon`:

| Column | Field |
|--------|-------|
| Species | `species_ref` |
| Form | `form_ref.region` = `celestide_isles` |
| Location | `first_seen_location_id` |
| Notes | freeform |

Regional variant discoveries count even on sighting-only encounters (e.g., Mareep on Breeze Path).
