# Local Setup — PokeDM Agentic App

## Prerequisites

- Node.js 18+ and npm
- A modern browser with Web Speech API support (Chrome or Edge recommended for STT/TTS)
- API keys for at least one LLM provider (Groq is free)

---

## Quick Start

### 1. Install dependencies

```bash
# From repo root (installs both server and client)
npm install

# Or manually:
cd server && npm install
cd client && npm install
```

### 2. Configure the server

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and set at minimum:

```env
# Groq is free and fast — recommended for local dev
GROQ_API_KEY=your-groq-api-key-here

# Optional: OpenAI for DALL-E 3 image generation
OPENAI_API_KEY=your-openai-key-here
```

Get a free Groq key at: https://console.groq.com/keys

### 3. Start the app

**Option A — one terminal (recommended):**

```bash
npm run dev
```

This starts both the Express server (port 3001) and the Vite client (port 5173) via `concurrently`.

**Option B — two terminals:**

```bash
# Terminal 1
cd server && npm start

# Terminal 2
cd client && npm run dev
```

### 4. Open the app

Visit **http://localhost:5173**

The server API is at **http://localhost:3001** — verify with:

```bash
curl http://localhost:3001/api/health
```

---

## Session Storage

| Mode | Storage | Notes |
|------|---------|-------|
| Local dev | File-based JSON (`server/sessions/*.json`) | Set by `STORAGE_PROVIDER=file` (default) |
| Production (Vercel) | PostgreSQL via `STORAGE_PROVIDER=postgres` | Requires `DATABASE_URL` env var |

In production on Vercel, file-based sessions are **ephemeral** — they are lost on cold starts and across function instances. Set up Supabase (free tier) and configure `DATABASE_URL` before deploying for real usage.

### Supabase setup (for production):

1. Create a free project at https://supabase.com
2. Go to **Project Settings → Database → Connection Pooling**
3. Enable **Supabase Pooler** (Transaction mode, port 6543)
4. Copy the connection string into `server/.env`:

```env
STORAGE_PROVIDER=postgres
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DATABASE_SSL=true
```

The session table (`pokedm_sessions`) is created automatically on first run.

---

## Voice Features

- **STT (Speech-to-Text)**: Uses the browser's `SpeechRecognition` API. Requires Chrome or Edge — not supported in Firefox or Safari.
- **TTS (Text-to-Speech)**: Uses the browser's `SpeechSynthesis` API. Works in all modern browsers. An English UK voice is preferred (Daniel, Arthur, Rishi) if available.

Both features degrade gracefully — the app works without them.

---

## PokeAPI

PokeDM fetches Pokémon data from [PokeAPI](https://pokeapi.co). No API key is required. The rate limit is 100 requests per minute per IP, which is generous for local dev and single-player usage. Responses are cached in the session store to avoid repeat fetches.

---

## Models

PokeDM uses a **tier model system**:

| Tier | Default | Used for |
|------|---------|----------|
| `fast` | `groq/llama-3.1-8b-instant` | Router, State agents |
| `smart` | `groq/llama-3.3-70b-versatile` | DM, Lore, Rules, Design agents |
| `vision` | `google/gemini-2.0-flash` | Image-aware tasks |

Override with environment variables in `server/.env`:

```env
SMART_MODEL=groq/llama-3.3-70b-versatile
FAST_MODEL=groq/llama-3.1-8b-instant
DM_MODEL=gemini-2.5-flash   # Per-agent override
```

---

## Agents

| Agent | Route | Role |
|-------|-------|------|
| DM | `POST /api/v1/agent` | Narration, choices, story |
| DM (streaming) | `POST /api/v1/agent/stream` | Streaming narration (SSE) |
| Router | Internal | Intent classification |
| State | Internal | Session state reads |
| Lore | Internal | PokeAPI lookups |
| Rules | Internal | Battle mechanics |
| Design | Internal | Custom Pokémon creation |

See `AGENTS.md` at the repo root for the full agent context map.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ECONNREFUSED` on `/api/*` | Ensure the Express server is running on port 3001 |
| `Missing GROQ_API_KEY` | Set it in `server/.env` |
| STT not working | Switch to Chrome or Edge |
| Sessions lost on restart | Expected for file storage; use Supabase for persistence |
| Rate limit errors (429) | Back off; default limit is 60 req/min per IP |
| Image generation fails | Set `OPENAI_API_KEY` in `server/.env`; check `IMAGE_LIMIT_PER_SESSION` |

---

## Project Structure

```
agentic-app/
├── server/
│   ├── agents/          # DM, Router, State, Lore, Rules, Design
│   ├── config/          # Agent config, model tiers
│   ├── engines/         # Affinity, battle engines
│   ├── kb/              # Knowledge base (markdown files)
│   │   ├── knowledge/   # Core rules: battle, catch, affinity, etc.
│   │   └── systems/     # Encounter tables, evolution rules
│   ├── lib/             # Logger, model utils, helpers
│   ├── prompts/         # System prompt builders
│   ├── schemas/         # Zod schemas (session, trainer, etc.)
│   ├── services/        # Campaign loader, session startup, etc.
│   ├── storage/         # File + Postgres adapters
│   └── tools/           # Image generation, PokeAPI tools
└── client/
    └── src/
        ├── components/  # BattlePanel, CampaignBuilder, PartySidebar, etc.
        └── hooks/       # useStreamingDM, useDmSpeech, VoiceInput
```
