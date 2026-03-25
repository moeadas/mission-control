# Mission Control — Architecture

## Overview

Mission Control is a Next.js 16.2.1-based agency management application designed to orchestrate virtual AI agents through configurable workflows. The system follows a config-first philosophy where all business logic is stored as editable JSON.

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
| `/office` | 2D virtual office floor plan with agent positions, game-like workspace |
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

The `/office` page features a game-like 2D workspace:

```
┌─────────────────────────────────────────────────────────────┐
│                    MISSION CONTROL                          │
│                    (Orchestration)                          │
│                      [Iris] [Piper]                       │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────┴────┐        ┌────┴────┐        ┌────┴────┐
    │ CLIENT  │        │CREATIVE │        │  MEDIA   │
    │SERVICES │        │DIVISION │        │DIVISION  │
    │[Sage]   │        │[Lyra]   │        │[Nova]    │
    │[Maya]   │        │[Finn]   │        │[Dex]     │
    └─────────┘        │[Echo]   │        └──────────┘
                       └─────────┘
                           │
                    ┌──────┴──────┐
                    │  RESEARCH   │
                    │  DIVISION   │
                    │  [Atlas]    │
                    └─────────────┘
```

### Features
- Dark strategy-game map aesthetic
- Animated grid background
- Active agents: sitting at desks
- Idle agents: walking animation
- Floating particles with room-colored glows
- Click rooms to highlight agents
- Click agents for detail panel
- Pulsing glow on active rooms

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

Persistence: Zustand with localStorage (persists agents, missions, clients, etc.)

### Analytics Store
Manages:
- Campaign metrics
- Agent performance
- Learned patterns
- A/B tests

## Skills System

### Skill Schema
Each skill in `src/config/skills/*.json` follows:
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

### 6 Core Pipelines
1. **Content Calendar** - 30-day social content planning
2. **Campaign Brief** - Full campaign strategy
3. **Ad Creative** - Advertising production
4. **SEO Audit** - Technical SEO analysis
5. **Competitor Research** - Market intelligence
6. **Media Plan** - Media strategy

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
- Features: Streaming, context injection, pipeline routing
- Iris is the default chat interface

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
- `OfficeFloor` - 2D game-like office floor plan renderer
  - Room rendering with furniture silhouettes
  - Agent sprites with active/idle animations
  - Walking animation for idle agents
  - Floating particles
  - Click interactions

## Key Libraries

| Library | Purpose |
|---------|---------|
| `skill-schema.ts` | Skill TypeScript interfaces |
| `pipeline-execution.ts` | Pipeline routing engine |
| `skill-import.ts` | Import skills from markdown |
| `server/ai.ts` | AI text generation |
| `providers.ts` | AI model definitions |
| `agents-store.ts` | Zustand store with persistence |

## Design Patterns

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
- Editable fields: name, role, bio, specialty
- Changes persist to localStorage via Zustand
- Agent positions and statuses are also editable
- All UI components react to changes in real-time

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
