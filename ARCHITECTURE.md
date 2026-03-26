# Mission Control — Architecture

## Overview

Mission Control is a Next.js 16.2.1-based agency management application designed to orchestrate virtual AI agents through configurable workflows. The system follows a config-first philosophy where all business logic is stored as editable JSON.

Current practical model:
- the live app manages clients, tasks, outputs, and Iris chat
- the config layer manages skills, pipelines, workflows, tools, and templates
- task execution now supports autonomous multi-agent runs inside the chat request lifecycle
- when a suitable pipeline exists, the task runner executes activities phase by phase and passes outputs between agents
- outputs are rendered in the app as designed HTML artifacts and can still be exported as DOCX, PDF, or XLSX

## Tech Stack

- **Framework**: Next.js 16.2.1 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Animation**: CSS animations, Framer Motion patterns
- **State**: Zustand (localStorage persistence)
- **Icons**: Lucide React
- **AI Providers**: Ollama (local), Google Gemini

## Design System

### Visual Direction: "Command Center Meets Gaming HQ"
- Inspired by Apple Intelligence, Linear, Discord, Notion
- Dark theme with glass morphism effects
- Clean, spacious layouts with personality
- Game-like 2D virtual office workspace
- Smooth micro-animations throughout

### Color Palette
```
Background Base:    #09090b (zinc-950)
Background Card:    #252530 (elevated surface)
Background Panel:   #111115
Border:            #27272a
Border Glow:       #3f3f46
Text Primary:      #fafafa (zinc-50)
Text Secondary:    #a1a1aa (zinc-400)
Text Dim:          #52525b (zinc-600)

Accent Purple:     #a78bfa
Accent Blue:       #60a5fa
Accent Cyan:       #2dd4bf
Accent Green:      #4ade80
Accent Yellow:     #fbbf24
Accent Orange:     #fb923c
Accent Pink:       #f472b6
```

### Typography
- **Headings**: Space Grotesk (bold, 700)
- **Body**: DM Sans (regular, 400)
- **Mono**: JetBrains Mono (code, logs)

### Spacing Scale
- xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px | 2xl: 48px

### Border Radius
- sm: 6px | md: 8px | lg: 12px | xl: 16px | card: 12px

### Animation Timings
- Micro (hover, focus): 150ms ease
- Standard transitions: 200ms ease
- Page transitions: 300ms ease-out
- Staggered reveals: 400ms ease-out

## Agent Roster

| Agent | Role | Division | Workload | Status |
|-------|------|----------|----------|--------|
| **Iris** | Operations Lead | Orchestration | 76% | 🟢 Active |
| **Lyra** | Visual Production Lead | Creative | 65% | 🟢 Active |
| **Piper** | Project & Traffic Manager | Orchestration | 80% | 🟢 Active |
| **Sage** | Client Services Director | Client Services | 55% | 🟢 Active |
| **Maya** | Brand & Campaign Strategist | Client Services | 68% | 🟢 Active |
| **Finn** | Creative Director | Creative | 72% | 🟢 Active |
| **Echo** | Copy & Content Lead | Creative | 63% | 🟢 Active |
| **Nova** | Media Planning Lead | Media | 70% | 🟢 Active |
| **Dex** | Performance & Analytics Lead | Media | 58% | 🟢 Active |
| **Atlas** | Research & Insights Lead | Research | 60% | 🟢 Active |

> **Note**: Agents can be edited via the Agents page — names, roles, and details are editable and persist to localStorage.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                             │
│  (Pages, Components, Layouts)                             │
├─────────────────────────────────────────────────────────────┤
│                      State Layer                           │
│  (Zustand Stores: agents-store, analytics-store)          │
├─────────────────────────────────────────────────────────────┤
│                      Config Layer                          │
│  (TypeScript templates: agent-templates.ts)                │
│  (JSON configs: pipelines/*.json, skills/*.json)          │
├─────────────────────────────────────────────────────────────┤
│                    Integration Layer                        │
│  (OAuth: Google Docs/Sheets/Ads, Meta Ads)               │
│  (AI: Ollama, Gemini)                                     │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Files

### Core Configs

| File/Directory | Purpose |
|----------------|---------|
| `src/lib/agent-templates.ts` | Agent definitions (DEFAULT_AGENTS array) |
| `src/config/agents/*.json` | Individual agent configs (backup/reference) |
| `src/config/pipelines/*.json` | Individual pipeline configs |
| `src/config/skills/*.json` | Individual skill files (~140 skills) |
| `src/config/tools/tools-config.json` | Tool registry |

## Page Structure

| Route | Purpose |
|-------|---------|
| `/dashboard` | Main command center with agency stats, agent strip, activity feed |
| `/office` | Minimal virtual office workspace with seated active agents and roaming idle agents |
| `/agents` | Agent roster with edit modal |
| `/clients` | Client management |
| `/tasks` | Task list and mission tracking |
| `/pipeline` | Pipeline templates browser |
| `/pipeline/[id]` | Pipeline editor |
| `/pipeline/run` | Pipeline execution runner |
| `/skills` | Skills library browser |
| `/skills/[id]` | Individual skill editor |
| `/analytics` | Analytics dashboards |
| `/outputs` | Saved deliverables |
| `/settings` | App settings with OAuth integrations |
| `/settings/integrations` | OAuth integrations (Google, Meta) |
| `/config` | JSON config editor |

## Virtual Office

The `/office` page now uses a lighter minimalist workspace inspired by isometric office layouts rather than the older game-map treatment.

### Features
- Top-down 2D floor-map layout with a simplified, calmer floor-plan treatment inspired by retro office maps
- Division rooms for Orchestration, Client Services, Creative, Media, and Research
- Active and paused agents sit inside their assigned rooms
- Idle agents roam through the central hall using smoother looping motion paths instead of stepped pixel movement
- Clicking a room focuses that division and shows its roster
- Clicking an agent opens a live detail panel for that person
- Uses the shared avatar renderer, so uploaded agent photos appear automatically in the office
- Office avatars use a frameless variant so uploaded PNG portraits sit directly on the map without rounded card containers
- The room roster/detail panel lives in a dedicated right-side rail so it does not cover the main floor
- Rooms show only division names and counts, not descriptive subtitles
- Furniture and decor are rendered as simple desks, chairs, lounge seating, and plants to keep the map readable without feeling empty
- The office map is arranged around a calmer central commons so the floor reads more like a natural top-view studio plan than a floating widget layout

### Room Configuration
Each room has:
- Position coordinates (x, y, width, height)
- Division color for visual identification
- Agent avatars placed within
- Agent count indicator

## State Management

### Agents Store (`agents-store.ts`)
Manages:
- `agents[]` - All 10 agency agents (loaded from DEFAULT_AGENTS)
- `missions[]` - Active tasks/projects
- `clients[]` - Client profiles
- `conversations[]` - Chat history with Iris
- `providerSettings` - Ollama/Gemini configuration
- `agencySettings` - Theme, defaults
- `artifacts[]` - Saved output registry
- execution metadata on tasks:
  - `leadAgentId`
  - `collaboratorAgentIds`
  - `pipelineId`
  - `pipelineName`
  - `qualityChecklist`
  - `handoffNotes`

Persistence: Zustand with localStorage (persists agents, missions, clients, etc.)

Artifact compatibility notes:

- Older artifact records are normalized on hydration so the Outputs screen can safely render mixed legacy/current data
- Missing artifact fields now default to:
  - `deliverableType: client-brief`
  - `status: draft`
  - `format: html`
- Older `executionPrompt` values are folded into `sourcePrompt` during hydration
- This prevents the Outputs route from crashing when shared state contains artifacts created before the current output schema

### Shared Persistence (Supabase Migration In Progress)

The app now uses a hybrid shared persistence model.

- Local Zustand persistence still exists as a browser fallback/cache
- Shared runtime state is exposed through `src/app/api/state/route.ts`
- Server-side Supabase access is wrapped in:
  - `src/lib/supabase/config.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/app-state.ts`
  - `src/lib/supabase/relational-sync.ts`
- The bridge migration stores the full agency snapshot in `mission_control_state`
- The bridge SQL migration lives at `supabase/migrations/20260325_create_mission_control_state.sql`
- `ClientShell` now:
  - hydrates the app from `/api/state` on load
  - sends bearer-authenticated sync writes back to `/api/state`
  - sets `appStateReady` so direct links wait for shared state hydration

### Relational Supabase Schema (Now Started)

The proper relational schema migration now exists at:

- `supabase/migrations/20260325_create_mission_control_relational_core.sql`

This migration introduces first-class tables for:

- `agencies`
- `agents`
- `clients`
- `skills`
- `agent_skill_links`
- `pipelines`
- `tasks`
- `task_assignments`
- `task_runs`
- `outputs`
- `conversations`
- `messages`
- `workflow_instances`
- `knowledge_assets`
- `profiles`

It also creates storage buckets for:

- `agent-avatars`
- `knowledge-docs`
- `task-exports`
- `creative-assets`

Important status note:

- Snapshot saves still exist as a bridge, but runtime reads for core entities now come from relational tables first
- Snapshot saves also write through to the relational Supabase tables
- Core entities currently synced from runtime state:
  - `agents`
  - `clients`
  - `tasks`
  - `task_assignments`
  - `outputs`
  - `conversations`
  - `messages`
  - `knowledge_assets`
- Agency-wide settings still bridge through `agencies.settings` / snapshot merge:
  - `agencySettings`
  - `providerSettings`
  - `campaigns`
  - `activities`
  - `agentMemories`
- `skills` and `pipelines` are now database-backed catalogs for both editor reads/writes and server-side runtime loading
- Config JSON remains seed/fallback content only when the database tables are empty

### Auth And Access

- Authentication now uses Supabase Auth as the app entry gate
- Browser session management uses `src/lib/supabase/browser.ts`
- `src/components/auth/SessionGate.tsx` blocks the app when no Supabase session exists and redirects unauthenticated users to `/login`
- `src/app/login/page.tsx` performs a **hard post-login redirect** to `/dashboard?refresh=...` so successful sign-in always loads a fresh document instead of relying on a potentially stale client bundle after rebuilds
- `src/app/api/auth/session/route.ts` verifies the Supabase access token and upserts a `profiles` row
- `moeadas@yahoo.com` is elevated to `super_admin`
- `/api/state`, `/api/skills`, and `/api/pipelines` all require a bearer token
- Admin-only route prefixes are:
  - `/settings`
  - `/config`
  - `/skills`
  - `/pipeline`
  - `/users`
- The sidebar hides those admin surfaces for non-admin users
- `/api/state` applies ownership filtering for non-admin users and preserves global configuration on scoped saves
- Ownership fields are being added to:
  - `clients.ownerUserId`
  - `missions.ownerUserId`
  - `artifacts.ownerUserId`
  - `conversations.ownerUserId`
- Non-admin users only receive their own clients/tasks/outputs/conversations from the shared state API
- Non-admin saves only update their owned records; shared/global state is preserved server-side
- `currentUser` is now tracked in the client store so new clients, tasks, outputs, and conversations inherit the authenticated owner id by default

### Admin User Management

- Super admin now has a dedicated `/users` page
- Admin APIs:
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `PATCH /api/admin/users`
  - `POST /api/admin/backfill-ownership`
  - `POST /api/admin/assignments`
- The Users page can:
  - inspect workspace users and roles
  - create direct users with a temporary password
  - send Supabase email invites
  - change user role between `member` and `super_admin`
  - activate or suspend users
  - backfill legacy unowned records to the super admin
  - reassign client ownership
  - reassign task ownership
- Client/task reassignment cascades ownership to related outputs and conversations in Supabase
- `resolveAuthContextFromToken` now resolves role and active state from `profiles`, while reserving `moeadas@yahoo.com` as `super_admin`

### Shared State Readiness

- `ClientShell` loads shared state from `/api/state` on startup
- `appStateReady` is used by task/detail pages so direct URLs do not treat “state still hydrating” as “record not found”
- Persisted missions are normalized on hydration so older tasks missing newer fields like `assignedAgentIds` or `leadAgentId` can still open safely

### Supabase Environment

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

Current behavior:

- If those values are missing, the app falls back to browser-local persistence only
- Settings now shows whether shared persistence is connected or not configured
- Once connected, newly created tasks and other persisted agency state are written back through `/api/state` and can be seen across browsers

### Task Deletion

- Tasks can now be deleted from both the task list and the single task detail page
- Deleting a task also removes any artifacts linked to that task
- Store logic lives in `src/lib/agents-store.ts` via `deleteMission`

### Analytics Store
Manages:
- Campaign metrics
- Agent performance
- Learned patterns
- A/B tests

## Skills System

Skills are now stored in Supabase and edited through authenticated API routes:

- `GET /api/skills`
- `POST /api/skills`
- `GET /api/skills/[id]`
- `PUT /api/skills/[id]`
- `DELETE /api/skills/[id]`

The client-side skill library is backed by `src/lib/stores/skills-store.ts`, which loads from Supabase with the current bearer token. The JSON config under `src/config/skills` now acts as seed/fallback content only.

### Skill Schema
Each skill row follows:
```typescript
interface Skill {
  id: string           // kebab-case unique ID
  name: string         // Display name
  description: string  // Third-person description
  category: string     // strategy|creative|media|research|operations|client-services|content
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  freedom: 'high' | 'medium' | 'low'
  prompts: {
    en: { trigger, context, instructions, output_template }
    ar?: { ... }
  }
  variables: Array<{ name, type, required, description }>
  workflow?: { steps: Array<{ step, name, action, verify }> }
  examples?: Array<{ input, output }>
  checklist: string[]
  tools?: string[]
  agents?: string[]
  pipelines?: string[]
  metadata: { version, author, tags, lastUpdated }
}
```

### Categories
1. **Strategy & Planning** - Brand strategy, campaign planning
2. **Creative & Copy** - Visual production, copywriting
3. **Media & Advertising** - Media planning, ad creative
4. **Research & Analytics** - SEO, competitive analysis
5. **Operations & Workflow** - Project management, coordination
6. **Client Services** - Account management, briefings
7. **Content Production** - Content calendars, social media

## Pipeline System

### Core Pipelines
1. **Content Calendar** - 30-day social content planning
2. **Campaign Brief** - Full campaign strategy
3. **Ad Creative** - Advertising production
4. **SEO Audit** - Technical SEO analysis
5. **Competitor Research** - Market intelligence
6. **Media Plan** - Media strategy
7. **Strategy Brief** - Brand and messaging strategy development
8. **Client Brief** - Agency-ready intake and strategic framing

### Pipeline Structure
```typescript
interface Pipeline {
  id: string
  name: string
  description: string
  phases: Phase[]
  isDefault: boolean
  estimatedDuration: string
  clientProfileFields: Field[]
}
```

## OAuth Integrations

### Google (Docs, Sheets, Ads)
- Route: `/api/auth/google`
- Scopes: documents, spreadsheets, drive, adwords

### Meta (Facebook/Instagram Ads)
- Route: `/api/auth/meta`
- Scopes: ads_management, ads_read, pages_read_engagement

### Settings Page
OAuth connections shown in Settings with connect/disconnect buttons and status badges.

## AI Integration

### Providers
- **Ollama** - Local AI (default: `minimax-m2.7:cloud`)
- **Gemini** - Google Cloud AI

### Chat API
- Endpoint: `POST /api/chat`
- Features:
  - client-context injection
  - deliverable inference
  - agent routing
  - pipeline inference
  - execution-plan generation
  - autonomous multi-agent execution
  - pipeline phase execution with role-to-agent mapping
  - skill-aware prompts per assigned agent
  - HTML artifact rendering payloads
  - no-hallucination output rules
- Iris is the default chat interface

### Current Task Execution Logic

When a user gives Iris a task:
1. the client task is created immediately in the main store
2. the API infers:
   - deliverable type
   - lead agent
   - collaborator agents
   - optional pipeline hint
   - quality checklist
3. if a suitable pipeline exists, the autonomous runner executes pipeline phases in order:
   - each activity is mapped to the best-fit agent by role
   - that agent receives its assigned skills and tools in prompt context
   - activity outputs are stored and passed forward as handoff context
4. if no pipeline exists, collaborator agents produce specialist handoffs and the lead agent assembles the deliverable
5. the lead agent generates the actual deliverable, not a status note
6. the output is transformed into designed HTML for in-app viewing and saved as an artifact tied to that task
7. the task page shows:
   - request
   - visible output
   - execution prompt
   - team assignment
   - execution steps
   - quality steps
   - exports

If the final lead-model pass returns no visible output:
- the server synthesizes a fallback deliverable from pipeline outputs and execution steps
- this guarantees the task still has a visible draft in the app

### How The Autonomous Runner Works

Main file:
- `src/lib/server/autonomous-task.ts`

Execution flow:
1. build a client profile map from the client brief context
2. select a matching pipeline when available
3. iterate each pipeline activity in sequence
4. map the activity role to a real agent
5. inject that agent's assigned skills and tools into the prompt
6. save the activity output into the pipeline output register
7. pass prior outputs into later phase prompts as handoff context
8. run the lead agent for final assembly
9. append a quality-control step from Iris

The execution trace is stored on the artifact as `executionSteps`, which powers the autonomous execution panels in Tasks and Outputs.

### HTML Output Logic

Main files:
- `src/lib/output-html.ts`
- `src/components/outputs/ArtifactOutputView.tsx`

How it works:
- the model is instructed to return structured content using `#` and `##` headings
- the server converts markdown-like structure into semantic HTML (`h1`, `h2`, `h3`, `p`, `ul`, `table`)
- the artifact stores both the source content and the rendered HTML
- task and output pages render the HTML view by default
- export services convert HTML back to plain text as needed for DOCX/PDF/XLSX generation

## Component Library

### Core Components
- `AgentBot` / `RobotFace` - Agent avatar with status indicator (SVG robot faces)
- `Badge` - Status/category badges
- `Button` - Primary/secondary/ghost variants
- `Card` - Container with shadow, hover lift effect
- `Input` / `Select` / `Textarea` - Form controls
- `Modal` - Overlay dialogs
- `Toast` - Notifications

### Layout Components
- `ClientShell` - Main app wrapper
- `Sidebar` - Navigation sidebar (collapsible)
- `TopBar` - Header with actions
- `IrisChat` - Floating chat widget

### Dashboard Components
- `MetricsCards` - Stats display with clean card design
- `AgentStrip` - Horizontal agent list
- `ActivityFeed` - Recent activity with timestamps
- `MissionQueue` - Active tasks

### Office Components
- `OfficeFloor` - Minimal platform-based office renderer
  - division platforms with soft layered surfaces
  - seated desk occupancy for active agents
  - roaming commons paths for idle agents
  - room roster and selected-agent detail panel

## Key Libraries

| Library | Purpose |
|---------|---------|
| `skill-schema.ts` | Skill TypeScript interfaces |
| `pipeline-execution.ts` | Pipeline routing engine |
| `skill-import.ts` | Import skills from markdown |
| `server/ai.ts` | AI text generation |
| `server/autonomous-task.ts` | Autonomous task runner and phase-by-phase agent execution |
| `output-html.ts` | HTML rendering helpers for in-app outputs |
| `providers.ts` | AI model definitions |
| `agents-store.ts` | Zustand store with persistence |

## Design Patterns

### Current Gaps To Keep In Mind

- Multiple config systems now coexist:
  - TypeScript agent templates
  - JSON agent role configs
  - JSON pipeline configs
  - JSON workflow configs
  This gives flexibility, but it also means contributor changes should be made carefully to avoid drift.

- Autonomous execution currently runs inside the request lifecycle, not as a detached background worker queue.
- That means long multi-phase tasks are slower but still synchronous from the user’s point of view.
- A future upgrade path would move `autonomous-task.ts` into persisted background jobs with resumable runs and real pause/cancel checkpoints.

### Card Design
- No accent stripes or gradients at top
- Clean border with subtle glow on hover
- Hover lift animation (translate-y)
- Strong shadow for depth

### Glass Morphism
```css
background: rgba(24, 24, 27, 0.8);
backdrop-filter: blur(12px);
border: 1px solid rgba(63, 63, 70, 0.5);
```

### Glow Effects
```css
box-shadow: 0 0 20px rgba(155, 109, 255, 0.3);
```

### Staggered Animations
```css
animation: fadeInUp 400ms ease-out forwards;
animation-delay: calc(var(--i) * 100ms);
```

## Agent Edit System

Agents are editable via the `/agents` page:
- Click any agent card to open edit modal
- Editable fields: name, role, bio, specialty, prompts, tools, skills, and personal photo
- Changes now flow through shared app state and are written into Supabase-backed tables
- Agent positions and statuses are also editable
- All UI components react to changes in real-time

### Agent Photo Logic

- `Agent.photoUrl` now stores a shared public path like `/uploads/agents/<file>`
- The shared avatar component is `src/components/agents/AgentBot.tsx`
- If `photoUrl` exists, the personal image is shown everywhere the agent appears
- If `photoUrl` is missing or fails to load, the app falls back to the default robot icon
- Photo upload and reset controls live in `src/components/agents/AgentEditor.tsx`
- The upload control uses a dedicated button wired to a visually hidden file input via `ref`, which is more reliable than styling the file input directly
- Uploaded avatar files are written to `public/uploads/agents`
- The shared server-side avatar map is stored in `data/agent-photos.json`
- `GET /api/agent-photos` hydrates avatar URLs into the client store on app load, so avatars are shared across browsers instead of being tied to one browser's localStorage
- `POST /api/agent-photos/upload` saves the uploaded image file, updates the shared avatar map immediately, syncs the `agents.photo_url` column in Supabase, and returns the shared public URL
- `PUT /api/agent-photos/[id]` persists the selected avatar URL for a specific agent and syncs that value into Supabase
- `GET /api/agent-photos/file/[filename]` serves uploaded agent images dynamically from the local uploads folder so newly uploaded avatars work immediately without requiring a server restart
- The agent editor also updates the in-memory agent record immediately after upload so the new portrait appears before the modal is closed
- The agent editor now blocks Save while an avatar upload is still in progress, which prevents a just-selected image from being overwritten by an early save
- The editor header and preview both now use the just-uploaded image instead of the older stored avatar, so the user sees the selected portrait immediately
- Saving the agent now triggers an immediate authenticated `/api/state` sync so the new avatar becomes visible across browsers without waiting for the normal debounced persistence loop
- The last root-cause fix was replacing fragile `/uploads/agents/...` static URLs with dynamic `/api/agent-photos/file/...` URLs, because fresh runtime uploads were being written correctly but were not always served immediately by the production server
- Large avatar uploads are compressed client-side before upload so oversized images do not silently fail
- `next.config.mjs` now pins both `turbopack.root` and `outputFileTracingRoot` to this project so uploaded files under `public/uploads` are actually served correctly

### Cache / Refresh Behavior

- HTML responses are now served with `Cache-Control: no-store` via `next.config.mjs` so page shells pick up the latest build more reliably
- The top bar includes a hard refresh control that clears browser cache storage when possible and reloads the current URL with a cache-busting query string
- Static hashed Next assets still use their normal immutable caching behavior

## Editor Theme System

Pipeline and skill editing surfaces now use a shared editor theme layer from `src/styles/globals.css`.

### Shared Editor Tokens
- `.editor-theme` sets the overall surface and text colors
- `.editor-panel` and `.editor-panel-muted` provide card/container styles
- `.editor-input`, `.editor-textarea`, and `.editor-select` standardize field appearance
- `.editor-button-primary` and `.editor-button-secondary` standardize action buttons
- `.editor-tab` and `.editor-tab-active` keep tab styling consistent across editors

### Purpose
- Keeps `/pipeline/[id]`, `/skills/[id]`, and modal editing surfaces visually aligned with the rest of Mission Control
- Allows the same editor UI to switch cleanly between light mode and dark mode using the global theme variables

## Office Experience

- `src/components/office/OfficeFloor.tsx` now renders as a connected architectural floor plate with attached rooms and shared corridor spines
- The office layout is intentionally flatter and cleaner, closer to a signage-grade top-view floor map than floating cards
- Division names are rendered as one-line sign-style headers so labels stay clear of desks, chairs, and avatars and read more like room signage
- Room frames now use soft architectural edges and light borders instead of heavy dark outlines
- The office floor now carries a subtle light-gray tile grid across the full floor plate instead of isolated central path shapes
- Furniture and greenery are intentionally simplified toward a minimalist top-view office language instead of decorative icon shapes
- Active and paused agents are seated inside room seats that belong to their assigned division
- Idle agents roam through corridor paths using smoother long-form motion loops
- The right-side detail rail shows the selected room and live agent roster from shared app state

## Agent Cards

- `src/components/agents/AgentCard.tsx` now uses a stronger profile-card structure with a top rarity/header strip, clearer stats, and a unified action bar
- Cards keep the same agent actions as before: activate/pause, clone, remove, and open edit
- The card surface is now theme-aware and reads correctly in both light mode and dark mode
- Text, chip, and stat-tile contrast now follow global theme tokens instead of hardcoded dark-only values
- Visual emphasis is now split into:
  - identity block
  - completion/status block
  - runtime/output/workload stat tiles
  - current mission panel
  - consistent bottom action strip
- The styling stays within Mission Control’s current theme but pushes further toward “playable roster card” presentation

## Reliability Notes

- `src/components/ClientShell.tsx` is the hydration gate for the authenticated app shell:
  - it loads shared state from `/api/state`
  - it applies authenticated user context
  - it sets `appStateReady` only after the shared payload is resolved or explicitly failed
- `src/app/tasks/page.tsx`, `src/app/tasks/[id]/page.tsx`, and `src/app/outputs/page.tsx` now wait for `appStateReady` before rendering empty-state fallbacks, which prevents false “not found” or empty registry flashes during Supabase hydration
- `src/components/agents/IrisChat.tsx` now distinguishes between:
  - a usable deliverable
  - a coordination/status-only response
  - a provider failure
- If Iris returns only routing/correction language, the task is now marked `blocked` instead of pretending a real output exists
- If the chat request fails outright, the task is also marked `blocked` and stores the provider error in `handoffNotes`
- Tasks only create saved output artifacts when the response looks like a real deliverable, not when it is just boilerplate status language
- `src/app/tasks/[id]/page.tsx` now uses client-side router navigation after deletion instead of forcing a full-page reload
- `/api/chat` now returns provider-aware service statuses (for example `503` for unavailable AI runtime) instead of flattening availability problems into generic `500` errors
- `src/components/layout/TopBar.tsx` exposes a "Refresh latest app version" control that clears browser caches and reloads with a timestamped URL when a user gets stuck on an old build

## Provider Runtime Model

- Provider settings are now treated as **user-scoped runtime preferences**, not a shared agency-wide secret store
- Each authenticated user keeps their own:
  - Ollama base URL
  - Ollama verification state and discovered models
  - Gemini API key, masked key, verification state, and preferred Gemini model
  - runtime routing preferences
- Runtime routing preferences now include:
  - primary runtime
  - fallback runtime
  - a `useGeminiForThinking` toggle for strategy/research/heavier reasoning tasks
- `src/app/api/state/route.ts` now:
  - loads provider settings from the authenticated user’s Supabase auth metadata
  - returns those user-scoped settings into the app state
  - saves updated provider settings back to that same authenticated user profile
- Shared agency state still stores:
  - agency settings
  - clients
  - tasks
  - outputs
  - conversations
  - activities/campaigns/memories bridge data
- Provider secrets are therefore no longer conceptually shared across all users of the workspace

### Runtime Selection Rules

- Ollama is intended to be the primary default runtime
- Gemini is intended to be:
  - the fallback runtime
  - the preferred runtime for thinking-heavy deliverables when enabled and verified
- Thinking-heavy deliverables currently include:
  - strategy briefs
  - campaign strategy
  - research briefs
  - SEO audits
  - client briefs
  - KPI forecasts
- `src/app/api/chat/route.ts` now resolves the actual runtime from user-scoped provider settings instead of blindly trusting a hardcoded default provider
- If the selected runtime fails, the route now attempts the configured fallback runtime before returning an error
- `src/lib/server/ai.ts` now prioritizes content/social routing keywords before generic client-service phrases so requests like Instagram carousels route cleanly to `Echo` instead of being misclassified by words such as `client-ready`

### User Expectation

- Super admin can rely on their own local Ollama setup plus optional Gemini
- Other users are expected to install/run Ollama locally on their own machines if they want local-first generation
- Gemini only becomes active after the user saves and successfully verifies a valid API key from `/settings`

## QA Snapshot

- Authenticated super-admin flow has been verified through Supabase auth plus the `/users` admin APIs
- Shared state API has been verified with bearer-authenticated reads for:
  - `/api/state`
  - `/api/admin/users`
- Current runtime caveat:
  - Iris/task generation still depends on at least one actually available AI provider
  - if Ollama is selected but not running, `/api/chat` returns a friendly failure and the task is blocked instead of silently pretending it completed

## Build & Deployment

```bash
cd /Users/moe/Desktop/Mission\ Control\ App
npm run dev  # Start development server
npm run build  # Production build
```

Access at: http://localhost:3000

## Git Status

- **40 commits ahead** of origin/main
- All changes committed locally
- Build passes with Next.js 16.2.1/Turbopack

## Constraints

- All configs stored as editable JSON in `src/config/`
- Agent definitions in `src/lib/agent-templates.ts`
- No hardcoded values — everything editable
- Skills follow Claude best practices format
- Build must pass before commits (`npm run build`)
