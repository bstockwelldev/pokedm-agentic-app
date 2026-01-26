# Local Setup Guide - PokeDM Agentic Flow

## Current Status

✅ **Server**: Running on http://localhost:3001  
✅ **Client**: Running on http://localhost:5173

## Quick Start

### 1. Server Setup

The server is already running. If you need to restart it:

```bash
cd server
npm start
```

### 2. Client Setup

The client is already running. If you need to restart it:

```bash
cd client
npm run dev
```

### 3. Environment Configuration

**Important**: You need to set your AI Gateway API key in `server/.env`:

```env
AI_GATEWAY_API_KEY=your-actual-api-key-here
LLM_MODEL=openai/gpt-4o
PORT=3001
SESSIONS_DIR=./sessions
```

Get your AI Gateway API key from: https://vercel.com/docs/ai-gateway

### 4. Access the Application

- **Client UI**: http://localhost:5173
- **Server API**: http://localhost:3001

## Testing the System

### Test Narration (DM Agent)
```
"Start a new Pokémon adventure in a brand new region"
```

### Test Lore Lookup (Lore Agent)
```
"Tell me about Pikachu's stats and abilities"
```

### Test Custom Pokémon Creation (Design Agent)
```
"Create a Fire-type regional variant of Diglett called Embermole"
```

### Test State Query (State Agent)
```
"What's in my inventory?"
```

### Test Battle Mechanics (Rules Agent)
```
"Calculate type effectiveness: Fire vs Water"
```

## Troubleshooting

### Server Issues

1. **Port 3001 already in use**: Change `PORT` in `server/.env`
2. **Missing dependencies**: Run `cd server && npm install`
3. **API key errors**: Verify `AI_GATEWAY_API_KEY` is set correctly

### Client Issues

1. **Port conflicts**: Vite will auto-select another port if 5173 is in use
2. **API connection errors**: Verify server is running on port 3001
3. **Proxy errors**: Check `vite.config.js` proxy target matches server port

### Common Errors

- **"AI_GATEWAY_API_KEY not set"**: Set the key in `server/.env`
- **"Session not found"**: Sessions are created automatically on first request
- **"Tool execution failed"**: Check network connection and API key validity

## File Locations

- **Sessions**: `server/sessions/*.json` (created automatically)
- **Server logs**: Check terminal running `npm start`
- **Client logs**: Check browser console (F12)

## Next Steps

1. Set your `AI_GATEWAY_API_KEY` in `server/.env`
2. Open http://localhost:5173 in your browser
3. Start chatting with the PokeDM system!
