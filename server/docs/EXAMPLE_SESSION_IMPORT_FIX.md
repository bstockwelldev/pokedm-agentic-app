# Example Session Import Fix

## Problem

1. The example session provided earlier didn't match the generated example
2. There was no way to load the example session from the UI
3. The import system only supported export format, not raw session JSON files

## Solution

### 1. Updated Import System to Support Both Formats

**File:** `client/src/lib/importSession.js`

**Changes:**
- Added `isRawSessionFormat()` function to detect raw session format
- Added `convertRawSessionToExportFormat()` function to convert raw sessions to export format
- Updated `validateImportData()` to accept both formats
- Updated `extractComponents()` to handle both formats
- Updated `getAvailableImportComponents()` to handle both formats

**Supported Formats:**
- **Export Format**: `{ export_version, components: { session, messages, characters, campaign, custom_pokemon, continuity }, metadata }`
- **Raw Session Format**: `{ schema_version, session, characters, campaign, custom_dex, continuity, ... }`

### 2. Added Preset Loader in UI

**File:** `client/src/components/ImportDrawer.jsx`

**Changes:**
- Added "Load Celestide Isles Example" button at the top of the import drawer
- Button loads example session data directly (embedded in component)
- Automatically validates and pre-selects all available components
- Falls back to embedded data if file fetch fails

**User Flow:**
1. Click "Import" button in top bar
2. Click "Load Celestide Isles Example" button
3. All components are pre-selected
4. Click "Import" to load the session
5. Continue the adventure!

### 3. Created Example Files

**Files Created:**
- `server/examples/example-campaign-session.json` - Raw session format (schema v1.1.0)
- `server/examples/example-campaign-session-export.json` - Export format
- `client/public/examples/example-campaign-session.json` - Copy for public access
- `client/public/examples/example-campaign-session-raw.json` - Raw format copy

**Example Session Details:**
- **Campaign**: Celestide Isles (floating archipelago)
- **Character**: Alex (teen trainer) with starter Pikachu (Level 5, nicknamed "Sparky")
- **Starting Location**: Route 2 - Southern Approach
- **Objectives**: Explore Route 2, learn about Wind Wardens
- **Includes**: Full campaign setup, character with Pokémon party, event log, timeline, continuity

### 4. Updated Documentation

**File:** `server/examples/README.md`

**Changes:**
- Added instructions for using the preset loader
- Documented both file formats
- Added usage examples for both UI and API import

## Usage

### Via UI (Easiest)

1. Click "Import" button in the application
2. Click "Load Celestide Isles Example" button
3. Click "Import" (all components pre-selected)
4. Start playing!

### Via File Upload

1. Click "Import" button
2. Click "Browse Files" or drag and drop
3. Upload either:
   - `example-campaign-session.json` (raw format)
   - `example-campaign-session-export.json` (export format)
4. Select components to import
5. Click "Import"

### Via API

```bash
# Raw session format
curl -X POST https://your-app.vercel.app/api/import \
  -H "Content-Type: application/json" \
  -d @example-campaign-session.json

# Export format
curl -X POST https://your-app.vercel.app/api/import \
  -H "Content-Type: application/json" \
  -d @example-campaign-session-export.json
```

## Technical Details

### Format Detection

The import system detects format by checking for:
- **Export Format**: `export_version` and `components` fields
- **Raw Session Format**: `schema_version` or `session.session_id` at root, without `export_version`

### Conversion Process

When a raw session is detected:
1. Validation passes with a warning about format conversion
2. Raw session is converted to export format internally
3. Components are extracted from converted format
4. Import proceeds normally

### Component Mapping

- `session` → `session_data` (backend expects this field name)
- `characters` → `characters`
- `campaign` → `campaign`
- `custom_dex.pokemon` → `custom_pokemon`
- `continuity` → `continuity`
- `messages` → `messages` (if present)

## Files Modified

1. `client/src/lib/importSession.js` - Added format detection and conversion
2. `client/src/components/ImportDrawer.jsx` - Added preset loader button
3. `server/examples/example-campaign-session-export.json` - Created export format
4. `client/public/examples/example-campaign-session.json` - Created public copy
5. `server/examples/README.md` - Updated documentation

## Testing

The implementation supports:
- ✅ Loading example via preset button
- ✅ Importing raw session format files
- ✅ Importing export format files
- ✅ Automatic format detection and conversion
- ✅ Component selection for both formats
- ✅ Backend import API compatibility

## Next Steps

1. Deploy updated frontend to enable preset loader
2. Test preset loader in production
3. Consider adding more example sessions (different campaigns, starting points)
4. Add preset selection dropdown if multiple examples are added
