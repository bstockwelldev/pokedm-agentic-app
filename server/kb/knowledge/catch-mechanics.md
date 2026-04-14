# Catch Mechanics
status: Mandatory

## Catch Rate Formula
Catch probability = (3 × maxHP − 2 × currentHP) / (3 × maxHP) × catchRate × ballBonus × statusBonus

catchRate: Pokémon species base catch rate (1–255). Higher = easier to catch.
ballBonus: Poké Ball modifier (1× Poké Ball, 1.5× Great Ball, 2× Ultra Ball, etc.)
statusBonus: 1.5× for sleep or freeze; 1.2× for paralysis, burn, or poison.

## Catch Procedure
1. Lower the wild Pokémon's HP (below 50% HP improves catch rate).
2. Apply a status condition for a further bonus.
3. Use a Poké Ball. Roll against catch probability.
4. Three shakes: success. Ball breaks out: failure; wild Pokémon may flee.

## Ball Types
Poké Ball: 1× modifier. Standard.
Great Ball: 1.5× modifier. Reliable for mid-tier Pokémon.
Ultra Ball: 2× modifier. Best general-purpose ball.
Master Ball: 255× modifier (effectively 100% catch rate). Single-use.
Custom campaign balls defined in campaign JSON override standard modifiers.

## Flee Rate
Wild Pokémon may flee based on their speed and temperament.
Legendary Pokémon do not flee by default (campaign configurable).
Trainer-owned Pokémon cannot flee.

## Custom Pokémon
Custom Pokémon are catchable only if `catchable: true` in their campaign definition.
Custom Pokémon catch rate defaults to 45 unless overridden.
