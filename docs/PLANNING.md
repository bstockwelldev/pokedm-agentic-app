# PokeDM — Planning Document

> **Audience**: Campaign hosts, contributors, and anyone making product decisions.
> **Last updated**: April 2026

---

## What This Is

PokeDM is a two-mode application:

1. **Campaign Builder** — A host tool for creating and preparing TTRPG campaigns. Hosts define custom regions, Pokémon forms, factions, gym challenges, and per-session story briefs.

2. **AI DM Runtime** — A live session runner powered by a multi-agent AI pipeline. The AI Dungeon Master narrates the story, executes battles with correct Pokémon mechanics mapped to D&D dice, tracks player progression, and speaks aloud using voice synthesis.

The first campaign is a Pokémon TTRPG set in a custom region (Aurora Region), where a group of trainers start their journey together — catching, training, and battling Pokémon using a hybrid of the official Pokémon battle formula and D&D dice mechanics.

---

## Goals

### Primary
- A group of 2–4 players in the same room can sit down with a host, configure a campaign, and run a complete TTRPG session with an AI DM that speaks, responds to voice, and tracks all game state correctly.

### Secondary
- Campaign builders with no coding ability can create fully custom campaigns — new regions, custom Pokémon forms, regional evolutions, factions, and boss challenges — using a UI form editor.
- The app is generalisable: the Aurora Region is the first campaign, not the only one. The platform should support any Pokémon-themed campaign a host can imagine.

### Non-goals (MVP)
- Online multiplayer (all players are co-located for MVP)
- Mobile app
- Campaign marketplace / sharing
- Competitive ranked play
- Custom type systems (types are the standard 18 Pokémon types)

---

## MVP Definition

A functional prototype is achieved when:

1. A host can create a campaign config with at least one custom Pokémon form and a session brief
2. 2–4 players can join a session on the same device (host machine)
3. Players can speak to the AI DM using voice and hear its response spoken aloud
4. A wild Pokémon encounter triggers a mechanically correct battle (correct damage formula, type effectiveness, D&D hit check)
5. Player type affinities are tracked and provide real in-battle bonuses
6. Session state survives across turns (no silent data loss)

Everything else — image generation, streaming narration, full campaign builder UI, online multiplayer — is post-MVP enhancement.

---

## Key Design Decisions

### 1. Two-mode architecture (Builder + Runtime)
The host experience (campaign prep) and the player experience (live session) are distinct enough to warrant separate UI modes and separate data flows. The builder writes JSON config files; the runtime reads them. This clean separation means the DM runtime never needs to understand the builder's UI and vice versa.

### 2. AI narrates; engines compute
The AI DM handles storytelling and dialogue. All numerical game logic (damage calculations, catch rates, XP, affinity progression) is handled by pure JS state machines with no AI involvement. This is critical — AI will hallucinate damage values and forget HP across turns if trusted with game math.

**AI responsibilities**: narration, NPC dialogue, story progression, describing battle outcomes, reacting to player choices.
**Engine responsibilities**: hit checks, damage formula, type effectiveness, affinity XP grants, rank-up events, catch resolution.

### 3. Hybrid intent classifier (keyword-first, LLM fallback)
Player input is classified by a keyword/regex matcher first (free, ~0ms). The LLM classifier fires only for ambiguous inputs. This reduces cost and latency significantly for the common case (attack commands, status checks, lore questions) where intent is unambiguous.

Multi-intent inputs ("I use Ember and then check my HP") are detected and executed as an ordered queue.

### 4. PokeAPI as the data layer, custom-pokemon.json as the override
Standard Pokémon species and move data comes from PokeAPI (no API key, generous rate limits). Custom Pokémon (regional forms, custom evolutions) are defined in `campaign/custom-pokemon.json` and merged on top of PokeAPI data at lookup time. The battle engine is agnostic — it never knows whether it's working with a standard or custom species.

### 5. Same-location multiplayer only (MVP)
No Socket.io, no networking for MVP. All players share one device or one local session. One shared session state object with a `players` map and an `activeTrainerId` field. The host rotates the active player. This eliminates all real-time sync complexity while still enabling group play.

### 6. Campaign config is the DM's operating context
The DM agent does not have general knowledge baked into its system prompt. It reads the campaign config and session brief at session start and uses those as its world model. This means any campaign a host creates automatically becomes the DM's reality — custom Pokémon, factions, lore, and story beats included.

### 7. Voice is browser-native for MVP
Web Speech API (STT) and Web Speech Synthesis (TTS) require zero backend infrastructure. Chrome/Edge only, but that's acceptable for a co-located group using the host's computer. OpenAI TTS (`tts-1` / `onyx` voice) is the planned v2 upgrade — abstracted behind a `speakText()` hook so the swap is a one-line config change.

---

## Player Progression Model

### Type Affinities
Each trainer chooses 1–2 type affinities at campaign start. Affinity rank (1–10) grows by earning XP through in-game actions:

| Action | XP |
|--------|----|
| Win battle using Pokémon of that type | +50 |
| Catch Pokémon of that type | +75 |
| Land super-effective move of that type | +25 |
| Defeat gym/boss specialising in that type | +200 |
| Critical hit using that type | +10 |

Rank milestones unlock meaningful bonuses:

| Rank | Bonus |
|------|-------|
| 2 | +5% catch rate, +2% stat multiplier |
| 3 | Type Sense (DM describes matchups unprompted) |
| 5 | Signature Perk (campaign-defined, e.g. Ice → Frozen Resolve) |
| 7 | Deep Bond (+1 to all d20 rolls for Pokémon of this type) |
| 10 | Type Mastery (Pokémon learns an additional move of this type) |

### Pokémon Progression
Standard Pokémon level/XP system. Bond Level (0–5) is a PokeDM-specific layer that maps to roleplay investment and unlocks a D&D-style "death save" at level 5 (5% chance to survive a KO with 1 HP).

---

## Battle System Summary

Pokémon stat formula with D&D dice for hit resolution:

```
Damage = floor(((2 × level / 5 + 2) × Power × (Atk / Def)) / 50) + 2
  × type effectiveness
  × STAB (1.5× if move type matches attacker type)
  × nature modifier
  × affinity multiplier (trainer bonus)
  × random factor (85–100 / 100)
  × critical (1.5× if natural 20 on hit roll)
```

Hit check: `d20 roll ≥ hitThreshold`, where threshold is 10 base, modified by accuracy/evasion stages. Natural 20 = always hits + critical. Natural 1 = always misses.

Battle types: wild (flee/catch allowed), trainer, grunt, gym/boss (scaled, badge reward), PvP (player vs player, same session).

---

## Open Questions

- [ ] Should trainer-level be a separate progression track from Pokémon level, or is badge count sufficient as a trainer advancement signal?
- [ ] How many type affinities should the Aurora Region allow per trainer at campaign start? (Currently: 2)
- [ ] Should PvP battles have a stakes system (wagering items, money, or Pokémon)?
- [ ] How should the DM handle simultaneous input in group exploration (e.g. two players declare actions at the same time)?
- [ ] Should custom type relationships be supported (a campaign-defined type that is effective against Dragon)?
