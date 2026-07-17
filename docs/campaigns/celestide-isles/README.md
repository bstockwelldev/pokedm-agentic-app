# Celestide Isles Campaign — Doc → Runtime Map

Source-of-truth design docs live in this folder. Runtime data for PokeDM loads from `server/data/campaigns/celestide-isles/` via `loadCampaign("celestide-isles")`.

| Doc section | Source file | Runtime file(s) | Key IDs |
|-------------|-------------|-----------------|---------|
| 00 README | Core §00 | — | — |
| 01 Campaign Overview | Core §01 | `meta.json` | `celestide-isles-v1`, tone `adventure` |
| 02 Worldbuilding (Team Drift) | Core §02 | `factions.json`, `world.json` (world_facts) | `faction_team_drift` |
| 03 Skysong Harbor & Breeze Path | Core §03 | `world.json` | `skysong_harbor`, `professor_liora_lab`, `breeze_path` |
| 04 Celestide Mareep variant | Core §04 | `custom-pokemon.json`, `kb/regional-variants.md` | `cstm_celestide_mareep` |
| 05 Gym 1 Zephyra | Core §05 | `challenges.json`, `world.json` | `gym_zephyra_wind`, `zephyra_gym`, `badge_gale` |
| 06 Player Characters | Core §06 | Session JSON (Phase 4) | `valion`, `pashion`, `el_haddah` |
| 07 Session 1 Opening | Expansion §07 | `session-brief.json` (Episode 1 backstory), `world_facts` | Wind Festival crystal theft |
| 08 Team Drift NPCs | Expansion §08 | `factions.json`, `world.json` (recurring_npcs) | `npc_kaelix`, `npc_mira` |
| 09 Gym 1 Battle Rules | Expansion §09 | `challenges.json` (notes), `kb/regional-variants.md` | Wind initiative rule |
| 10 Pokédex Tracking | Expansion §10 | Session `continuity.discovered_pokemon` | — |
| 11 Continuity & Save | Expansion §11 | Session files | `route_2_southern_approach` resume point |

## Resume point (active play)

Episode 2 **Skyfall Expanse** — party departs Skysong Harbor on `route_2_southern_approach`, heading toward `breeze_path`. Active session: `server/sessions/celestide-isles-family-session.json`. Test fixture: `server/sessions/test_fixture_1776125811199.json`.

## Load path

```
loadCampaign("celestide-isles")
  → meta.json
  → world.json
  → factions.json
  → challenges.json
  → session-brief.json
  → custom-pokemon.json (override layer, STO-22)
  → kb/*.md (campaign KB overrides)
```
