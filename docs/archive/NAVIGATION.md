# Quick Navigation Guide

## 🚀 Quick Start
- **Setup**: Run `setup.sh` or `setup.ps1`
- **Local Dev**: `cd server && npm start` + `cd client && npm run dev`
- **Docker**: `docker compose up --build`
- **Docs**: See `AGENTS.md` for full documentation

## 📁 Key Files

### Entry Points
- `server/server.js` - Express server (port 3001)
- `client/src/App.jsx` - React UI (port 3000)
- `docker-compose.yml` - Docker services

### Agents (server/agents/)
- `router.js` - Routes user intent → specialized agent
- `dm.js` - Dungeon Master / narrative agent
- `rules.js` - Game rules / dice rolls agent
- `state.js` - Session state queries agent
- `lore.js` - Pokemon lore / knowledge agent
- `design.js` - Custom Pokemon creation agent

### Tools (server/tools/)
- `pokemon.js` - Pokemon data tools
- `custom-pokemon.js` - Custom Pokemon creation
- `moves.js`, `abilities.js`, `types.js` - Game data
- `index.js` - Tool exports

### Configuration
- `server/.env` - Environment variables (create from `.env.example`)
- `server/config/agentConfig.js` - Agent settings
- `client/vite.config.js` - Vite proxy config

### Storage
- `server/storage/sessionStore.js` - Session persistence
- `server/storage/canonCache.js` - Data cache

## 🔍 Finding Things

**Want to add a new agent?**
→ Create `server/agents/myAgent.js` + `server/prompts/myAgent.js` + update router

**Want to add a new tool?**
→ Create `server/tools/myTool.js` + export from `server/tools/index.js`

**Want to modify the UI?**
→ Edit `client/src/App.jsx`

**Want to change API endpoint?**
→ Edit `server/server.js` + `client/vite.config.js` (proxy)

**Want to debug agent behavior?**
→ Check `server/agents/router.js` for routing logic
→ Check `server/prompts/*.js` for prompt templates
→ Check server logs for execution flow

## 📚 Full Documentation
See `AGENTS.md` for complete architecture, patterns, and guidelines.
