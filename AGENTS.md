# AGENTS.md — PokeDM Agentic App

> **Read [`docs/agents.md`](docs/agents.md) before any non-trivial work.**
> This file = guardrails + quick-start. That file = full directory map, agent patterns, env vars, Docker, debugging, and skills reference.

---

## What This Repo Is

Full-stack demo converting a CustomGPT into an agentic flow via the Vercel AI SDK.
**Server**: Express.js + specialized AI agents backed by PokéAPI tools.
**Client**: React + Vite chat UI.

---

## Project Snapshot

| Area | One-liner |
|------|-----------|
| API entry | `server/server.js` — `POST /api/agent`, `GET /api/health` |
| Agent routing | `server/agents/router.js` classifies intent → delegates to dm/rules/state/lore/design |
| Tools | `server/tools/*.js` — PokéAPI wrappers + custom Pokémon creation, barrel-exported from `index.js` |
| Prompts | `server/prompts/*.js` — one file per agent |
| Session data | `server/storage/sessionStore.js` — file-persisted JSON |
| Chat UI | `client/src/App.jsx` — model select, maxSteps, message history |

---

## Quick Start

```bash
# Install
cd server && npm install && cp .env.example .env   # add GOOGLE_GENERATIVE_AI_API_KEY
cd ../client && npm install

# Run (two terminals)
cd server && npm start          # :3001
cd client && npm run dev        # :3000

# Or Docker
docker compose up --build
```

Core checks:
```bash
curl http://localhost:3001/api/health
cd client && npm run build      # verify no build errors
```

---

## Repo Shape

```
agentic-app/
├── server/         # Express backend
│   ├── agents/     # Router + 5 specialized agents
│   ├── tools/      # AI SDK tool functions (PokéAPI + custom)
│   ├── prompts/    # System prompts per agent
│   ├── schemas/    # Zod schemas (session, customPokemon)
│   ├── storage/    # File-based session + cache
│   └── server.js   # Entry point
├── client/         # React + Vite
│   └── src/App.jsx # Chat UI
├── docs/agents.md  # Full operational guide ← read this
└── AGENTS.md       # This file
```

---

## Standards

- **ES modules** (`import`/`export`) — no `require()`
- **Async/await** with `try/catch` — no raw `.then()` chains
- **Zod** for all tool parameters and data schemas
- **React**: functional components + hooks; always handle loading/error states
- **AI SDK**: `generateText()` for non-streaming; `tool()` for function calling; tool descriptions drive model behavior — keep them precise
- **Errors**: log server-side, return safe messages to client, never expose API keys

---

## Boundaries

**Always:**
- Read `docs/agents.md` before adding an agent, tool, or modifying routing
- Export new tools from `server/tools/index.js`
- Validate all tool parameters with Zod
- Test `/api/agent` locally before committing

**Ask first:**
- Changing session schema (`server/schemas/session.js`) — breaks persisted sessions
- Swapping AI provider or model default
- Modifying Docker networking or Vercel config

**Never:**
- Commit `.env` or any file with real API keys
- Expose stack traces or API keys in HTTP responses
- Use `require()` in new code
- Skip error handling in agent or tool `execute` functions

---

## Active Skills

Quick-invoke with `/skill-name`. Full descriptions in [`docs/agents.md#skills-reference`](docs/agents.md#skills-reference).

`/architecture-selection` · `/clean-code` · `/clean-refactor` · `/doc-hygeine`
`/feature-decomposition` · `/github-project-issue-tracking-sync` · `/grill-me`
`/obsidian-optimization` · `/prompt-security` · `/vault-ingestion` · `/engineering:code-review`
