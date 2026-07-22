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
| 07 Session 1 Opening | Expansion §07 | `session-briefs/session-01-*.json` (planned), `world_facts` | Wind Festival crystal theft |
| 08 Team Drift NPCs | Expansion §08 | `factions.json`, `world.json` (recurring_npcs) | `npc_kaelix`, `npc_mira` |
| 09 Gym 1 Battle Rules | Expansion §09 | `challenges.json` (notes), `session-briefs/session-03-zephyras-trial.json`, `kb/regional-variants.md` | Wind initiative rule, fail-soft retry |
| 10 Pokédex Tracking | Expansion §10 | Session `continuity.discovered_pokemon` | — |
| 11 Continuity & Save | Expansion §11 | Session files | `route_2_southern_approach` resume point |

## Episode session briefs

| Episode | Title | Brief ID | Starting location | Status |
|---------|-------|----------|-------------------|--------|
| 2 | Skyfall Expanse | `session-02-skyfall-expanse` | `route_2_southern_approach` | Archived in `session-briefs/` |
| 3 | Zephyra's Trial | `session-03-zephyras-trial` | `breeze_path` | **Active** — also mirrored in `session-brief.json` |

Resolve a brief at session start with `session_brief_id` (defaults to `session-brief.json`). Episode-indexed copies live in `session-briefs/`.

## Resume point (active play)

Episode 3 **Zephyra's Trial** — party completes Breeze Path and challenges Gym Leader Zephyra at `zephyra_gym` for the Gale Badge (`badge_gale`). Active session: `server/sessions/celestide-isles-family-session.json`.

## Load path

```
loadCampaign("celestide-isles")
  → meta.json
  → world.json
  → factions.json
  → challenges.json
  → session-brief.json              # current/default episode (Episode 3)
  → session-briefs/*.json           # episode-indexed briefs (resolve by id or episode_number)
  → custom-pokemon.json (override layer, STO-22)
  → kb/*.md (campaign KB overrides)

resolveSessionBrief("celestide-isles", "session-03-zephyras-trial")
  → Episode 3 brief with gym_zephyra_wind encounter and badge_gale objectives
```
