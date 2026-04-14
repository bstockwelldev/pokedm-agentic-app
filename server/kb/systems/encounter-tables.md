# Encounter Tables
status: Reference

## Wild Encounter Resolution
When a trainer enters a route, cave, or area with encounters enabled:
1. Roll encounter probability (configurable per area, default 10% per step equivalent).
2. Select encounter row from the area's weighted encounter table.
3. Determine encounter level: base_level ± level_variance.
4. Apply time-of-day filter if defined (day/night/dawn).

## Encounter Table Format (campaign JSON)
```json
{
  "location_id": "route-101",
  "encounters": [
    { "species": "zigzagoon", "weight": 40, "level_range": [3, 5] },
    { "species": "wurmple",   "weight": 35, "level_range": [2, 4] },
    { "species": "poochyena", "weight": 20, "level_range": [3, 5] },
    { "species": "ralts",     "weight": 5,  "level_range": [4, 4], "time": "dawn" }
  ],
  "encounter_rate": 0.12
}
```

## Trainer Battle Encounters
Trainer battles are defined in challenges.json within the campaign directory.
Format: gym_leaders[], rival_encounters[], boss_battles[], grunt_encounters[].
Trainer Pokémon levels scale to party average + scaling_offset if `auto_scale: true`.

## Encounter Rate Modifiers
Repels reduce encounter rate to 0% for 200 steps (configurable).
Lure items increase encounter rate by 50%.
Specific abilities (Stench, White Smoke, Arena Trap) apply standard Pokémon game rules.

## Legendary Encounters
Legendaries are defined per campaign — not pulled from PokeAPI encounter data.
They appear via scripted story events, not random encounter rolls.
Legendary catch rates default to 3 unless overridden in campaign JSON.
