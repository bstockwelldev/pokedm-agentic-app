# Status Conditions Reference
status: Reference

## Primary Status (one at a time)

| Status     | Icon | Effect                                                              | Cure                        |
|------------|------|---------------------------------------------------------------------|-----------------------------|
| Burn       | 🔥   | −50% physical Atk; −1/16 max HP per turn                           | Rawst Berry, Burn Heal      |
| Freeze     | 🧊   | Cannot act; 20% thaw per turn; fire moves always thaw              | Aspear Berry, thaw by fire  |
| Paralysis  | ⚡   | −50% Speed; 25% full paralysis per turn                            | Cheri Berry, Paralyze Heal  |
| Poison     | 🟣   | −1/8 max HP per turn                                               | Antidote, Pecha Berry       |
| Bad Poison | 🟣🟣 | Escalating damage: 1/16, 2/16, 3/16 … per turn (capped at 15/16)  | Antidote, Pecha Berry       |
| Sleep      | 💤   | Cannot act for 1–3 turns; Sleep Talk/Snore still work              | Awakening, Blue Flute       |

## Volatile Status (stackable, clears on switch-out)

| Status      | Effect                                                    |
|-------------|-----------------------------------------------------------|
| Confusion   | 33% chance to deal 40-power typeless damage to self       |
| Infatuation | 50% chance to skip turn if attacking target of attraction |
| Flinch      | Cannot act this turn (only if slower than attacker)       |
| Encore      | Forced to use last move for 2–5 turns                     |
| Taunt       | Cannot use non-damaging moves for 3 turns                 |
| Leech Seed  | Drains 1/8 max HP per turn; transfers to user             |

## Field Conditions (weather/terrain)

| Condition     | Duration | Effects                                                  |
|---------------|----------|----------------------------------------------------------|
| Sun           | 5 turns  | Fire ×1.5, Water ×0.5, Solar Beam one-turn charge       |
| Rain          | 5 turns  | Water ×1.5, Fire ×0.5, Thunder always hits              |
| Sandstorm     | 5 turns  | Rock/Ground/Steel immune; others −1/16 HP per turn      |
| Hail          | 5 turns  | Ice-types immune; others −1/16 HP per turn              |
| Electric Terrain | 5 turns | Electric ×1.3; sleep immunity for grounded Pokémon   |
| Grassy Terrain   | 5 turns | Grass ×1.3; +1/16 HP restore per turn for grounded     |
| Misty Terrain    | 5 turns | Immune to status; Dragon moves ×0.5 for grounded       |
| Psychic Terrain  | 5 turns | Psychic ×1.3; priority moves blocked for grounded      |
