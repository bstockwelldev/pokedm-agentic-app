# PokeDM Agentic App — UI/UX Redesign PRD
**Repo-Aligned with Enhancements**

**Doc Owner:** Brandon  
**Repo:** `customgpt-to-app-flow/agentic-app`  
**Status:** Draft  
**Last Updated:** 2026-01-27  
**Version:** 1.1 (Enhanced)

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Problem Statement](#2-problem-statement)
3. [Goals / Non-Goals](#3-goals--non-goals)
4. [Target Users](#4-target-users)
5. [UX Principles](#5-ux-principles)
6. [Information Architecture](#6-information-architecture-vite--react)
7. [Core User Flows](#7-core-user-flows)
8. [UI Requirements & Style Guide](#8-ui-requirements--style-guide)
9. [Technical Requirements](#9-technical-requirements)
10. [Phased Delivery Plan](#10-phased-delivery-plan-aligned-with-repo)
11. [Definition of Done](#11-definition-of-done)
12. [Open Questions](#12-open-questions)
13. [Appendix: Current Repository Context](#13-appendix-current-repository-context)
14. [Enhancements & Recommendations](#14-enhancements--recommendations)

---

## 1) Purpose

The current PokeDM codebase consists of a simple Express backend and a Vite-powered React frontend. The frontend is a single `App.jsx` file with inline styles and minimal structure, and the backend exposes a `/api/agent` endpoint. The application successfully handles narration and choice prompts, displays a basic session state sidebar, and lets the user choose the underlying model, but the UI is rudimentary.

This PRD defines how to evolve the prototype into a polished, modern interface without changing the agentic logic.

---

## 2) Problem Statement

### Current State Issues

1. **Flat design and inline styles**: The existing UI uses inline style objects with no global design tokens or component system. There is no consistent color palette, type scale, or spacing rhythm.

2. **Unstructured layout**: The chat area and session state are laid out using basic CSS Grid without clear hierarchy; there is no dedicated header or footer.

3. **Error handling and agent visibility**: Errors are appended as regular chat messages in the conversation stream. There is no error banner or diagnostics drawer, and tool runs or intermediate steps are not visible.

4. **Session state sidebar**: Although a session sidebar exists, it only shows location, party count, battle status, and custom Pokémon count. It is not structured as a dashboard and cannot be collapsed or expanded.

5. **Vite-only setup**: The project currently uses Vite, not Next.js. There is no routing or code splitting. The code is JavaScript (no TypeScript), and there is no Tailwind or component library.

---

## 3) Goals / Non-Goals

### Goals

1. **Adopt a design system**: Migrate to Tailwind CSS (with shadcn/ui components) and introduce design tokens for colors, typography, spacing, and radii. This will ensure consistency across the app and enable dark-mode styling.

2. **Introduce an App Shell**: Create a structured layout with a top bar (branding, model picker, session controls), a chat timeline, a collapsible right panel (State / Tools / Logs tabs), and a bottom composer. This will replace the single-file `App.jsx` structure and enable responsive behavior.

3. **Enhance the Session State panel**: Turn the sidebar into a first-class dashboard with clearly defined sections (location, party, battle status, inventory/flags, and custom Pokémon) and provide access to the raw JSON state. Make it collapsible and searchable.

4. **Error handling and agent visibility**: Implement a global error boundary and request-level error banners. Provide a diagnostics drawer with request metadata. Visualize tool runs and approvals in a Tools tab.

5. **Message rendering system**: Define message types (user, DM narration, DM dialogue, choices, system, tool run, error). Build reusable message card components for each type. Support structured choices with large, accessible buttons.

6. **Accessibility and responsiveness**: Ensure keyboard navigation, focus rings, and screen-reader labels. Make the layout responsive: the right panel collapses on small screens and the top bar compresses to icons.

### Non-Goals

- Changes to the underlying multi-agent logic or session state schema (the backend is already feature-complete).
- Implementation of persistent cloud storage (beyond the existing session JSON files).
- Full migration to Next.js. The redesign will continue to use Vite, but the file structure will be modular.
- TypeScript migration (deferred to Phase 6 or later).
- Streaming support (deferred to Phase 5 or separate Phase 6).

---

## 4) Target Users

- **Primary**: Parent/adult acting as DM or co-player; children who interact with the TTRPG.
- **Secondary**: Developers/testers debugging the agentic flow and session state.

---

## 5) UX Principles

1. **Clarity and hierarchy**: Use distinct visual layers (top bar, chat area, panels) and a type scale to guide the eye.

2. **Fail-soft design**: Errors should not appear as chat messages; instead, they should surface in non-intrusive banners with retry actions.

3. **Agent transparency**: Intermediate tool executions, approvals, and logs must be visible in their own tab.

4. **Safe defaults**: When presenting choices, highlight the recommended or safest option.

5. **Accessibility**: Keyboard navigation, high contrast, focus indicators, and ARIA labels are mandatory.

6. **Performance**: Optimize for fast initial load and smooth interactions; use code splitting and lazy loading where appropriate.

---

## 6) Information Architecture (Vite + React)

Since the project uses Vite and a single `App.jsx` entry point, the redesign will create a more modular folder structure within `client/src/`:

```
client/
├─ src/
│  ├─ components/
│  │  ├─ AppShell.jsx          # TopBar, ChatTimeline, RightPanel, Composer
│  │  ├─ TopBar.jsx             # Branding, model picker, session controls
│  │  ├─ ChatTimeline.jsx       # Message list with virtualization
│  │  ├─ Composer.jsx           # Input with slash commands, quick actions
│  │  ├─ RightPanel/
│  │  │  ├─ StateTab.jsx        # Structured session state dashboard
│  │  │  ├─ ToolsTab.jsx        # Tool execution list with status
│  │  │  └─ LogsTab.jsx         # Backend steps/logs viewer
│  │  ├─ messages/
│  │  │  ├─ MessageCard.jsx     # Base message component
│  │  │  ├─ UserMessage.jsx     # User message variant
│  │  │  ├─ DmNarration.jsx    # DM narration variant
│  │  │  ├─ DmDialogue.jsx     # DM dialogue variant
│  │  │  ├─ ChoicesMessage.jsx # Choices with buttons
│  │  │  ├─ ToolRunMessage.jsx # Tool execution card
│  │  │  ├─ SystemMessage.jsx   # System notifications
│  │  │  └─ ErrorCard.jsx      # Error message card (deprecated - use ErrorBanner)
│  │  ├─ ErrorBanner.jsx        # Global error banner
│  │  ├─ DiagnosticsDrawer.jsx # Error details drawer
│  │  └─ ExportDrawer.jsx       # Session export drawer
│  ├─ hooks/
│  │  ├─ useSession.js          # Session state and API calls
│  │  └─ useErrorBoundary.js    # Error boundary hook
│  ├─ utils/
│  │  ├─ constants.js           # Design tokens (CSS variables)
│  │  ├─ api.js                 # Fetch wrapper with error handling
│  │  └─ formatters.js          # Date, JSON formatting utilities
│  ├─ styles/
│  │  └─ globals.css            # Tailwind imports + CSS variables
│  └─ App.jsx                   # Imports AppShell and wires state
```

### Layout Structure

- **Top Bar**: Contains branding, environment badge (Dev/Prod), model picker, session identifier (copyable), connection status indicator, and controls (New session, Export). Uses shadcn/ui components (e.g., `Select`, `Badge`, `Button`).

- **Chat Timeline**: Displays message cards of various types. Virtualization can be added later for long sessions. Auto-scrolls to bottom on new messages (toggleable).

- **Right Panel**: A collapsible sidebar with tabs for State, Tools, and Logs. The panel starts open on desktop and collapsed on mobile. Resizable on desktop.

- **Composer**: A multi-line input with slash command hints, send and stop buttons. Quick action chips (Pause, Skip, Hint, Recap, Save) appear below the input.

---

## 7) Core User Flows

### 7.1 Chat & Streaming

1. User types a message in the composer or selects a choice.
2. The app calls `POST /api/agent` with `{ userInput, sessionId, model }`.
3. A loading state appears in the timeline while waiting.
4. Upon success, the narration, intent, and choices are appended as a DM message card.
5. The session state is updated and reflected in the State tab.
6. If streaming is supported (future), the DM message card shows incremental updates and a stop button.

**Acceptance criteria:**
- Loading indicator appears during request
- Streaming progress indicator (when implemented)
- Stop button during streaming (when implemented)
- Timeline auto-scroll behavior can be toggled
- Session state updates automatically

### 7.2 Choice Selection

1. DM message card may contain 2–4 choices.
2. Buttons are large, accessible, and clearly labeled; tooltips show descriptions.
3. Selecting a choice populates the composer with the chosen text but does not send automatically, allowing modifications.
4. The user presses Send to confirm, or modifies and sends.

**Acceptance criteria:**
- Buttons are keyboard navigable (Tab, Enter, Arrow keys)
- Safe default choice is highlighted visually
- Descriptions appear below labels or in tooltips
- Choice selection updates composer without auto-sending

### 7.3 Agent Tool Execution

1. The backend triggers one or more tools.
2. A Tool card appears in the timeline indicating tool name, start time, and status (Running → Awaiting Approval → Done/Failed).
3. The Tools tab lists the same executions; clicking a card reveals details and approval actions if required.
4. If a tool fails, an error banner appears with retry and copy diagnostics options.

**Acceptance criteria:**
- Tools tab lists tool runs chronologically
- Statuses update in real time
- Approvals block continuation until resolved
- Tool details are expandable/collapsible

### 7.4 Error Handling

1. Global errors (e.g., network failure) surface as banners at the top of the chat area.
2. Request-specific errors return as JSON from `/api/agent`; they appear in a non-intrusive banner with details accessible via a diagnostics drawer.
3. Users can retry the last action or copy diagnostic information for support.

**Acceptance criteria:**
- Errors never appear as plain chat messages
- Banners include HTTP status, brief message, and actions
- Diagnostics drawer shows request ID, endpoint, timestamp, and stack trace (if available)
- Retry button re-sends last request with same parameters

### 7.5 Session State Dashboard

1. The State tab displays a summary: location (ID & description), party (trainers and number of Pokémon), battle state (if active, with round), inventory/flags (expandable sections), and custom Pokémon count.
2. Sections can be expanded or collapsed.
3. A button reveals the raw JSON in a scrollable viewer with copy/export options.
4. The panel automatically updates when the backend returns a new session object.

**Acceptance criteria:**
- State tab is useful and readable
- JSON viewer allows search and copy
- The panel is collapsible and resizable
- Inventory and flags sections are visible (even if empty)

---

## 8) UI Requirements & Style Guide

### 8.1 Design System

**Framework**: Continue using Vite + React; adopt Tailwind CSS with shadcn/ui components. Use PostCSS for design tokens. Consider migrating to TypeScript in a later phase, but this PRD assumes JavaScript with JSDoc for type safety.

**Tokens**: Define CSS variables for:
- **Colors**: background, surface, primary, secondary, success, warning, danger, muted
- **Typography**: font families, sizes, weights, line heights
- **Spacing**: 4px grid system
- **Radii**: cards (16px), inputs/buttons (12px), badges (6px)
- **Shadows**: layered elevation system

**Dark mode**: Default theme is dark with neon accents; provide a light theme toggle via CSS variables and `prefers-color-scheme` media query.

**Typography**:
- **UI Font**: Inter or Geist Sans
- **Code/Logs Font**: JetBrains Mono
- **Type Scale**:
  - H1: 32px / 1.2 / 600
  - H2: 24px / 1.3 / 600
  - H3: 20px / 1.4 / 500
  - Body: 16px / 1.5 / 400
  - Caption: 12px / 1.4 / 400

**Colors** (CSS Variables):
```css
:root {
  /* Backgrounds */
  --bg: #0a0e27;           /* Near-black blue */
  --card: #1a1f3a;         /* Dark slate */
  --surface: #252b47;      /* Elevated surface */
  
  /* Text */
  --fg: #f0f0f0;           /* Off-white */
  --muted: #6b7280;        /* Cool gray */
  
  /* Brand */
  --brand: #00d9ff;        /* Electric cyan */
  --brand-hover: #00b8d9;
  
  /* Semantic */
  --success: #10b981;      /* Green */
  --warning: #f59e0b;      /* Amber */
  --danger: #ef4444;       /* Red */
  
  /* Borders */
  --border: #374151;
  --border-light: #4b5563;
}
```

**Components**: Use shadcn/ui for `Button`, `Card`, `Tabs`, `Badge`, `Drawer`, `Select`, `Tooltip`, `Toast`. Compose them with Tailwind utilities.

**Spacing & Shape**: 4px grid; 16px radius for cards; 12px for inputs and buttons; soft layered shadows.

### 8.2 Specific Components

**ErrorBanner**: Sits at the top of the chat area; uses red background with white text; includes a close button and actions (Retry, Copy Diagnostics). Dismissible with auto-dismiss after 10 seconds (optional).

**DiagnosticsDrawer**: A bottom or side sheet that reveals error metadata, with copyable JSON. Includes request ID, timestamp, endpoint, status code, and stack trace (dev only).

**MessageCard**: Accepts props `{ role, content, intent, choices, custom, timestamp }`; determines styling and renders a choice list if present. Base component with variants.

**StateTab**: Receives the session object; renders sections for scene, party, battle, inventory/flags, and custom Pokémon. A "View Raw" button opens a JSON viewer. Sections are collapsible.

**ToolsTab**: Shows a list of active/past tool runs with status chips (Running, Awaiting Approval, Done, Failed). Clicking a tool reveals details, parameters, and results. Approval actions appear inline.

**LogsTab**: Displays the backend's `steps` array or log entries in reverse chronological order. Provide search and filtering by level (info, warn, error). Syntax highlighting for JSON.

**Composer**: Multi-line textarea with placeholder and slash command hints (`/pause`, `/skip`, `/hint`, `/recap`, `/save`); send button; stop button when streaming; quick action chips below input.

### 8.3 Accessibility

- All interactive elements must be reachable via keyboard and expose `aria-label`s.
- Use focus rings (CSS variable `--focus-ring`) on buttons and inputs.
- Contrast ratios should meet WCAG AA guidelines (4.5:1 for text, 3:1 for UI components).
- Tabs and menus must be operable via arrow keys.
- Screen reader announcements for errors and status changes via `aria-live` regions.
- Skip links for keyboard navigation.

### 8.4 Responsive Breakpoints

- **Mobile**: `< 640px` - Stacked layout, bottom sheet for right panel
- **Tablet**: `640px - 1024px` - Stacked layout, collapsible side panel
- **Desktop**: `> 1024px` - Side-by-side layout, resizable panels

---

## 9) Technical Requirements

### Frontend

- Use React 18 with Vite and Tailwind CSS.
- Install shadcn/ui and configure Tailwind to enable dark mode via class.
- Introduce a `client/src/components` folder; convert the monolithic `App.jsx` into smaller components. Use modern React features (hooks) but keep code in JavaScript with JSDoc for type safety.
- Create a `client/src/utils/api.js` helper that wraps `fetch`, handles JSON parsing, and throws typed errors. Centralize model names and base URLs.
- Provide a `client/src/utils/constants.js` file containing design tokens (colors, type scale, radii). Use CSS custom properties in a global stylesheet.
- Add error boundary component for React error handling.

### Backend

- Keep the Express server and session storage unchanged; the endpoint remains at `/api/agent`.
- **Enhancement**: Add error metadata (request ID, timestamp, endpoint) to error responses if not already present.
- Consider adding a streaming API in a later phase; however, this PRD assumes full responses.
- **Enhancement**: Generate `requestId` using `crypto.randomUUID()` for all requests.

### Dependencies

**Add to `client/package.json`**:
```json
{
  "dependencies": {
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-toast": "^1.1.5"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 10) Phased Delivery Plan (Aligned with Repo)

### Phase 0 — Error Handling & Diagnostics

**Goal**: Replace inline error messages with proper error handling infrastructure.

**Tasks**:
1. Implement a global `ErrorBanner` component and integrate it into the existing `App.jsx` to replace inline error messages.
2. Enhance the server to include diagnostic information (`error`, `details`, `requestId`, `endpoint`, `timestamp`) in the JSON response body.
3. Build a `DiagnosticsDrawer` to display these details.
4. Provide a retry button that re-sends the last user input with the same session ID.
5. Add error boundary component for React error catching.

**Deliverable**: Errors are shown as banners with actionable retries; no errors appear in the chat timeline.

**Backend Changes**:
```javascript
// server/server.js - Error handler enhancement
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Server error', 
      details: err.message,
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});
```

---

### Phase 1 — Design System & Layout Foundation

**Goal**: Establish design system and basic layout structure.

**Tasks**:
1. Install Tailwind CSS and shadcn/ui.
2. Create global CSS with design tokens (CSS variables).
3. Refactor `App.jsx` to use an `AppShell` component with `TopBar`, `ChatTimeline`, `Composer`, and a placeholder `RightPanel`.
4. Replace inline styles with Tailwind classes; start with dark mode.
5. Move the model picker, session ID display, and send button into the `TopBar` and `Composer`.

**Deliverable**: Basic layout and design system in place; the app still functions like before but looks consistent.

**File Structure**:
```
client/src/
├─ styles/
│  └─ globals.css        # Tailwind imports + CSS variables
├─ components/
│  ├─ AppShell.jsx       # Main layout wrapper
│  ├─ TopBar.jsx         # Header with controls
│  ├─ ChatTimeline.jsx   # Message list
│  ├─ Composer.jsx       # Input area
│  └─ RightPanel.jsx     # Placeholder sidebar
└─ App.jsx               # Wires components together
```

---

### Phase 2 — Modular Components & Message Types

**Goal**: Build reusable message components and improve message rendering.

**Tasks**:
1. Build `MessageCard` and its variants (`UserMessage`, `DmNarration`, `DmDialogue`, `ChoicesMessage`, `ToolRunMessage`, `SystemMessage`).
2. Replace the message rendering loop in `AppShell` with a `ChatTimeline` that maps messages to the appropriate card component.
3. Introduce a choice button component that highlights safe defaults and is keyboard accessible.
4. Add a `ToolsTab` placeholder in the `RightPanel`; update when a `steps` array is present.

**Deliverable**: Messages are rendered via reusable components; choices appear as stylized buttons.

**Component Structure**:
```
components/messages/
├─ MessageCard.jsx        # Base component
├─ UserMessage.jsx       # User message variant
├─ DmNarration.jsx      # DM narration variant
├─ DmDialogue.jsx       # DM dialogue variant
├─ ChoicesMessage.jsx   # Choices with buttons
├─ ToolRunMessage.jsx    # Tool execution card
└─ SystemMessage.jsx     # System notifications
```

---

### Phase 3 — Enhanced Session State Panel

**Goal**: Transform sidebar into a structured dashboard.

**Tasks**:
1. Convert the current sidebar into a collapsible `RightPanel` with tabs.
2. Implement the `StateTab` to display structured session information.
3. Add a JSON viewer (read-only) with expand/collapse and copy features.
4. Provide search within the session state.
5. Display inventory and flags sections (even if empty).

**Deliverable**: A useful, structured State tab that updates on each response.

**StateTab Sections**:
- **Location**: ID, description, environment details
- **Party**: Trainers, Pokémon count per trainer, party summary
- **Battle State**: Active status, round, participants (if active)
- **Inventory**: Items, key items, consumables (expandable)
- **Flags**: Story flags, quest flags, custom flags (expandable)
- **Custom Pokémon**: Count, list with details, creation history

---

### Phase 4 — Tool & Log Visibility

**Goal**: Make agent tool execution and logs visible to users.

**Tasks**:
1. Build the `ToolsTab` to list tool runs and their statuses.
2. Provide approval actions when the agent requires user confirmation.
3. Create a `LogsTab` that displays the backend's `steps` array or a server log.
4. Integrate these tabs into the `RightPanel`; ensure the panel is resizable and collapsible.
5. Show tool runs in the chat timeline as `ToolRunMessage` components.

**Deliverable**: Users can see when tools run, view logs, and approve or retry tool calls.

**ToolsTab Features**:
- Chronological list of tool executions
- Status indicators (Running, Awaiting Approval, Done, Failed)
- Expandable details (parameters, results, errors)
- Approval actions inline
- Retry failed tools

---

### Phase 5 — Polish & Delight

**Goal**: Add polish, animations, and advanced features.

**Tasks**:
1. Add subtle motion via Framer Motion (e.g., message fade-in, panel transitions) - **optional, evaluate bundle size impact**.
2. Implement skeleton loaders for messages and panels.
3. Add quick action chips in the `Composer` for `/pause`, `/skip`, `/recap`, `/hint`, and `/save`.
4. Support exporting the session transcript and state snapshot via the `ExportDrawer`.
5. Ensure mobile friendliness (collapsible tabs, bottom sheet composer) and refine dark/light themes.
6. Add performance optimizations (code splitting, lazy loading, virtualization for long message lists).

**Deliverable**: The app feels polished and production-ready.

**Performance Targets**:
- Lighthouse score > 90
- Bundle size < 200KB gzipped (with code splitting)
- First Contentful Paint < 1.5s
- Time to Interactive < 3s

---

### Phase 6 — TypeScript Migration (Optional, Future)

**Goal**: Migrate codebase to TypeScript for better type safety.

**Tasks**:
1. Add TypeScript configuration.
2. Migrate components one by one.
3. Add type definitions for API responses and session state.
4. Update build process.

**Deliverable**: Fully typed codebase with improved developer experience.

---

## 11) Definition of Done

A release is considered done when the following are true:

1. ✅ The app uses a design system (Tailwind + shadcn) with documented tokens and dark mode support.
2. ✅ The layout is structured with an `AppShell` (`TopBar`, `ChatTimeline`, `RightPanel`, `Composer`).
3. ✅ Errors are displayed via an `ErrorBanner` with retry and diagnostics; no raw error messages appear in the timeline.
4. ✅ Message types are rendered through reusable components; choices are accessible buttons.
5. ✅ The `RightPanel` contains functional tabs for State, Tools, and Logs; the State tab shows structured information and a JSON viewer.
6. ✅ The UI is responsive and keyboard accessible; focus states and ARIA labels are implemented.
7. ✅ Performance benchmarks are met (Lighthouse > 90, bundle size < 200KB gzipped).
8. ✅ Documentation (this PRD and any follow-up design spec) is updated in the repo for future reference.
9. ✅ All components have JSDoc comments for type safety (or TypeScript definitions if migrated).

---

## 12) Open Questions

### Resolved

1. **TypeScript migration**: Deferred to Phase 6 (post-redesign). Use JSDoc for type safety during JavaScript phase.
2. **Streaming support**: Add in Phase 5 or create separate Phase 6. Current implementation uses full JSON responses.
3. **Inventory & flags**: Display in StateTab Phase 3 as expandable sections, even if empty.
4. **Mobile navigation**: Use bottom sheet drawer (better UX than horizontal scroll).

### Pending

1. **Bundle size trade-offs**: Should we include Framer Motion for animations, or use CSS transitions?
2. **Virtualization**: At what message count should we enable virtualization in ChatTimeline?
3. **Session export format**: JSON only, or also support Markdown/PDF?
4. **Tool approval UI**: Modal dialog or inline expansion?

---

## 13) Appendix: Current Repository Context

### Server

- **Location**: `server/server.js`
- **Endpoint**: `POST /api/agent`
- **Agents**: Multi-agent system (router, dm, rules, state, lore, design)
- **Tools**: Pokémon data, custom Pokémon creation, moves, abilities, types, etc.
- **Storage**: File-based session storage in `server/storage/sessions/`

### Client

- **Location**: `client/src/App.jsx`
- **Framework**: React 18 + Vite
- **Current State**: Single-file component with inline styles
- **API**: Calls `/api/agent` via fetch
- **Session**: Stored in localStorage, passed to backend

### Session State Schema

```javascript
{
  session: {
    session_id: string,
    scene: {
      location_id: string,
      description: string
    },
    battle_state: {
      active: boolean,
      round: number
    },
    inventory: object,      // Future enhancement
    flags: object           // Future enhancement
  },
  characters: Array<{
    character_id: string,
    trainer: { name: string },
    pokemon_party: Array<Pokemon>
  }>,
  custom_dex: {
    pokemon: object         // Custom Pokémon registry
  }
}
```

### Design

- **Current**: Inline styling, basic HTML elements
- **No**: Tailwind, component library, design tokens
- **Session sidebar**: Shows location, party count, battle status, custom Pokémon count

---

## 14) Enhancements & Recommendations

### Backend Enhancements

1. **Error Response Enhancement**:
   ```javascript
   // Add to server/server.js error handler
   res.status(500).json({
     error: 'Server error',
     details: err.message,
     requestId: crypto.randomUUID(),
     timestamp: new Date().toISOString(),
     endpoint: req.path,
     stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
   });
   ```

2. **Request ID Middleware**: Add request ID to all requests for traceability.

### Frontend Enhancements

1. **JSDoc Type Safety**:
   ```javascript
   /**
    * @typedef {Object} Message
    * @property {string} role - 'user' | 'assistant' | 'system'
    * @property {string} content
    * @property {string} [intent]
    * @property {Choice[]} [choices]
    * @property {Date} [timestamp]
    */
   ```

2. **Performance Optimizations**:
   - Code splitting for message components
   - Lazy loading for RightPanel tabs
   - Virtualization for ChatTimeline (when > 100 messages)

3. **Accessibility Checklist**:
   - [ ] All buttons have `aria-label`
   - [ ] Focus rings on interactive elements
   - [ ] Keyboard navigation for tabs (Arrow keys)
   - [ ] Screen reader announcements (`aria-live`)
   - [ ] WCAG AA contrast ratios

### Mobile Responsiveness Strategy

- **Mobile (< 640px)**: Stacked layout, bottom sheet for right panel
- **Tablet (640px - 1024px)**: Stacked layout, collapsible side panel
- **Desktop (> 1024px)**: Side-by-side layout, resizable panels

### Testing Recommendations

- Unit tests for utility functions (`api.js`, `formatters.js`)
- Component tests for message variants
- E2E tests for core user flows (chat, choices, errors)
- Visual regression tests for design system components

---

## References

- **Current Implementation**: `client/src/App.jsx`
- **Server Endpoint**: `server/server.js` → `POST /api/agent`
- **Session Schema**: `server/schemas/session.js`
- **GitHub Repo**: https://github.com/bstockwelldev/pokedm-agentic-app

---

**Document Version**: 1.1 (Enhanced)  
**Last Updated**: 2026-01-27  
**Next Review**: After Phase 0 completion
