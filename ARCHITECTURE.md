# Mission Control — Architecture

## Overview

Mission Control is a Next.js-based agency management application designed to orchestrate virtual AI agents through configurable workflows. The system follows a config-first philosophy where all business logic is stored as editable JSON.

## Tech Stack

- **Framework**: Next.js 16.2.1 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State**: Zustand (localStorage persistence)
- **Icons**: Lucide React
- **AI Providers**: Ollama (local), Google Gemini

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                            │
│  (Pages, Components, Layouts)                             │
├─────────────────────────────────────────────────────────────┤
│                      State Layer                           │
│  (Zustand Stores: agents-store, analytics-store)           │
├─────────────────────────────────────────────────────────────┤
│                      Config Layer                          │
│  (JSON configs: agents, pipelines, skills)                │
├─────────────────────────────────────────────────────────────┤
│                    Integration Layer                        │
│  (OAuth: Google Docs/Sheets/Ads, Meta Ads)                │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Files

### Core Configs

| File/Directory | Purpose |
|----------------|---------|
| `src/config/agents/*.json` | Individual agent configs (10 agents) |
| `src/config/pipelines/*.json` | Individual pipeline configs (6 pipelines) |
| `src/config/skills/*.json` | Individual skill files (140+ skills) |
| `src/config/tools/tools-config.json` | Tool registry |
| `src/config/client-templates/client-templates.json` | Client templates |

### Individual Pipeline Files

Each pipeline now has its own JSON file:
- `src/config/pipelines/content-calendar.json`
- `src/config/pipelines/campaign-brief.json`
- `src/config/pipelines/ad-creative.json`
- `src/config/pipelines/seo-audit.json`
- `src/config/pipelines/competitor-research.json`
- `src/config/pipelines/media-plan.json`

### Individual Skill Files

Each skill has its own JSON file in `src/config/skills/`, following the skill-schema format:
- `brand-strategy.json`
- `campaign-planning.json`
- `seo-audit.json`
- etc.

## Skill Schema

Skills follow a structured format inspired by Claude best practices:

```typescript
interface Skill {
  name: string           // kebab-case, max 64 chars
  description: string    // third person, max 1024 chars
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  freedom: 'high' | 'medium' | 'low'  // How much guidance to give
  
  prompts: {
    en: {
      trigger: string      // When to use this skill
      context: string      // Agent persona and context
      instructions: string  // Step-by-step workflow with checklist
      output_template: string
    }
    ar?: { ... }           // Arabic version
  }
  
  variables: SkillVariable[]
  workflow?: { steps: WorkflowStep[] }
  examples?: { input: string, output: string }[]
  checklist: string[]
  tools?: string[]
  agents?: string[]
  pipelines?: string[]
  metadata: { version, author, tags, lastUpdated }
}
```

### Skill Categories

- **Strategy & Planning**: Brand strategy, campaign planning, competitive analysis
- **Creative & Copy**: Creative concepts, copywriting, visual direction
- **Media & Advertising**: Media planning, campaign setup, optimization
- **Research & Analytics**: Market research, SEO, competitive intelligence
- **Operations & Workflow**: Task triage, workflow design, coordination
- **Client Services**: Relationship management, account planning
- **Content Production**: Content calendars, social media, video

## Agent Config Structure

```json
{
  "id": "unique-id",
  "name": "Agent Name",
  "role": "Job Title",
  "division": "orchestration|client-services|creative|media|research",
  "skills": ["skill-id", "skill-id"],
  "responsibilities": ["Responsibility 1", "Responsibility 2"],
  "tools": ["tool-id", "tool-id"],
  "ai": {
    "provider": "ollama|gemini",
    "model": "model-name",
    "temperature": 0.7,
    "maxTokens": 1536
  },
  "color": "#hex",
  "status": "active|idle|paused"
}
```

## Pipeline Structure

```json
{
  "id": "pipeline-id",
  "name": "Pipeline Name",
  "description": "What this pipeline does",
  "clientProfileFields": ["field1", "field2"],
  "phases": [
    {
      "id": "phase-id",
      "name": "Phase Name",
      "color": "#hex",
      "activities": [
        {
          "id": "activity-id",
          "name": "Activity Name",
          "assignedRole": "role-id",
          "checklist": ["Item 1", "Item 2"],
          "prompt": { "en": "...", "ar": "..." }
        }
      ]
    }
  ]
}
```

## State Management

### Agents Store (`agents-store.ts`)

Manages agents, missions, clients, conversations, and provider settings.

### Analytics Store (`analytics-store.ts`)

Manages campaign metrics, agent metrics, ROI analysis, learned patterns, and A/B tests.

### Skills Store (`src/lib/stores/skills-store.ts`)

Loads and manages individual skill files from `src/config/skills/`.

### Pipelines Store (`src/lib/stores/pipelines-store.ts`)

Loads and manages individual pipeline files from `src/config/pipelines/`.

## Key Libraries

| Library | Purpose |
|---------|---------|
| `skill-schema.ts` | TypeScript interfaces for skill structure |
| `pipeline-execution.ts` | Pipeline routing and execution engine |
| `skill-import.ts` | Import skills from .md or .zip files |
| `google-integrations.ts` | Google Docs, Sheets, Ads API |
| `meta-integrations.ts` | Meta/Facebook Ads API |
| `server/ai.ts` | AI text generation with Ollama/Gemini |

## Pages

| Route | Purpose |
|-------|---------|
| `/dashboard` | Main agency dashboard |
| `/agents` | Agent roster and management |
| `/pipeline` | Pipeline cards browser |
| `/pipeline/[id]` | Individual pipeline editor |
| `/pipeline/run` | Pipeline execution runner |
| `/skills` | Skills library browser |
| `/skills/[id]` | Individual skill editor |
| `/config` | In-app JSON config editor |
| `/analytics` | Analytics & AI intelligence dashboards |
| `/settings` | App settings |
| `/settings/integrations` | Google & Meta OAuth integrations |

## OAuth Integrations

### Google (Docs, Sheets, Ads)
- OAuth routes: `/api/auth/google`
- Scopes: documents, spreadsheets, drive, adwords

### Meta (Facebook/Instagram Ads)
- OAuth routes: `/api/auth/meta`
- Scopes: ads_management, ads_read, pages_read_engagement

## Iris Chat Interface

The Iris chat widget (`IrisChat.tsx`) provides:
- Modern message UI with file attachments
- Support for images, PDFs, Excel, Word files
- Context extraction from attached files
- Real-time streaming responses
- Conversation history

Iris routes tasks to the appropriate pipelines and agents based on user input.

## Division Structure

| Division | Color | Agents |
|----------|-------|--------|
| Orchestration | Purple (#a78bfa) | Iris |
| Client Services | Blue (#4f8ef7) | Piper |
| Creative | Teal (#00d4aa) | Nova, Maya, Echo |
| Media | Pink (#ff5fa0) | Finn, Atlas |
| Research | Sky Blue (#38bdf8) | Sage, Dex |

## Workflow Engine

The workflow engine (`pipeline-execution.ts`) handles:

1. **Task Routing**: `routeTask()` matches user requests to pipelines
2. **Pipeline Execution**: `createPipelineInstance()` and `executeTask()`
3. **Agent Assignment**: Maps roles to agents based on division
4. **Context Building**: Injects client data and variables into prompts

## Phase Flow (Campaign Brief Example)

```
Discovery → Strategy → Creative → Review → Delivery
    ↓          ↓          ↓         ↓         ↓
   Client    Brief     Content    Client    Report
  Intake   Approved   Approved   Sign-off  Delivered
```

## Quality Checkpoints

Quality checkpoints enforce phase transitions:

- **Q1: Intake Complete** — All client info collected
- **Q2: Strategy Approved** — Strategy approved by client
- **Q3: Creative Approved** — Creative work signed off
- **Q4: Pre-Launch** — Final QA before launch
- **Q5: Launch Verified** — Campaign live and verified

## Analytics & Intelligence

The analytics system tracks:

- **Campaign Metrics**: Spend, impressions, conversions, ROAS
- **Agent Metrics**: Tasks completed, avg duration, quality scores
- **Pipeline Metrics**: Success rate, completion time, runs
- **Learned Patterns**: AI-identified patterns with confidence scores
- **A/B Tests**: Test results with statistical significance
- **Predictions**: Estimated completion timelines

## Adding New Configs

1. Create JSON file in appropriate `src/config/` directory
2. Add TypeScript interface in relevant schema file
3. Create API route for CRUD operations if needed
4. Update this ARCHITECTURE.md

## Constraints

- All configs stored as editable JSON in `src/config/`
- No hardcoded values — everything editable
- Opaque identifiers preserved exactly as written
- Config changes don't require code changes
- Skills follow Claude best practices: concise, progressive disclosure, verification checklists
