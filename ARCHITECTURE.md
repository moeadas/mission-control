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
- Smooth micro-animations throughout

### Color Palette
```
Background Base:    #09090b (zinc-950)
Background Card:    #18181b (zinc-900)
Background Panel:   #27272a (zinc-800)
Border:            #3f3f46 (zinc-700)
Text Primary:      #fafafa (zinc-50)
Text Secondary:    #a1a1aa (zinc-400)
Text Dim:          #71717a (zinc-500)

Accent Purple:     #9b6dff (violet-400)
Accent Blue:       #4f8ef7 (blue-500)
Accent Cyan:       #22d3ee (cyan-400)
Accent Green:      #10b981 (emerald-500)
Accent Yellow:     #fbbf24 (amber-400)
Accent Orange:     #f97316 (orange-500)
Accent Pink:       #ec4899 (pink-500)
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
│  (JSON configs: agents, pipelines, skills)                │
├─────────────────────────────────────────────────────────────┤
│                    Integration Layer                        │
│  (OAuth: Google Docs/Sheets/Ads, Meta Ads)                 │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Files

### Core Configs

| File/Directory | Purpose |
|----------------|---------|
| `src/config/agents/*.json` | Individual agent configs (10 agents) |
| `src/config/pipelines/*.json` | Individual pipeline configs (6 pipelines) |
| `src/config/skills/*.json` | Individual skill files (141 skills) |
| `src/config/tools/tools-config.json` | Tool registry |

## Agent Roster

| Agent | Role | Division | Status |
|-------|------|----------|--------|
| **Iris** | Agency Operations Lead | Orchestration | 🟢 Active |
| **Lyra** | Visual Production Lead | Creative | 🟢 Active |
| **Piper** | Project & Traffic Manager | Client Services | 🟢 Active |
| **Sage** | Client Services Director | Client Services | 🟢 Active |
| **Echo** | Copy & Content Lead | Creative | 🟢 Active |
| **Maya** | Brand & Campaign Strategist | Creative | 🟢 Active |
| **Nova** | Media Planning Lead | Media | 🟢 Active |
| **Finn** | Creative Director | Creative | 🟢 Active |
| **Atlas** | Research & Insights Lead | Research | 🟢 Active |
| **Dex** | Performance & Analytics Lead | Media | 🟢 Active |

> **Note**: "Nova Studio" was renamed to **"Lyra"** to avoid duplicate agent names.

## Page Structure

| Route | Purpose |
|-------|---------|
| `/dashboard` | Main command center with agency stats, agent strip, activity feed |
| `/office` | 2D virtual office floor plan with agent positions |
| `/agents` | Agent roster with editor modal |
| `/clients` | Client management |
| `/tasks` | Task list and mission tracking |
| `/pipeline` | Pipeline templates browser |
| `/pipeline/[id]` | Pipeline editor |
| `/pipeline/run` | Pipeline execution runner |
| `/skills` | Skills library browser (141 skills) |
| `/skills/[id]` | Individual skill editor |
| `/analytics` | Analytics dashboards |
| `/outputs` | Saved deliverables |
| `/settings` | App settings |
| `/settings/integrations` | OAuth integrations (Google, Meta) |
| `/config` | JSON config editor |

## Virtual Office

The `/office` page features a 2D top-down floor plan:

```
┌─────────────────────────────────────────────────────────────┐
│                    MISSION CONTROL                          │
│                    (Orchestration)                          │
│                      [Iris 🟢]                             │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────┴────┐        ┌────┴────┐        ┌────┴────┐
    │ CLIENT  │        │CREATIVE │        │  MEDIA  │
    │SERVICES │        │DIVISION │        │DIVISION │
    │[Piper]  │        │[Lyra]   │        │[Nova]   │
    │[Sage]   │        │[Echo]   │        │[Dex]    │
    └─────────┘        │[Maya]   │        └─────────┘
                      │[Finn]   │
                      └─────────┘
                           │
                    ┌──────┴──────┐
                    │  RESEARCH   │
                    │  DIVISION   │
                    │  [Atlas]    │
                    └─────────────┘
```

### Room Configuration
Each room has:
- Position coordinates (x, y, width, height)
- Division color for visual identification
- Agent avatars placed within
- Click interaction for agent details

## State Management

### Agents Store (`agents-store.ts`)
Manages:
- `agents[]` - All agency agents
- `missions[]` - Active tasks/projects
- `clients[]` - Client profiles
- `conversations[]` - Chat history
- `providerSettings` - Ollama/Gemini configuration
- `agencySettings` - Theme, defaults

### Analytics Store (`analytics-store.ts`)
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
- `AgentBot` - Agent avatar with status indicator
- `Badge` - Status/category badges
- `Button` - Primary/secondary/ghost variants
- `Card` - Container with glass effect
- `Input` / `Select` / `Textarea` - Form controls
- `Modal` - Overlay dialogs
- `Toast` - Notifications

### Layout Components
- `ClientShell` - Main app wrapper
- `Sidebar` - Navigation sidebar (collapsible)
- `TopBar` - Header with actions
- `IrisChat` - Floating chat widget

### Dashboard Components
- `MetricsCards` - Stats display
- `AgentStrip` - Horizontal agent list
- `ActivityFeed` - Recent activity
- `MissionQueue` - Active tasks

### Office Components
- `OfficeFloor` - 2D floor plan renderer

## Key Libraries

| Library | Purpose |
|---------|---------|
| `skill-schema.ts` | Skill TypeScript interfaces |
| `pipeline-execution.ts` | Pipeline routing engine |
| `skill-import.ts` | Import skills from markdown |
| `server/ai.ts` | AI text generation |
| `providers.ts` | AI model definitions |

## Design Patterns

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

## Mobile Responsiveness

- Bottom tab bar on mobile (< 768px)
- Collapsible sidebar becomes hamburger menu
- Cards stack vertically
- Touch-friendly targets (min 44px)
- Swipe gestures for navigation

## Constraints

- All configs stored as editable JSON in `src/config/`
- No hardcoded values — everything editable
- Opaque identifiers preserved exactly as written
- Config changes don't require code changes
- Skills follow Claude best practices format
- Build must pass before commits (`npm run build`)

## Getting Started

```bash
cd /Users/mooe/Desktop/Mission\ Control\ App
npm run dev  # Start development server
npm run build  # Production build
```

Access at: http://localhost:3000
