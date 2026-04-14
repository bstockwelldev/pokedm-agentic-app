# Agentic Flow React App Template

This project demonstrates how to convert a **CustomGPT** (a set of custom
instructions, tools and context) into an **agentic flow** using Vercel's AI
SDK.  It consists of a minimal Express backend that exposes an agentic
endpoint and a React frontend that interacts with it.  The architecture is
model‑agnostic—switching between providers such as OpenAI, Anthropic or xAI
requires changing a single model string in the configuration.

## Features

* **Provider agnostic** – Models are specified in the `provider/model` format
  (`openai/gpt-4o`, `anthropic/claude-opus-4.5`, etc.), allowing you to test
  different providers without changing application code.
* **Agentic loop** – The backend uses the AI SDK’s built‑in loop control to
  repeatedly call the language model and any registered tools until a
  stopping condition is met.
* **Tool support** – Tools extend the model’s capabilities beyond text
  generation. PokeDM includes specialized agents (DM, Router, Lore, Rules, Design)
  with domain-specific tools for campaign management, session state, and encounters.
* **Configurable** – Set a default model and API key in the `.env` file.
* **Interactive React client** – A small chat UI lets you select the model,
  adjust the maximum number of reasoning steps, and view the agent’s
  intermediate steps and final answer.

## Getting started

### Quick setup (recommended)

Run the automated setup script to install dependencies and configure the project:

**On Windows (PowerShell):**
```powershell
.\setup.ps1
```

**On Linux/macOS or Windows (Git Bash):**
```bash
chmod +x setup.sh
./setup.sh
```

The script will:
- Check for Node.js and npm
- Install server dependencies
- Copy `.env.example` to `.env` (if it doesn't exist)
- Install client dependencies

After running the script, edit `server/.env` to set your `AI_GATEWAY_API_KEY`, then proceed to the "Running the app" section below.

### Manual setup

1. **Clone this repository** (or copy the `agentic-app` directory into your
   project).
2. Navigate into the `server` folder and install dependencies:

   ```bash
   cd agentic-app/server
   npm install
   cp .env.example .env
   # edit .env to set your AI Gateway API key and default model
   ```

3. In a separate terminal, set up the client:

   ```bash
   cd agentic-app/client
   npm install
   ```

### Running the app

**Local dev:** Start the API before the client. The Vite app proxies `/api` to `http://localhost:3001`. If nothing is listening there, you will see Vite proxy errors such as `ECONNREFUSED` on `/api/models`. Confirm the API is up with:

```bash
curl http://localhost:3001/api/health
```

**Option A — one terminal (from repo root):**

```bash
npm install
npm run dev
```

This runs the Express server and `vite` together via `concurrently`.

**Option B — two terminals:**

1. Start the Express server first:

   ```bash
   cd server
   npm start
   ```

   The server listens on port `3001` by default and exposes `GET /api/models`, `POST /api/agent`, and other routes under `/api`.

2. Start the React client:

   ```bash
   cd client
   npm run dev
   ```

   The React app runs on `http://localhost:3000` and proxies API requests to the backend. Ensure `server/.env` allows your browser origin (defaults include `http://localhost:3000`; see `ALLOWED_ORIGINS` in `server/.env.example`).

3. Open `http://localhost:3000`. Choose a model and send a message.

## AI SDK and the client

Inference uses the **Vercel AI SDK** (`ai`, `@ai-sdk/google`, `@ai-sdk/groq`) on the **Express server** only. The React app talks to `GET /api/models` and `POST /api/agent` over HTTP (Vite proxy in dev). **Token streaming** and **`useChat`** from `@ai-sdk/react` are not implemented; add a streaming route and wire the UI if you need streamed output.

## Extending the agent

* **Add tools** – Each agent (DM, Router, Lore, Rules, Design) defines its own tools.
  Edit `server/agents/<agent>.js` to add new capabilities. Describe each tool clearly
  in the Vercel AI SDK `tool()` call so the model knows when to invoke it.
* **Change the model** – Set `LLM_MODEL` in your `.env` file to a different
  provider/model string.  You can also pass a `model` field from the
  frontend; see the `model` dropdown in `src/App.jsx`.
* **Adjust reasoning depth** – Modify the `maxSteps` parameter in the
  frontend or pass a `maxSteps` number to the backend.  The AI SDK stops the
  agent when it returns a plain text response or the step limit is reached.

## Deployment

### Vercel Deployment

The application is configured for deployment on Vercel:

1. **GitHub Repository**: https://github.com/bstockwelldev/pokedm-agentic-app
2. **Production URL**: Check Vercel dashboard for the latest production URL

### Environment Variables

Configure these in your Vercel project settings:

- `GOOGLE_GENERATIVE_AI_API_KEY` - Your Gemini API key (required)
- `GEMINI_API_KEY` - Backward compatibility (optional)
- `LLM_MODEL` - Default model (defaults to `gemini-1.5-pro-latest`)

### Deploying

Using Vercel CLI:

```bash
# Link project (first time)
vercel link

# Deploy to preview
vercel deploy

# Deploy to production
vercel deploy --prod
```

Or connect your GitHub repository in the Vercel dashb