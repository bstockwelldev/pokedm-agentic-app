# Evolution Rules
status: Reference

## Standard Evolution Triggers
Level-up: Pokémon evolves when it reaches a specific level (most common).
Happiness: Pokémon evolves when happiness reaches 220+ and levels up.
Item: Use a specific evolution stone (Fire Stone, Water Stone, etc.) on the Pokémon.
Trade: Pokémon evolves when traded (simplified in PokeDM: hold item + reach level instead).
Location: Pokémon evolves when leveled up in a specific area or during a specific weather.
Time-of-day: Pokémon evolves when leveled up during day (sun up) or night (sun down).
Affinity: Campaign-specific trigger — evolves when trainer affinity rank reaches threshold.

## Evolution in Sessions
Evolution happens between turns, not mid-battle, unless campaign rules say otherwise.
Players are notified of available evolutions after battle or at rest points.
Evolution may be postponed by the player (hold B equivalent — campaign DM narrates hesitation).
Postponed evolution can be triggered at any rest point.

## Custom Evolution Paths
Defined in campaign JSON under each custom Pokémon's `evolutions` array.
Each entry: `{ "trigger": "level|item|happiness|location", "condition": "...", "evolves_into": "species_id" }`
Custom evolution targets may reference canon species OR other custom Pokémon in the same campaign.

## Baby Pokémon
Baby Pokémon are obtained via breeding (Pokémon Day Care) or as campaign-defined starter gifts.
Breeding mechanics are simplified: deposit two compatible Pokémon, collect egg after one in-game session.
Egg hatch step count replaced with in-game travel distance (DM narrates hatching moment).
