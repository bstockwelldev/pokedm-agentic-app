# Type Affinity Rules
status: Mandatory

## Overview
Trainers develop affinity with Pokémon types through battle experience.
Affinity rank ranges from 1 (novice) to 10 (master).
Higher affinity provides passive battle bonuses and unlocks special abilities.

## XP Thresholds
Rank 1: 0 XP (starting rank)
Rank 2: 100 XP
Rank 3: 250 XP
Rank 4: 500 XP
Rank 5: 900 XP
Rank 6: 1400 XP
Rank 7: 2000 XP
Rank 8: 2750 XP
Rank 9: 3600 XP
Rank 10: 4800 XP

## XP Awards
move_used: +10 XP (using a move matching the trainer's affinity type)
super_effective: +20 XP (landing a super effective hit with an affinity-type move)
ko_with_type: +30 XP (KO'ing a Pokémon with an affinity-type move)
caught_type: +25 XP (catching a Pokémon of the affinity type)
resisted_type: +5 XP (surviving a super effective hit with an affinity-type Pokémon)
type_sense_use: +15 XP (successfully using a Type Sense ability)

## Damage Multiplier
Affinity rank provides a passive damage bonus for moves matching the affinity type.
Multiplier scales linearly from 1.00× (rank 1) to 1.20× (rank 10).
Formula: 1 + ((rank − 1) × (0.20 / 9))

## Milestone Unlocks
Rank 2: Type Sense — once per battle, detect opponent's hidden type weakness.
Rank 3: Affinity Bond — +5% HP regen per turn for Pokémon of affinity type.
Rank 5: Type Mastery — 10% chance to negate opponent's type resistance once per battle.
Rank 7: Elemental Surge — once per session, boost party's affinity-type moves by 1.3× for 3 turns.
Rank 10: Type Champion — affinity-type Pokémon gain +10% all stats; DM recognizes trainer as a type specialist.

## Max Affinities Per Trainer
Default maximum: 3 active affinities per trainer (campaign configurable via `affinity_rules.max_affinities`).
Additional affinity slots may be unlocked through campaign story beats.
