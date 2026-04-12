# docs/agents.md — PokeDM Operational Agent Guide

> Read this before any non-trivial work. Root `AGENTS.md` contains guardrails and quick-start only.

---

## Directory Map

```
agentic-app/
├── server/
│   ├── server.js               # Express entry point — POST /api/agent, GET /api/health
│   ├── agents/
│   │   ├── router.js           # Intent classifier → routes to specialized agents
│   │   ├── dm.js               # Dungeon Master — narrative generation
│   │   ├── rules.js            # Rules engine — dice rolls, game mechanics
│   │   ├── state.js            # State query — session info reads
│   │   ├── lore.js             # Lore retrieval — Pokémon world knowledge
│   │   ├── design.js           # Custom Pokémon designer
│   │   └── toolHelpers.js      # Shared tool utilities
│   ├── tools/
│   │   ├── index.js            # Barrel export for all tools
│   │   ├── pokemon.js          # Pokémon data (PokéAPI wrappers)
│   │   ├── moves.js / abilities.js / types.js / species.js
│   │   ├── locations.js / items.js / evolution.js / generation.js
│   │   └── custom-pokemon.js   # Custom Pokémon creation tools
│   ├── prompts/
│   │   └── {router,dm,rules,state,lore,design}.js  # Per-agent system prompts
│   ├── schemas/
│   │   ├── session.js          # Session shape (campaign, characters, custom Pokémon)
│   │   ├── customPokemon.js    # Custom Pokémon schema
│   │   └── references.js       # Reference data schemas
│   ├── storage/
│   │   ├── sessionStore.js     # File-based session persistence → server/storage/sessions/
│   │   ├── canonCache.js       # Canonical Pokémon data cache
│   │   └── init.js             # Storage initialization
│   ├── config/agentConfig.js   # Agent-level config (maxSteps, model overrides)
│   ├── kb/index.js             # Knowledge base utilities
│   ├── Dockerfile
│   └── .env.example
├── client/
│   ├── src/App.jsx             # Chat UI — model select, maxSteps, message display
│   ├── src/main.jsx            # React entry point
│   ├── vite.config.js          # Proxy: /api → http://localhost:3001
│   └── Dockerfile
├── docs/
│   └── agents.md               # This file
├── docker-compose.yml
├── vercel.json
└── AGENTS.md                   # Lean guardrails + redirect here
```

---

## High-Value Entry Points

| Change type | Start here |
|-------------|-----------|
| New agent intent | `server/agents/router.js` → `server/server.js` switch |
| Agent behavior | `server/prompts/{agent}.js` |
| New data tool | `server/tools/` → export from `server/tools/index.js` |
| Session shape | `server/schemas/session.js` |
| Chat UI | `client/src/App.jsx` |
| API proxy | `client/vite.config.js` |
| Docker networking | `docker-compose.yml` |
| Vercel deployment | `vercel.json` + `server/vercel.json` |

---

## Agent System

### Router Agent (`server/agents/router.js`)

Classifies every incoming message to one of five intents, then delegates:

| Intent | Agent | Trigger examples |
|--------|-------|-----------------|
| `narration` | DM Agent | Story beats, scene descriptions |
| `roll` | Rules Agent | Dice checks, combat mechanics |
| `state` | State Agent | "What's in my party?", "Show session" |
| `lore` | Lore Agent | Pokédex facts, world history |
| `design` | Design Agent | Create a custom Pokémon |

Call signature:
```javascript
const intent = await routeIntent(userInput, session, model);
```

### Specialized Agent Pattern

All agents follow the same shape:
```javascript
export async function runAgent(userInput, session, model) {
  const result = await generateText({
    model: google(model),
    prompt: agentPrompt,
    tools: agentTools,
    maxSteps: 5
  });
  return { narration: result.text, steps: result.steps, updatedSession: session };
}
```

### Tools Pattern (AI SDK)

```javascript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'Concise description — this drives LLM tool selection',
  parameters: z.object({ param: z.string().describe('what this is') }),
  execute: async ({ param }) => ({ result: 'data' })
});
```

Export from `server/tools/index.js`, then add to target agent's `tools` array.

---

## Development Workflows

### Adding a New Agent

1. `server/agents/myAgent.js` — implement `runMyAgent(userInput, session, model)`
2. `server/prompts/myAgent.js` — write system prompt
3. `server/agents/router.js` — add intent to `validIntents`
4. `server/server.js` — add case to switch statement
5. Test: POST `{"userInput":"...","sessionId":"test","model":"gemini-1.5-pro-latest"}` to `/api/agent`

### Adding a New Tool

1. `server/tools/myTool.js` — define with `tool()` + Zod schema
2. `server/tools/index.js` — export it
3. Target agent file — add to `tools` object passed to `generateText`

### Modifying Prompts

Edit `server/prompts/{agent}.js` → restart server (or rely on hot reload in Docker) → test with sample queries.

---

## Environment Variables

### `server/.env` (copy from `.env.example`)

```bash
# AI Provider — use one:
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
AI_GATEWAY_API_KEY=your-ai-gateway-key     # Vercel AI Gateway

# Model
LLM_MODEL=gemini-1.5-pro-latest            # Default; overridable per-request

# Server
PORT=3001
NODE_ENV=development

# Auto-set by Vercel:
VERCEL=1
VERCEL_ENV=production
```

### Client

No env vars required — uses Vite proxy (`/api → http://localhost:3001`).

### Docker

`docker-compose.yml` injects `DOCKER_ENV=true` and `VITE_API_TARGET=http://server:3001`.

---

## Docker Reference

```bash
docker compose up --build           # Build + start
docker compose up -d --build        # Detached
docker compose logs -f server       # Server logs only
docker compose logs -f client       # Client logs only
docker compose down                 # Stop + remove containers
docker compose up --build --force-recreate  # Full rebuild
```

**Volume mounts** (hot reload enabled):
- `./server:/app` and `./client:/app`
- `./server/.env:/app/.env:ro`

**Networking**: client → `http://server:3001` (Docker DNS); host → `localhost:3000` / `localhost:3001`.

---

## Deployment

### Vercel

- `vercel.json` (root) — project-level routing
- `server/vercel.json` — serverless function config

Set in Vercel project settings: `GOOGLE_GENERATIVE_AI_API_KEY`, optionally `LLM_MODEL`.

### Docker Production

Swap `server/storage/sessionStore.js` for Redis/DB-backed persistence before shipping to prod.

---

## Debugging

| Symptom | Check |
|---------|-------|
| Wrong agent called | Router prompt + `validIntents` in `router.js` |
| Tool not invoked | Tool description clarity + Zod schema |
| Session not persisting | Permissions on `server/storage/sessions/` |
| API 500 errors | Server logs + `.env` API key present |
| Client can't reach server | Vite proxy config + `PORT=3001` |
| Docker networking | `docker compose logs`, service name DNS |

Debug steps:
1. `result.steps` in response body shows intermediate reasoning + tool calls
2. `GET /api/health` to verify server is alive
3. `curl -X POST http://localhost:3001/api/agent -H 'Content-Type: application/json' -d '{"userInput":"ping","sessionId":"debug","model":"gemini-1.5-pro-latest"}'`

---

## Skills Reference

The following Claude skills are enabled for this repo. Invoke them with `/skill-name`:

| Skill | When to use |
|-------|------------|
| `/architecture-selection` | Choosing frameworks, deployment targets, or comparing tech options for new features |
| `/clean-code` | Score readability/testability of any agent, tool, or component; get targeted refactor suggestions |
| `/clean-refactor` | Restructure mixed-abstraction functions into Z1/Z2/Z3 tiers (high-level → detail) |
| `/doc-hygeine` | Scan docs for stale, contradictory, or duplicate content; get prune/update plan |
| `/feature-decomposition` | Break a new agent, tool, or UI feature into Z1/Z2/Z3 function hierarchy before implementing |
| `/github-project-issue-tracking-sync` | Reconcile GitHub Issues/Projects with roadmap docs; find gaps and stale tracking |
| `/grill-me` | Adversarial stress-test of a design decision, ADR, or prompt before committing |
| `/obsidian-optimization` | Structure knowledge-base notes or `kb/` content as a semantic graph |
| `/prompt-security` | Audit agent prompts for injection risks, trust-boundary violations, and OWASP issues |
| `/vault-ingestion` | Ingest external content (Notion, Drive, Gmail) into the knowledge base |
| `/engineering:code-review` | Security, performance, and correctness review of a diff or PR before merging |

---

## Session Data Shape

```javascript
// server/schemas/session.js
{
  id: string,
  campaign: { name, setting, rules },
  characters: [{ name, species, level, hp, moves, abilities }],
  customPokemon: [{ ...customPokemon schema }],
  history: [{ role, content }],
  createdAt, updatedAt
}
```

Sessions are file-persisted at `server/storage/sessions/{sessionId}.json`.

---

## Code Standards

- **Modules**: ES modules (`import`/`export`) throughout — no `require()`
- **Async**: `async`/`await` with `try/catch` — no raw Promise chains
- **Validation**: Zod for all tool parameters and schemas
- **React**: Functional components + hooks; handle loading/error states; key props on lists
- **AI SDK**: `generateText()` for non-streaming; `tool()` for function calling; clear tool descriptions drive model behavior
- **Error handling**: Log errors server-side, return safe messages to client, never leak API keys or stack traces
