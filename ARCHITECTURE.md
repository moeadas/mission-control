# Mission Control — Architecture

## Overview

Mission Control is a Next.js-based agency management application designed to orchestrate virtual AI agents through configurable workflows. The system follows a **config-first philosophy** where all business logic is stored as editable JSON.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.1 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS Custom Properties |
| Animation | CSS keyframes + Tailwind animations |
| State | Zustand (localStorage persistence) |
| Icons | Lucide React |
| AI Providers | Ollama (local), Google Gemini |

---

## Design System

### Philosophy
**"Command Center Meets Gaming HQ"** — Inspired by Apple Intelligence, Linear, Discord, and gaming dashboards. Clean, spacious, with personality. Glass morphism, subtle gradients, floating elements, and 2D game-like interfaces.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#0b0d14` | Page background |
| `--bg-panel` | `#111420` | Panel/sidebar background |
| `--bg-card` | `#181c2a` | Card surfaces |
| `--bg-elevated` | `#1e2235` | Elevated/hover states |
| `--border` | `#262b3d` | Default borders |
| `--border-glow` | `#3a4060` | Highlighted borders |
| `--text-primary` | `#eef0f8` | Primary text |
| `--text-secondary` | `#8b92b0` | Secondary text |
| `--text-dim` | `#505570` | Muted/disabled text |
| `--accent-blue` | `#4f8ef7` | Primary accent |
| `--accent-purple` | `#9b6dff` | Secondary accent |
| `--accent-cyan` | `#00d4aa` | Success/active |
| `--accent-orange` | `#ff7c42` | Warning/highlight |
| `--accent-pink` | `#ff5fa0` | Danger/special |
| `--accent-yellow` | `#ffd166` | Idle/pending |

### Typography
- **Headings**: Space Grotesk (`--font-heading`)
- **Body**: DM Sans (`--font-body`)
- **Code/Mono**: JetBrains Mono (`--font-mono`)

### Spacing & Radius
| Token | Value |
|-------|-------|
| `--radius-sm` | 8px |
| `--radius-md` | 12px |
| `--radius-lg` | 16px |
| `--radius-xl` | 24px |

### Animation Timing
| Type | Duration | Easing |
|------|----------|--------|
| Micro (hover, tap) | 150ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Base (state changes) | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Slow (panels, reveals) | 400ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Spring (scale-in) | 500ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

### CSS Utility Classes
| Class | Purpose |
|-------|---------|
| `card-surface` | Card with gradient + border |
| `glass-card` | Glassmorphism card |
| `hover-lift` | Hover translateY(-2px) + shadow |
| `glass` | Backdrop blur panel |
| `badge` | Pill badge (inline-flex) |
| `border-top-accent` | Top gradient accent line |
| `gradient-text` | Text with gradient clip |
| `bg-dots` | Dot grid background |
| `bg-grid` | Line grid background |
| `shimmer` | Loading skeleton animation |
| `float` | Gentle float animation |
| `scale-in` | Scale + fade entrance |
| `slide-in-up/down/right` | Slide entrance animations |
| `mobile-bottom-nav` | Mobile bottom tab bar |

---

## Architecture Layers

```
┌─────────────────────────────────────────┐
│          UI Layer                       │
│  Pages, Components, Layouts            │
├─────────────────────────────────────────┤
│          State Layer                    │
│  Zustand: agents-store, pipelines-store, skills-store, analytics-store │
├─────────────────────────────────────────┤
│          Config Layer                   │
│  JSON configs: agents, pipelines, skills │
├─────────────────────────────────────────┤
│        Integration Layer                │
│  OAuth: Google (Docs/Sheets/Ads), Meta  │
└─────────────────────────────────────────┘
```

---

## Agent Roster

| ID | Name | Role | Division | Color |
|----|------|------|----------|-------|
| iris | Iris | Agency Orchestrator | Orchestration | Purple |
| sage | Sage | Client Director | Client Services | Blue |
| piper | Piper | Project / Traffic Manager | Client Services | Yellow |
| maya | Maya | Brand & Campaign Strategist | Client Services | Purple |
| finn | Finn | Creative Director | Creative | Cyan |
| echo | Echo | Copy & Content Lead | Creative | Yellow |
| lyra | Lyra | Visual Production Lead | Creative | Cyan |
| nova | Nova | Media Planning Lead | Media | Pink |
| dex | Dex | Performance & Media Ops | Media | Blue |
| atlas | Atlas | Research, Insights & SEO Lead | Research | Sky Blue |

> **Note:** Lyra replaced "Nova Studio" (renamed to avoid duplicate names).

---

## Division Structure

| Division | Color | Room | Agents |
|----------|-------|------|--------|
| Mission Control | Purple (#9b6dff) | Orchestration | Iris |
| Client Suite | Blue (#4f8ef7) | Client-facing | Sage, Piper, Maya |
| Creative Lab | Cyan (#00d4aa) | Design & Copy | Finn, Echo, Lyra |
| Media Room | Pink (#ff5fa0) | Paid Media | Nova, Dex |
| Research Hub | Sky (#38bdf8) | Insights & SEO | Atlas |

---

## Pages

| Route | Purpose |
|-------|---------|
| `/dashboard` | Main agency command center with metrics, agent strip, activity feed, mission queue |
| `/office` | 2D game-like virtual office floor plan — clickable zones, agent avatars, zone info panels |
| `/agents` | Agent roster, status, and configuration |
| `/clients` | Client management |
| `/tasks` | Mission/task tracking |
| `/pipeline` | Pipeline cards browser with phase previews |
| `/pipeline/[id]` | Individual pipeline editor |
| `/pipeline/run` | Pipeline execution runner |
| `/skills` | Skills library with category filters and search |
| `/skills/[id]` | Individual skill editor |
| `/config` | In-app JSON config editor |
| `/analytics` | Analytics dashboards |
| `/settings` | App settings |
| `/settings/integrations` | Google & Meta OAuth |

---

## Component Structure

### Layout Components
- **`ClientShell`** — Root layout: TopBar, Sidebar, main content, mobile bottom nav, Iris FAB
- **`TopBar`** — Page header with breadcrumb and mobile menu toggle
- **`Sidebar`** — Collapsible sidebar nav with active glow indicators; mobile overlay + desktop persistent

### Dashboard Components
- **`MetricsCards`** — Animated stat cards with color accents (Active Agents, Running Tasks, etc.)
- **`AgentStrip`** — Grid of agent avatars with status indicators
- **`MissionQueue`** — Mission cards with progress bars and action buttons
- **`ActivityFeed`** — Live activity log with agent avatars and status icons

### Office Components
- **`OfficeFloor`** — SVG-based 2D floor plan with 5 zones, clickable agents, zone info panels, floating particles, ambient animations

### Skill Components
- **`SkillImporter`** — Skill import from .md or .zip

### Agent Components
- **`AgentBot`** — Animated bot avatar (idle, working, thinking, resting states)
- **`AgentCard`** — Agent info card
- **`AgentEditor`** — Agent configuration form
- **`IrisChat`** — Chat widget for agency orchestrator

### UI Primitives
- **`Card`** — Base card with glow, hover, and click support
- **`Button`** — Styled button variants
- **`Input`** — Styled input fields
- **`Modal`** — Overlay modal
- **`Toast`** — Notification toast

---

## State Management

### Stores
| Store | Purpose |
|-------|---------|
| `agents-store` | Agents, missions, clients, conversations, provider settings, Iris state |
| `analytics-store` | Campaign metrics, agent metrics, ROI analysis |
| `skills-store` | Individual skill files from `src/config/skills/` |
| `pipelines-store` | Individual pipeline files from `src/config/pipelines/` |

---

## Configuration Files

### Agent Configs
`src/config/agents/*.json` — Individual agent configs (JSON + TypeScript defaults from `agent-templates.ts`)

### Pipeline Configs
`src/config/pipelines/*.json` — Individual pipeline configs:
- `content-calendar.json`
- `campaign-brief.json`
- `ad-creative.json`
- `seo-audit.json`
- `competitor-research.json`
- `media-plan.json`

### Skill Configs
`src/config/skills/*.json` — Individual skill files organized by category

---

## Workflow Engine

`pipeline-execution.ts` handles:
1. **Task Routing** — Matches user requests to appropriate pipelines
2. **Pipeline Execution** — Creates instances and executes tasks
3. **Agent Assignment** — Maps roles to agents by division
4. **Context Building** — Injects client data and variables into prompts

---

## OAuth Integrations

| Provider | Scopes | Routes |
|----------|--------|--------|
| Google | Docs, Sheets, Drive, Ads | `/api/auth/google` |
| Meta | ads_management, ads_read, pages | `/api/auth/meta` |

---

## Key Libraries

| Library | Purpose |
|---------|---------|
| `skill-schema.ts` | TypeScript interfaces for skills |
| `pipeline-execution.ts` | Pipeline routing and execution |
| `skill-import.ts` | Import from .md or .zip |
| `google-integrations.ts` | Google Docs, Sheets, Ads API |
| `meta-integrations.ts` | Meta/Ads API |
| `server/ai.ts` | AI text generation |

---

## Constraints

- All configs stored as editable JSON in `src/config/`
- No hardcoded values — everything editable
- Opaque identifiers preserved exactly as written
- Config changes don't require code changes
- Skills follow concise, progressive disclosure, verification checklists
