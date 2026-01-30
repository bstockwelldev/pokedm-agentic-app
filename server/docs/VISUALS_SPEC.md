# Visual Flavor System Spec (Draft)

## Goals
- Blend official Pokemon art (PokeAPI) with AI-generated session art.
- Show visuals inline in mobile chat cards and in the desktop right panel.
- Cache per-session for reuse; store image metadata for future object storage.
- Prefer official art over AI; allow user toggle and refresh.

## Data Model

### VisualEntityRef
```
{
  entity_type: "session" | "location" | "npc" | "party" |
               "custom_pokemon" | "item" | "character",
  entity_id: "string",
  entity_label: "string",
  pokemon_ref?: "canon:pikachu" | "custom:cstm_embermole",
  location_id?: "string"
}
```

### VisualSource
```
"official_art" | "sprite" | "ai"
```

### VisualAsset
```
{
  asset_id: "uuid",
  session_id: "uuid",
  entity: VisualEntityRef,
  source: VisualSource,
  provider: "pokeapi" | "imagen" | "nano_banana",
  status: "ready" | "pending" | "failed",
  image_url: "string",
  thumb_url?: "string",
  width: number,
  height: number,
  format: "png" | "jpg" | "webp",
  prompt_original?: "string",
  prompt_sanitized?: "string",
  prompt_hash?: "string",
  created_at: "iso",
  updated_at: "iso",
  error?: "string",
  storage_key?: "string",
  object_url?: "string",
  is_primary?: boolean,
  refresh_count?: number
}
```

### Proposed Session Storage (per-session cache)
```
session.media = {
  visuals: {
    enabled: true,
    items: {
      "<entity_type>:<entity_id>": [VisualAsset, ...]
    },
    last_generated_at?: "iso"
  }
}
```

## Cache Resolution Order
1. Session cache hit for entity + source (prefer official_art, then sprite).
2. PokeAPI official art (sprites.other.official-artwork.front_default).
3. AI generation (Imagen primary, Nano Banana fallback).
4. On refusal, retry with sanitized prompt (remove brand keywords).

## API Contract (Draft)

### GET /api/v1/visuals
Query:
```
sessionId, entityType, entityId, source?, limit?
```
Response:
```
{ assets: VisualAsset[], primaryAssetId?: "uuid" }
```

### POST /api/v1/visuals/resolve
Request:
```
{
  sessionId: "uuid",
  entity: VisualEntityRef,
  preferSources: ["official_art", "sprite", "ai"],
  allowAi: true,
  size: "card" | "thumb"
}
```
Response:
```
{ status: "ready" | "pending", asset?: VisualAsset, jobId?: "uuid" }
```

### POST /api/v1/visuals/refresh
Request:
```
{
  sessionId: "uuid",
  entity: VisualEntityRef,
  source: "ai"
}
```
Response:
```
{ status: "pending" | "ready", asset?: VisualAsset, jobId?: "uuid" }
```

### POST /api/v1/visuals/batch
Request:
```
{
  sessionId: "uuid",
  requests: [
    { entity: VisualEntityRef, preferSources: ["official_art", "ai"], allowAi: true }
  ]
}
```
Response:
```
{ results: [{ status, asset, jobId, entity }, ...] }
```

## UI Component Spec (Draft)

### VisualCard
Props:
```
{
  entity: VisualEntityRef,
  asset?: VisualAsset,
  status: "idle" | "loading" | "ready" | "error",
  allowAi: boolean,
  onRefresh: () => void,
  onToggleAi: (next: boolean) => void,
  onRetry: () => void,
  size?: "mobile" | "desktop"
}
```
States:
- loading: skeleton + disabled refresh
- ready: image + source badge
- error: retry action + message

### VisualGrid
Props:
```
{
  assetsByEntity: Record<string, VisualAsset[]>,
  onSelectEntity?: (entityKey: string) => void
}
```

### VisualSourceBadge
Props:
```
{ source: VisualSource, provider: string }
```

### VisualControls
Props:
```
{ allowAi: boolean, onToggleAi: (next) => void, onRefresh: () => void, disabled?: boolean }
```

### VisualSkeleton
Props:
```
{ size?: "card" | "thumb" }
```

## Accessibility Notes
- Alt text: "Official art of {entity_label}" or "AI-generated art of {entity_label}".
- Use `aria-live="polite"` for loading and error updates.
- Ensure 44px tap targets for refresh/toggle on mobile.

## Prompting (AI)
Prompt fields:
- entity label/type, scene mood, location summary, party summary.
- If refusal: remove brand terms, avoid "Pokemon", use "creature" or "trainer".
Store both prompt_original and prompt_sanitized for auditability.

## Future Object Storage
Add `storage_key` and `object_url` when moving to cloud storage:
```
storage_key = "sessions/<sessionId>/visuals/<assetId>.webp"
```
