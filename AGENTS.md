# AGENTS.md - Agent & Contributor Guidance

## Purpose & Scope

This document guides **autonomous coding agents** and human contributors working on the **PokeDM Agentic App** - a full-stack application demonstrating how to convert a CustomGPT into an agentic flow using Vercel's AI SDK. The application consists of an Express.js backend with specialized AI agents and a React + Vite frontend.

---

## Quick Start for Agents

### Prerequisites
- Node.js 20.x or later
- npm or pnpm
- Docker & Docker Compose (for containerized development)

### Initial Setup

1. **Install dependencies:**
   ```bash
   # Server
   cd server
   npm install
   cp .env.example .env
   # Edit .env and set AI_GATEWAY_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY for Gemini)
   
   # Client
   cd ../client
   npm install
   ```

2. **Run locally:**
   ```bash
   # Terminal 1: Server (port 3001)
   cd server
   npm start
   
   # Terminal 2: Client (port 3000)
   cd client
   npm run dev
   ```

3. **Run with Docker:**
   ```bash
   docker compose up --build
   ```

### Key Commands

```bash
# Server
cd server && npm start          # Start Express server
cd server && npm test           # Run tests (if available)

# Client
cd client && npm run dev        # Start Vite dev server
cd client && npm run build      # Build for production
cd client && npm run serve      # Preview production build

# Docker
docker compose up               # Start all services
docker compose down            # Stop all services
docker compose logs -f          # View logs
```

---

## Project Structure

```
agentic-app/
├── server/                     # Express.js backend
│   ├── agents/                 # Specialized AI agents
│   │   ├── router.js          # Intent routing agent
│   │   ├── dm.js              # Dungeon Master agent
│   │   ├── rules.js           # Rules engine agent
│   │   ├── state.js            # State query agent
│   │   ├── lore.js             # Lore retrieval agent
│   │   ├── design.js           # Custom Pokemon design agent
│   │   └── toolHelpers.js     # Shared tool utilities
│   ├── tools/                  # Tool functions for agents
│   │   ├── pokemon.js         # Pokemon data tools
│   │   ├── moves.js           # Move data tools
│   │   ├── abilities.js       # Ability data tools
│   │   ├── types.js           # Type data tools
│   │   ├── species.js         # Species data tools
│   │   ├── locations.js       # Location data tools
│   │   ├── items.js           # Item data tools
│   │   ├── evolution.js       # Evolution data tools
│   │   ├── generation.js      # Generation data tools
│   │   ├── custom-pokemon.js # Custom Pokemon creation tools
│   │   └── index.js           # Tool exports
│   ├── prompts/                # AI prompt templates
│   │   ├── router.js          # Router agent prompt
│   │   ├── dm.js              # DM agent prompt
│   │   ├── rules.js           # Rules agent prompt
│   │   ├── state.js           # State agent prompt
│   │   ├── lore.js            # Lore agent prompt
│   │   └── design.js          # Design agent prompt
│   ├── schemas/                # Data schemas
│   │   ├── session.js         # Session schema
│   │   ├── customPokemon.js   # Custom Pokemon schema
│   │   └── references.js     # Reference data schemas
│   ├── storage/                # Session & data storage
│   │   ├── sessionStore.js    # Session persistence
│   │   ├── canonCache.js      # Canonical data cache
│   │   └── init.js            # Storage initialization
│   ├── config/                 # Configuration
│   │   └── agentConfig.js     # Agent configuration
│   ├── kb/                     # Knowledge base
│   │   └── index.js           # KB utilities
│   ├── server.js              # Main Express server
│   ├── Dockerfile             # Server Docker config
│   ├── .env.example           # Environment template
│   └── package.json          # Server dependencies
│
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx            # Main React component
│   │   └── main.jsx           # React entry point
│   ├── index.html             # HTML template
│   ├── vite.config.js         # Vite configuration
│   ├── Dockerfile             # Client Docker config
│   └── package.json          # Client dependencies
│
├── docker-compose.yml          # Docker Compose configuration
├── README.md                   # Project documentation
├── setup.ps1                  # Windows setup script
├── setup.sh                   # Unix setup script
└── AGENTS.md                  # This file
```

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (React)                       │
│                  http://localhost:3000                  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  App.jsx - Chat UI                               │  │
│  │  - Model selection                               │  │
│  │  - Max steps control                            │  │
│  │  - Message display                              │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │ POST /api/agent                      │
│                 │ { userInput, sessionId, model }      │
└─────────────────┼──────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Server (Express.js)                       │
│            http://localhost:3001                       │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  server.js - Main Entry Point                   │  │
│  │  POST /api/agent                                 │  │
│  │  GET  /api/health                                │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                        │
│                 ▼                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Router Agent (router.js)                       │  │
│  │  - Classifies user intent                       │  │
│  │  - Routes to specialized agent                  │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                        │
│      ┌──────────┼──────────┬──────────┬──────────┐     │
│      │          │          │          │          │     │
│      ▼          ▼          ▼          ▼          ▼     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │  DM  │  │Rules │  │State │  │Lore  │  │Design│     │
│  │Agent │  │Agent │  │Agent │  │Agent │  │Agent │     │
│  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘     │
│     │         │          │         │         │         │
│     └─────────┴──────────┴─────────┴─────────┘         │
│                    │                                    │
│                    ▼                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Tools (tools/*.js)                              │  │
│  │  - Pokemon data                                  │  │
│  │  - Moves, abilities, types                      │  │
│  │  - Custom Pokemon creation                       │  │
│  └──────────────────────────────────────────────────┘  │
│                    │                                    │
│                    ▼                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Storage (storage/*.js)                          │  │
│  │  - Session persistence                           │  │
│  │  - Canon cache                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Agent Flow

1. **Client** sends user input to `/api/agent`
2. **Router Agent** classifies intent (narration, roll, state, lore, design)
3. **Specialized Agent** processes request using appropriate tools
4. **Tools** provide Pokemon data, game mechanics, or custom creation
5. **Storage** persists session state and caches canonical data
6. **Response** returns to client with narration, choices, and session state

---

## Key Files & Their Purposes

### Server Entry Points

- **`server/server.js`** - Main Express server, routes `/api/agent` and `/api/health`
- **`server/agents/router.js`** - Intent classification, routes to specialized agents
- **`server/agents/dm.js`** - Dungeon Master agent for narrative generation
- **`server/agents/rules.js`** - Rules engine for dice rolls and game mechanics
- **`server/agents/state.js`** - State query agent for session information
- **`server/agents/lore.js`** - Lore retrieval agent for Pokemon world knowledge
- **`server/agents/design.js`** - Custom Pokemon design agent

### Client Entry Points

- **`client/src/App.jsx`** - Main React component with chat UI
- **`client/src/main.jsx`** - React application entry point
- **`client/vite.config.js`** - Vite configuration with API proxy

### Configuration

- **`server/.env`** - Environment variables (API keys, model defaults)
- **`server/config/agentConfig.js`** - Agent-specific configuration
- **`docker-compose.yml`** - Docker services configuration

### Storage & Data

- **`server/storage/sessionStore.js`** - Session persistence (file-based)
- **`server/storage/canonCache.js`** - Canonical Pokemon data cache
- **`server/schemas/session.js`** - Session data schema
- **`server/schemas/customPokemon.js`** - Custom Pokemon schema

---

## Development Workflow

### Adding a New Agent

1. **Create agent file** in `server/agents/`:
   ```javascript
   // server/agents/myAgent.js
   import { generateText } from 'ai';
   import { google } from '@ai-sdk/google';
   import { myAgentPrompt } from '../prompts/myAgent.js';
   
   export async function runMyAgent(userInput, session, model) {
     // Agent logic here
     return { narration: result.text, steps: result.steps };
   }
   ```

2. **Create prompt file** in `server/prompts/`:
   ```javascript
   // server/prompts/myAgent.js
   export const myAgentPrompt = `...`;
   ```

3. **Update router** in `server/agents/router.js`:
   - Add new intent to `validIntents` array
   - Add case in `server.js` switch statement

4. **Test** the new agent endpoint

### Adding a New Tool

1. **Create tool file** in `server/tools/`:
   ```javascript
   // server/tools/myTool.js
   import { tool } from 'ai';
   import { z } from 'zod';
   
   export const myTool = tool({
     description: 'Tool description',
     parameters: z.object({ ... }),
     execute: async ({ param }) => { ... }
   });
   ```

2. **Export** from `server/tools/index.js`

3. **Use** in agent's `tools` array

### Modifying Client UI

- **`client/src/App.jsx`** - Main chat interface
- Add new UI components as needed
- Update API calls if endpoint changes
- Vite hot reload will reflect changes automatically

---

## Environment Variables

### Server Environment (`server/.env`)

```bash
# AI Provider Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
# OR for Vercel AI Gateway:
AI_GATEWAY_API_KEY=your-ai-gateway-key

# Model Configuration
LLM_MODEL=gemini-1.5-pro-latest  # Default model

# Server Configuration
PORT=3001                        # Server port (default: 3001)
NODE_ENV=development             # Environment mode

# Vercel Detection (auto-set in Vercel)
VERCEL=1                         # Set by Vercel
VERCEL_ENV=production            # Set by Vercel
```

### Client Environment

No environment variables required for client (uses proxy to server).

### Docker Environment

Docker Compose automatically sets:
- `DOCKER_ENV=true` - Signals Docker environment
- `VITE_API_TARGET=http://server:3001` - Client proxy target

---

## Docker Development

### Quick Start

```bash
# Build and start services
docker compose up --build

# Start in background
docker compose up -d --build

# View logs
docker compose logs -f
docker compose logs -f server  # Server only
docker compose logs -f client  # Client only

# Stop services
docker compose down

# Rebuild after dependency changes
docker compose up --build --force-recreate
```

### Volume Mounts

- **Server**: `./server:/app` - Hot reload enabled
- **Client**: `./client:/app` - Hot reload enabled
- **Environment**: `./server/.env:/app/.env:ro` - Read-only env file

### Service Communication

- **Client → Server**: `http://server:3001` (Docker network)
- **Host → Client**: `http://localhost:3000`
- **Host → Server**: `http://localhost:3001`

---

## Agent System Details

### Router Agent

**File**: `server/agents/router.js`

**Purpose**: Classifies user intent and routes to appropriate specialized agent

**Intents**:
- `narration` - Story/narrative generation → DM Agent
- `roll` - Dice rolls, game mechanics → Rules Agent
- `state` - Session state queries → State Agent
- `lore` - Pokemon world knowledge → Lore Agent
- `design` - Custom Pokemon creation → Design Agent

**Usage**:
```javascript
const intent = await routeIntent(userInput, session, model);
```

### Specialized Agents

Each agent follows a similar pattern:

```javascript
export async function runAgent(userInput, session, model) {
  const result = await generateText({
    model: google(model),
    prompt: agentPrompt,
    tools: agentTools,
    maxSteps: 5
  });
  
  return {
    narration: result.text,
    steps: result.steps,
    updatedSession: session // if modified
  };
}
```

### Tools System

Tools are defined using the AI SDK `tool()` function:

```javascript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'Clear description of what the tool does',
  parameters: z.object({
    param: z.string().describe('Parameter description')
  }),
  execute: async ({ param }) => {
    // Tool logic
    return { result: 'data' };
  }
});
```

---

## Common Tasks

### Adding a New Pokemon Tool

1. Create tool in `server/tools/`
2. Export from `server/tools/index.js`
3. Add to agent's tools array
4. Test with sample queries

### Modifying Agent Prompts

1. Edit prompt file in `server/prompts/`
2. Restart server (or use hot reload)
3. Test with sample queries

### Debugging Agent Responses

1. Check server logs for agent execution
2. Review `result.steps` in response for intermediate reasoning
3. Verify tool calls in steps
4. Check session state persistence

### Session Management

- Sessions stored in `server/storage/sessions/` (file-based)
- Session ID passed from client in request
- Session state includes: campaign, characters, custom Pokemon, etc.
- Sessions persist across requests

---

## AI-Friendly Navigation Hints

### Finding Agent Logic

- **Router**: `server/agents/router.js`
- **DM Agent**: `server/agents/dm.js`
- **Rules Agent**: `server/agents/rules.js`
- **State Agent**: `server/agents/state.js`
- **Lore Agent**: `server/agents/lore.js`
- **Design Agent**: `server/agents/design.js`

### Finding Tool Functions

- **All tools**: `server/tools/index.js` (exports)
- **Pokemon tools**: `server/tools/pokemon.js`
- **Custom Pokemon**: `server/tools/custom-pokemon.js`
- **Other tools**: `server/tools/*.js`

### Finding Prompts

- **All prompts**: `server/prompts/*.js`
- **Router prompt**: `server/prompts/router.js`
- **Agent prompts**: `server/prompts/{agentName}.js`

### Finding Schemas

- **Session schema**: `server/schemas/session.js`
- **Custom Pokemon**: `server/schemas/customPokemon.js`
- **References**: `server/schemas/references.js`

### Finding Storage Logic

- **Session storage**: `server/storage/sessionStore.js`
- **Cache**: `server/storage/canonCache.js`
- **Init**: `server/storage/init.js`

---

## Testing & Debugging

### Local Testing

1. Start server: `cd server && npm start`
2. Start client: `cd client && npm run dev`
3. Open `http://localhost:3000`
4. Send test queries and observe responses

### Docker Testing

1. Start services: `docker compose up`
2. Check logs: `docker compose logs -f`
3. Test endpoints: `curl http://localhost:3001/api/health`

### Debugging Tips

- **Agent not routing correctly**: Check router agent prompt and intent validation
- **Tool not being called**: Verify tool description and parameters match use case
- **Session not persisting**: Check `server/storage/sessions/` directory permissions
- **API errors**: Check server logs and environment variables

---

## Deployment

### Vercel Deployment

The application is configured for Vercel serverless functions:

- **Server**: `server/vercel.json` - Serverless function configuration
- **Client**: `client/vercel.json` - Static site configuration
- **Root**: `vercel.json` - Project-level configuration

### Environment Variables (Vercel)

Set in Vercel project settings:
- `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini API key
- `LLM_MODEL` - Default model (optional)

### Docker Production

For production Docker deployment:
1. Build production images
2. Set environment variables
3. Use production-ready session storage (Redis, database, etc.)

---

## Code Quality Guidelines

### JavaScript/Node.js

- Use ES modules (`import/export`)
- Follow async/await patterns
- Handle errors with try/catch
- Use Zod for schema validation

### React

- Functional components with hooks
- Keep components focused and reusable
- Handle loading and error states
- Use proper key props for lists

### AI SDK Patterns

- Use `generateText()` for non-streaming responses
- Use `tool()` for function calling
- Provide clear tool descriptions
- Validate tool parameters with Zod

### Error Handling

- Always catch and log errors
- Return meaningful error messages
- Don't expose sensitive information
- Handle edge cases gracefully

---

## Troubleshooting

### Server Won't Start

- Check Node.js version (20.x+)
- Verify `.env` file exists and has API key
- Check port 3001 is available
- Review server logs for errors

### Client Can't Connect

- Verify server is running on port 3001
- Check Vite proxy configuration
- Review browser console for errors
- Verify CORS settings on server

### Agent Not Responding

- Check API key is valid
- Verify model name is correct
- Review agent logs for errors
- Test with simple queries first

### Docker Issues

- Ensure Docker is running
- Check `docker-compose.yml` syntax
- Verify `.env` file exists
- Review container logs

---

## Contributing

### Before Making Changes

1. Read this AGENTS.md file
2. Understand the agent architecture
3. Review existing code patterns
4. Test locally before committing

### Commit Messages

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Tests

### Pull Requests

- Describe changes clearly
- Include test results
- Update documentation if needed
- Follow existing code style

---

## Additional Resources

- **README.md** - Project overview and setup
- **docker-compose.yml** - Docker configuration
- **server/.env.example** - Environment variable template
- **Vercel AI SDK Docs** - https://sdk.vercel.ai/docs
- **Google AI SDK** - https://ai.google.dev

---

## Quick Reference

### File Locations

| Purpose | Location |
|---------|----------|
| Main server | `server/server.js` |
| Router agent | `server/agents/router.js` |
| All agents | `server/agents/*.js` |
| All tools | `server/tools/*.js` |
| All prompts | `server/prompts/*.js` |
| Session storage | `server/storage/sessionStore.js` |
| Client app | `client/src/App.jsx` |
| Vite config | `client/vite.config.js` |
| Docker config | `docker-compose.yml` |

### Common Commands

```bash
# Development
cd server && npm start
cd client && npm run dev

# Docker
docker compose up --build
docker compose logs -f

# Build
cd client && npm run build
```

---

**Last Updated**: 2025-01-26
**Maintainer**: See README.md for project maintainers
