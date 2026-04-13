---
type: knowledge
domain: game-design
source: vault
source-url: https://github.com/stockwise-productions/pokedm-agentic-app/blob/main/docs/PLANNING.md
status: active
authoritative-source: vault
tags: [project/pokedm, type/concept, status/active]
created: 2026-04-12
---

# PokeDM — Planning

→ **[Full doc in repo](https://github.com/stockwise-productions/pokedm-agentic-app/blob/main/docs/PLANNING.md)**

---

## Goals

**Primary**: 2–4 co-located players + host run a complete TTRPG session with a speaking, voice-responsive AI DM that tracks game state correctly.

**Secondary**: Campaign builders with no coding ability create fully custom campaigns via a UI form editor. The platform generalizes beyond Aurora Region.

**Non-goals (MVP)**: online multiplayer, mobile app, marketplace, competitive play, custom type systems.

---

## Player Progression

### Type Affinities (1–2 per trainer, rank 1–10)

XP earned in-battle:

| Action | XP |
|--------|----|
| Win battle with Pokémon of that type | +50 |
| Catch Pokémon of that type | +75 |
| Land super-effective move of that type | +25 |
| Defeat gym/boss specializing in that type | +200 |
| Critical hit with that type | +10 |

Milestone bonuses:

| Rank | Bonus |
|------|-------|
| 2 | +5% catch rate, +2% stat multiplier |
| 3 | Type Sense (DM describes matchups unprompted) |
| 5 | Signature Perk (campaign-defined, e.g. Ice → Frozen Resolve) |
| 7 | Deep Bond (+1 to all d20 rolls for this type's Pokémon) |
| 10 | Type Mastery (Pokémon learns extra move of this type) |

### Pokémon Progression
Standard level/XP. Bond Level (0–5) = roleplay investment. Bond 5 = 5% chance to survive KO with 1 HP.

---

## Battle Formula

```
Damage = floor(((2 × level / 5 + 2) × Power × (Atk / Def)) / 50) + 2
  × type effectiveness
  × STAB (1.5× if move type matches attacker type)
  × nature modifier
  × affinity multiplier
  × random (85–100 / 100)
  × critical (1.5× on natural 20)
```

Hit check: `d20 ≥ hitThreshold` (base 10, modified by accuracy/evasion). Natural 20 = always hits + crit. Natural 1 = always misses.

Battle types: wild (flee/catch), trainer, grunt, gym/boss (scaling + badge), PvP.

---

## Open Questions

- [ ] Trainer-level as separate progression track vs. badge count?
- [ ] Max 2 type affinities per trainer at Aurora Region campaign start?
- [ ] PvP stakes system (items/money/Pokémon wagers)?
- [ ] Simultaneous group exploration input handling?
- [ ] Custom type relationships per campaign?

---

## Links
- [[projects/pokedm/_index]]
- [[projects/pokedm/design]]
- [[projects/pokedm/roadmap]]

## Tags
#project/pokedm #domain/game-design #status/active #type/concept
