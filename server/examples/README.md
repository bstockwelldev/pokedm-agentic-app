# Example Campaign Session

## Overview

This directory contains example campaign sessions that can be imported into the application for testing, reference, or continuation.

## Files

### `example-campaign-session.json`

A complete, schema-compliant example session for the **Celestide Isles** campaign. This session demonstrates:

- ✅ Full schema compliance (v1.1.0)
- ✅ Complete campaign setup with region, locations, NPCs, and factions
- ✅ Character with starter Pokémon (Pikachu)
- ✅ Event log with initial events
- ✅ Timeline entries
- ✅ Objectives and progression milestones
- ✅ Continuity tracking (discovered Pokémon, unresolved hooks)

## Campaign: Celestide Isles

**Theme**: Wind, celestial energy, environmental balance

**Setting**: A floating archipelago where wind currents carry celestial energy. The islands are connected by natural bridges and floating platforms.

**Starting State**:
- Location: Route 2 - Southern Approach
- Character: Alex (teen trainer)
- Starter: Pikachu (nicknamed "Sparky", Level 5)
- Objectives: Explore Route 2, learn about Wind Wardens

## Usage

### Import via API

```bash
curl -X POST https://your-app.vercel.app/api/import \
  -H "Content-Type: application/json" \
  -d @example-campaign-session.json
```

### Import via UI

1. Open the Import drawer in the application
2. Select "Import from File"
3. Upload `example-campaign-session.json`
4. Select import components (or import all)
5. Continue the adventure!

### Continue the Session

After importing, you can:
- Continue exploring Route 2
- Battle wild Pokémon
- Meet NPCs and learn about the Wind Wardens
- Discover new locations
- Progress through objectives

## Session Structure

The example session includes:

- **Campaign**: Celestide Isles region with 3 locations, 1 faction, 2 NPCs, 2 world facts
- **Character**: Alex with starter Pikachu, basic inventory, and progression milestones
- **Session State**: Active session on Route 2 with 2 active objectives
- **Event Log**: 3 initial events (arrival, Pokédex, journey start)
- **Timeline**: 3 timeline entries documenting the adventure so far
- **Continuity**: 1 discovered Pokémon, 1 unresolved hook

## Schema Compliance

This example follows the `PokemonSessionSchema` v1.1.0 specification:
- All required fields present
- Proper data types and enums
- Valid references and IDs
- Complete nested structures

## Customization

You can customize this example by:
- Changing character names and Pokémon
- Modifying locations and NPCs
- Adding more objectives or events
- Adjusting the campaign region details

## Notes

- The session uses canon Pokémon (Pikachu) - you can replace with custom Pokémon if desired
- All PokeAPI data will be fetched and cached when tools are used
- The session is ready for immediate continuation
- Event log and timeline can be extended as play progresses
