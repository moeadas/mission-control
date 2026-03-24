# Agency Mission Control — Architecture

> Contributor guide for how the app works, how the files connect, and where to change things safely.
> Last updated: March 23, 2026

## What The App Is

Agency Mission Control is a local-first Next.js app for running a virtual creative and digital media agency.

The product combines:
- an agency dashboard
- a virtual office floor
- an editable agent roster
- client and campaign management
- a task tracker
- Iris, the orchestration assistant that routes work across the agency

The app is designed to feel like an operating system for a boutique-to-mid-size agency, not just a chat wrapper.

## Core Agency Model

The app is organized around five operating groups:
- `orchestration`: Iris
- `client-services`: Sage, Piper, Maya
- `creative`: Finn, Echo, Nova Studio
- `media`: Nova, Dex
- `research`: Atlas

Iris is the intake and coordination layer. Specialist agents carry division, specialty, skills, responsibilities, runtime model settings, and primary outputs.

Current seeded team structure:
- `Iris`: Agency Operations Lead
- `Sage`: Client Director
- `Piper`: Project / Traffic Manager
- `Maya`: Brand & Campaign Strategist
- `Finn`: Creative Director
- `Echo`: Copy & Content Lead
- `Nova Studio`: Design & Visual Production Lead
- `Nova`: Media Planning Lead
- `Dex`: Performance & Media Ops
- `Atlas`: Research, Insights & SEO Lead

## Main Concepts

### Clients
Clients are no longer shallow CRM entries. Each client is a structured strategic brief with fields such as:
- mission statement
- brand promise
- target audiences
- products and services
- USP
- competitive landscape
- key messages
- tone of voice
- strategic priorities
- knowledge assets

The app currently seeds `Victory Genomics` as the default client.

### Knowledge Assets
Each client can hold structured knowledge assets:
- docs
- PDFs
- spreadsheets
- links
- notes

Today these are metadata-rich references with summaries and extracted-insight fields. Full document upload/parsing is not implemented yet.

### Campaigns
Campaigns are linked to clients through `clientId`. They represent delivery programs and assigned teams.

### Missions
Missions now function as the app's Tasks layer. Each mission/task has:
- a title and summary
- status and priority
- linked client/campaign context
- assigned agents
- a `deliverableType`

Example deliverable types:
- `client-brief`
- `strategy-brief`
- `campaign-strategy`
- `content-calendar`
- `campaign-copy`
- `creative-asset`
- `media-plan`
- `budget-sheet`
- `kpi-forecast`
- `seo-audit`
- `research-brief`
- `status-report`

### Artifacts
Artifacts are the app's real output records.

They are used to store actual saved work product such as:
- internal markdown drafts
- exported docs
- PDFs
- spreadsheets
- links
- creative outputs

Artifacts are linked to client, campaign, mission, and agent wherever possible.
This registry is now the truth source for whether a deliverable actually exists.

Each artifact can now hold:
- the working draft content
- the execution prompt that produced it
- a list of generated export files
- creative-production metadata for design work

## How The App Works

The main operating flow is:

1. Client context is stored in the client brief.
2. Optional programs/campaigns can attach to clients, but they are no longer the main operating tab.
3. Every user request in Iris creates a Task (`Mission`) immediately.
4. Agents declare what they are capable of and what they produce.
5. Iris receives a request in chat.
6. The server infers routing context from the request plus known clients and active tasks.
7. The current client brief is injected into the prompt so the output is industry-specific.
8. Iris memory and routed-agent memory are injected into the chat context.
9. Known artifacts are injected into the chat context so Iris knows what really exists.
10. The selected provider/model generates the actual draft deliverable, not just a workflow note.
11. The API blocks unsupported delivery/file claims when no real artifact exists.
12. The chat UI stores the answer with routing and provider metadata.
13. The app saves the reply as an internal draft artifact tied to the active task/client scope.
14. If the output is creative, the artifact also gets a starter creative-production pack.
15. The Task page shows:
   - the original request
   - the execution brief
   - the live output
   - exports
16. The Outputs page can also turn that saved artifact into a real DOCX, PDF, or XLSX file.
17. Generated files are written to `public/generated/artifacts/` and recorded back onto the artifact.
18. Iris and the routed specialist memory are updated with a compact note about the work.

This creates a single source of truth across CRM context, delivery state, and AI interaction.

## Chat And Provider Logic

### Iris Flow

`IrisChat.tsx` sends:
- conversation messages
- persisted agent memories
- provider/model settings
- agent summaries
- client brief context
- mission summaries
- current client/campaign scope

to `POST /api/chat`.

### Server Routing

`src/app/api/chat/route.ts`:
- validates the request
- infers likely routing ownership from the latest user message
- builds system context from clients, programs, tasks, memories, and known artifacts
- injects rich scoped-client context like audience, USP, key messages, tone, and strategic priorities
- calls the selected provider through `src/lib/server/ai.ts`

### Provider Layer

Supported providers:
- `ollama`
- `gemini`

The provider layer handles:
- Gemini key verification
- Ollama reachability checks
- text generation
- normalized provider errors
- routing heuristics

### Gemini Fallback

If Gemini returns quota exhaustion (`429` / `RESOURCE_EXHAUSTED`) and Ollama is enabled, the chat route retries on Ollama automatically.

The response metadata records:
- routed agent
- client/campaign scope
- actual provider used
- actual model used
- whether fallback was used

The chat UI surfaces that fallback state so users can see when Iris continued on Ollama.

### No-Hallucination Output Rule

Iris must not claim that work has been:
- completed
- delivered
- exported
- uploaded
- emailed
- saved to a specific file path

unless that output exists in the artifact registry.

This is enforced in two places:
- prompt/context instructions in `POST /api/chat`
- a server-side response guard that rewrites unsupported delivery/file claims

### Task-First Output Rule

When the user asks for a deliverable, the app should not stop at coordination language.

The generation layer now:
- creates the task immediately
- routes it to the right specialist
- asks the model to produce the actual deliverable in the same response
- stores that result as the first visible task output

Examples:
- Instagram carousel requests should save slide-by-slide copy, caption, hooks, CTA, hashtags, and design notes
- content calendar requests should save a complete calendar table/schedule
- media plan requests should save the planning output in readable form before export
- strategy requests should save the full strategist-grade draft, not just “routed to Maya”

## Memory Model

Iris now uses a persisted in-app memory layer rather than relying only on visible chat messages.

Memory lives in:
- [src/lib/agent-memory.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/agent-memory.ts)
- [src/lib/agents-store.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/agents-store.ts)

Each agent memory contains:
- `roleSummary`
- `userPreferences`
- `workingMemory`
- `recentWork`
- `lastUpdated`

### What It Does

- Iris keeps the user preference for short, precise answers.
- Iris can see recent memory notes for herself and the routed specialist.
- When a reply is completed, the app appends a compact memory note to Iris and the supporting agent.
- Conversation history stays visible in the chat sidebar with title, preview, and last updated date.

### Why It Is Structured Instead Of Markdown Files

The browser app needs memory it can read and update at runtime, so the active memory system is stored in persisted app state rather than standalone `.md` files.

If needed later, those memories can be exported to markdown for humans, but markdown alone would not give the app writable runtime memory.

## Output System

The app now has a proper output system instead of only chat text.

### Where Outputs Live

- `/outputs` is the agency-wide deliverables registry
- `/clients` shows the subset of outputs linked to a selected client
- `/tasks/[id]` is the primary working view for a single request
- each artifact can hold many generated files, not just one flat `path`

### Output Families

The app currently treats deliverables as three output families:
- `document`
  Examples: client briefs, strategy briefs, campaign strategies, SEO audits, research briefs
- `media`
  Examples: media plans, budget sheets, KPI forecasts
- `creative`
  Examples: carousels, social visuals, ad creative, deck visuals

### Export Generation

The export pipeline is server-side and lives in:
- [src/app/api/artifacts/export/route.ts](/Users/moe/Desktop/Mission%20Control%20App/src/app/api/artifacts/export/route.ts)
- [src/lib/server/artifact-export.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/server/artifact-export.ts)

Current export support:
- `DOCX`
  For briefs, strategies, research outputs, and other text-heavy deliverables
- `PDF`
  For client-ready document exports and printable media sheets
- `XLSX`
  For media plans, budget sheets, and KPI workbooks

Generated files are written to:
- `public/generated/artifacts/`

The app then serves those files through:
- `GET /api/artifacts/download?fileName=...`

That gives the app a stable download URL plus a real filesystem path for each generated deliverable.

### Creative / Image Artifact Flow

Creative outputs now have a dedicated production-pack layer, not just raw text.

Creative artifact metadata includes:
- asset type
- aspect ratio
- visual direction
- image prompt
- deliverable specs
- reference notes
- optional hosted asset URL
- optional local asset path

This means the app can now hold:
- the creative brief
- the actual production prompt
- links or paths to finished design assets
- exported briefing docs or PDFs for handoff

The app does not yet generate final images automatically from within Mission Control. The current flow is:
1. Iris drafts the creative output and stores it as an artifact.
2. The artifact can be refined inside the creative production pack.
3. The user can link the final hosted/local asset.
4. The artifact can still be exported as a PDF or DOCX handoff brief.

## State Architecture

The app uses a single persisted Zustand store in:
- [src/lib/agents-store.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/agents-store.ts)

Persist key:
- `moes-mission-control`

Main persisted domains:
- `agents`
- `activities`
- `campaigns`
- `clients`
- `missions`
- `artifacts`
- `conversations`
- `agentMemories`
- `agencySettings`
- `providerSettings`

Main transient UI state:
- selected agent
- editor visibility
- active mission
- active conversation
- Iris open/closed state
- chat status

### Migration Logic

The store includes migration and normalization logic for persisted agents.

This matters because the app has changed shape significantly over time. Older saved agents may be missing newer fields like:
- `division`
- `provider`
- `skills`
- `responsibilities`
- `primaryOutputs`

The store now normalizes persisted agents on migration so the current UI does not crash on older browser state.

## File Structure

```text
src/
├── app/
│   ├── agents/page.tsx
│   ├── campaigns/page.tsx
│   ├── clients/page.tsx
│   ├── dashboard/page.tsx
│   ├── office/page.tsx
│   ├── outputs/page.tsx
│   ├── tasks/
│   │   ├── [id]/page.tsx
│   │   └── page.tsx
│   ├── settings/page.tsx
│   ├── api/
│   │   ├── artifacts/export/route.ts
│   │   ├── artifacts/download/route.ts
│   │   ├── chat/route.ts
│   │   └── providers/verify/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ClientShell.tsx
│   ├── agents/
│   │   ├── AgentBot.tsx
│   │   ├── AgentCard.tsx
│   │   ├── AgentEditor.tsx
│   │   └── IrisChat.tsx
│   ├── dashboard/
│   │   ├── ActivityFeed.tsx
│   │   └── MetricsCards.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── office/
│   │   └── OfficeFloor.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Slider.tsx
│       └── Toast.tsx
├── lib/
│   ├── agent-templates.ts
│   ├── artifacts.ts
│   ├── agents-store.ts
│   ├── bot-animations.ts
│   ├── client-data.ts
│   ├── providers.ts
│   ├── task-output.ts
│   ├── server/
│   │   ├── ai.ts
│   │   └── artifact-export.ts
│   └── types.ts
└── styles/
    └── globals.css
```

## What Each Important File Owns

### App Shell
- [src/app/layout.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/layout.tsx)
  Root HTML layout, fonts, and global stylesheet import.
- [src/components/ClientShell.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/components/ClientShell.tsx)
  Shared app shell, top bar, sidebar, Iris launcher, theme dataset sync.

### Pages
- [src/app/dashboard/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/dashboard/page.tsx)
  Command center overview.
- [src/app/office/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/office/page.tsx)
  Live virtual office view.
- [src/app/agents/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/agents/page.tsx)
  Team roster and agent editing.
- [src/app/clients/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/clients/page.tsx)
  Strategic brief editor, knowledge hub, and client output registry.
- [src/app/tasks/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/tasks/page.tsx)
  Task list for all requested work.
- [src/app/tasks/[id]/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/tasks/[id]/page.tsx)
  Single task view with request, execution brief, live output, exports, and status controls.
- [src/app/campaigns/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/campaigns/page.tsx)
  Redirects legacy traffic to `/tasks`.
- [src/app/outputs/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/outputs/page.tsx)
  Central output registry with status controls, export actions, export history, and creative production editing.
- [src/app/settings/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/settings/page.tsx)
  Theme, export/import, provider verification.

### Agent UI
- [src/components/agents/AgentCard.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/components/agents/AgentCard.tsx)
  Roster card, status actions, summary metadata.
- [src/components/agents/AgentEditor.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/components/agents/AgentEditor.tsx)
  Full agent editor for runtime, skills, responsibilities, outputs, and prompt.
- [src/components/agents/IrisChat.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/components/agents/IrisChat.tsx)
  Chat UI, task creation, response storage, artifact drafting, fallback messaging, and history view.
- [src/components/dashboard/MetricsCards.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/components/dashboard/MetricsCards.tsx)
  KPI cards plus mission queue controls for pause, cancel, and complete actions.

### Shared Domain Logic
- [src/lib/types.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/types.ts)
  Canonical type system, including missions, artifacts, creative specs, and generated-file records.
- [src/lib/artifacts.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/artifacts.ts)
  Shared output-family rules, creative defaults, and supported export-format helpers.
- [src/lib/agent-templates.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/agent-templates.ts)
  Default team, templates, and office rooms.
- [src/lib/client-data.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/client-data.ts)
  Client interfaces and Victory Genomics seed data.
- [src/lib/providers.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/providers.ts)
  Provider/model labels and helpers.
- [src/lib/task-output.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/task-output.ts)
  Task naming and deliverable-specific output spec helpers.
- [src/lib/server/ai.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/server/ai.ts)
  Provider verification, text generation, routing heuristics, client-aware execution prompting, and friendly provider errors.
- [src/lib/server/artifact-export.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/server/artifact-export.ts)
  File generation for XLSX media plans, DOCX briefs, and PDF exports.

## Agent Logic

### Routing Heuristics

The routing heuristics are currently keyword-based and live in:
- [src/lib/server/ai.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/server/ai.ts)

Examples:
- strategy keywords route toward Maya
- client update / brief language routes toward Sage
- schedule / handoff language routes toward Piper
- content / copy routes toward Echo
- visual / design / Nano Banana references route toward Nova Studio
- media / budget / forecast routes toward Nova or Dex
- research / SEO / competitor language routes toward Atlas

This is structural orchestration, not yet a true background multi-agent worker system, but it now produces task-specific deliverables immediately instead of only coordination text.

### Current Limitation

Iris can route and label ownership, but the app does not yet spawn real child tasks per specialist agent in the background. That is a future layer.

## Styling System

Global styling lives in:
- [src/styles/globals.css](/Users/moe/Desktop/Mission%20Control%20App/src/styles/globals.css)

The app uses:
- Tailwind utilities
- CSS custom properties
- theme switching through `document.documentElement.dataset.theme`
- dark and light modes

### Important Note About Local Runtime

Recommended runtime:
- `Node 20`

This repo has shown broken `_next` asset serving under unsupported local runtimes in `next dev`, which can make the app appear unstyled even when the CSS code is correct.

If that happens:
1. use Node 20 for development
2. or run `npm run build && npm run start` for a stable local preview

## Current API Surface

### `POST /api/chat`
- orchestration-aware chat request
- memory-aware chat context
- artifact-aware truth constraints
- client-aware deliverable prompting
- provider/model execution
- Gemini fallback to Ollama
- returns routed metadata

### `POST /api/artifacts/export`
- receives a saved artifact payload plus export target
- generates a real local file
- returns an export record with:
  - file name
  - filesystem path
  - public URL
  - created timestamp

### `POST /api/providers/verify`
- verifies Ollama reachability
- verifies Gemini key validity
- returns available models

## Audit Notes

The latest cleanup removed several stale files and dead paths from older app versions, including:
- an empty test route under `api/chat`
- an unused best-practices subsystem
- unused store state from earlier chat/editor flows

The current structure is materially cleaner, but there are still some architectural opportunities worth considering later:
- move `ClientShell` into a route-group layout instead of wrapping every page manually
- split the large Zustand store into domain/UI/chat slices if complexity grows further
- introduce a real task graph and background worker layer for true multi-agent delegation
- add document ingestion for client knowledge assets
- add true image-generation providers for creative assets

## Safe Change Guide

If you want to change:

### Agent roles, defaults, or room layout
Edit:
- [src/lib/agent-templates.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/agent-templates.ts)

### Agent editing or roster UI
Edit:
- [src/components/agents/AgentCard.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/components/agents/AgentCard.tsx)
- [src/components/agents/AgentEditor.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/components/agents/AgentEditor.tsx)
- [src/app/agents/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/agents/page.tsx)

### Client brief structure
Edit:
- [src/lib/client-data.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/client-data.ts)
- [src/app/clients/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/clients/page.tsx)

### Provider behavior or routing
Edit:
- [src/lib/server/ai.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/server/ai.ts)
- [src/app/api/chat/route.ts](/Users/moe/Desktop/Mission%20Control%20App/src/app/api/chat/route.ts)

### Persisted state and migrations
Edit:
- [src/lib/agents-store.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/agents-store.ts)

Important note:
- migration `version: 5` removes the old seeded sample campaigns, missions, and artifacts so the app reflects live requested work instead of demo data.

### Output generation or creative production flow
Edit:
- [src/app/outputs/page.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/app/outputs/page.tsx)
- [src/app/api/artifacts/export/route.ts](/Users/moe/Desktop/Mission%20Control%20App/src/app/api/artifacts/export/route.ts)
- [src/lib/server/artifact-export.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/server/artifact-export.ts)
- [src/lib/artifacts.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/artifacts.ts)
- [src/lib/types.ts](/Users/moe/Desktop/Mission%20Control%20App/src/lib/types.ts)

### Overall UI framing and theme behavior
Edit:
- [src/components/ClientShell.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/components/ClientShell.tsx)
- [src/components/layout/Sidebar.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/components/layout/Sidebar.tsx)
- [src/components/layout/TopBar.tsx](/Users/moe/Desktop/Mission%20Control%20App/src/components/layout/TopBar.tsx)
- [src/styles/globals.css](/Users/moe/Desktop/Mission%20Control%20App/src/styles/globals.css)
