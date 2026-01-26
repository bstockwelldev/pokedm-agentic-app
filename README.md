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
  different providers without changing application code【596733973778738†L1552-L1562】.
* **Agentic loop** – The backend uses the AI SDK’s built‑in loop control to
  repeatedly call the language model and any registered tools until a
  stopping condition is met【261109857611989†L398-L409】.
* **Tool support** – Tools extend the model’s capabilities beyond text
  generation【261109857611989†L361-L369】.  This template includes simple
  `echo` and `timestamp` tools.  You can add your own functions by editing
  `server.js`.
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

1. Start the Express server (in one terminal):

   ```bash
   cd server
   npm start
   ```

   The server listens on port `3001` by default and exposes `POST /api/chat`.

2. Start the React client (in another terminal):

   ```bash
   cd client
   npm run dev
   ```

   The React app will run on `http://localhost:3000` and proxy API requests
   to the backend.

3. Open your browser to `http://localhost:3000`.  Type a message, choose a
   model, optionally set the maximum number of reasoning steps, and click
   **Send**.  The agent’s reasoning steps and final answer will appear in
   the conversation.

## Extending the agent

* **Add tools** – Open `server/server.js` and modify the `buildTools()` function.
  Describe each tool clearly so the model knows when to call it【261109857611989†L361-L369】.  You can
  define as many tools as needed; they simply return JSON objects.
* **Change the model** – Set `LLM_MODEL` in your `.env` file to a different
  provider/model string.  You can also pass a `model` field from the
  frontend; see the `model` dropdown in `src/App.jsx`.
* **Adjust reasoning depth** – Modify the `maxSteps` parameter in the
  frontend or pass a `maxSteps` number to the backend.  The AI SDK stops the
  agent when it returns a plain text response or the step limit is reached
  【261109857611989†L398-L409】.

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

Or connect your GitHub repository in the Vercel dashboard for automatic deployments on push.

### Session Storage Note

In Vercel serverless functions, file-based session storage is ephemeral. For production, consider:
- Vercel KV (Redis) for persistent storage
- External database (Supabase, etc.)
- Or document that sessions are temporary in serverless environment

## Notes

* This template uses an Express server for clarity.  In production on Vercel
  you can replace it with a Serverless Function or a Next.js API route.  The
  AI SDK works the same in both contexts.
* The agent returns intermediate steps and a final answer in JSON.  You can
  adapt the API to stream responses for a better user experience.
* For an even richer chat UI, consider using the `@ai-sdk/react` hooks such
  as `useChat` from the AI SDK UI package.  See the official examples for
  more details.