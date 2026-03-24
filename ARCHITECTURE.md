# Mission Control — Architecture

## Overview

Mission Control is a Next.js-based agency management application designed to orchestrate virtual AI agents through configurable workflows. The system follows a config-first philosophy where all business logic is stored as editable JSON.

## Tech Stack

- **Framework**: Next.js 14/15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State**: Zustand (localStorage persistence)
- **Icons**: Lucide React

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                            │
│  (Pages, Components, Layouts)                              │
├─────────────────────────────────────────────────────────────┤
│                      State Layer                           │
│  (Zustand Stores: agents-store, workflow-store)            │
├─────────────────────────────────────────────────────────────┤
│                      Config Layer                          │
│  (JSON configs: agents, pipelines, skills, tools, etc.)   │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                           │
│  (localStorage persistence)                                │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Files

### Core Configs

| File | Purpose |
|------|---------|
| `src/config/agents/*.json` | Individual agent configurations (10 agents) |
| `src/config/pipelines/pipelines.json` | Predefined pipeline templates (6 pipelines) |
| `src/config/skills/skills-library.json` | Available skills taxonomy (100+ skills) |
| `src/config/tools/tools-config.json` | Tool registry |
| `src/config/client-templates/client-templates.json` | Client templates |
| `src/config/checkpoints/quality-checkpoints.json` | Phase transition gates |
| `docs/skills.md` | Skills reference guide |

### Agent Config Structure

```json
{
  "id": "unique-id",
  "name": "Agent Name",
  "role": "Job Title",
  "division": "orchestration|client-services|creative|media|research",
  "skills": ["skill-id", "skill-id"],
  "responsibilities": ["Responsibility 1", "Responsibility 2"],
  "tools": ["tool-id", "tool-id"],
  "systemPrompt": "Custom system prompt",
  "temperature": 0.7,
  "maxTokens": 1536,
  "color": "#hex",
  "avatar": null,
  "status": "active|idle|paused"
}
```

### Pipeline Structure

```json
{
  "id": "pipeline-id",
  "name": "Pipeline Name",
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
          "checklist": ["Item 1", "Item 2"]
        }
      ]
    }
  ]
}
```

## State Management

### Agents Store (`agents-store.ts`)

Manages agent state, missions, and client data.

```typescript
interface AgentsState {
  agents: Agent[]
  missions: Mission[]
  clients: Client[]
  // ... CRUD operations
}
```

### Workflow Store (`workflow-store.ts`)

Manages workflow instances, tasks, and handoffs.

```typescript
interface WorkflowState {
  workflowInstances: Map<string, WorkflowInstance>
  tasks: Map<string, WorkflowTask>
  handoffs: Handoff[]
  // ... Task management
}
```

## Key Libraries

| Library | Purpose |
|---------|---------|
| `config-loader.ts` | Dynamic JSON config loading |
| `workflow-engine.ts` | Task generation, phase gates |
| `pipeline-loader.ts` | Pipeline template loading |

## Pages

| Route | Purpose |
|-------|---------|
| `/dashboard` | Main agency dashboard |
| `/office` | Virtual office with agent interactions |
| `/agents` | Agent roster and management |
| `/pipeline` | Production pipeline with Kanban view |
| `/config` | In-app JSON config editor |
| `/outputs` | Saved deliverables |

## Skills Taxonomy

Skills are organized into categories:

- **Strategy & Planning**: Brand strategy, campaign planning, competitive analysis
- **Creative & Copy**: Creative concepts, copywriting, visual direction
- **Project & Traffic Management**: Task triage, workflow design, coordination
- **Media & Advertising**: Media planning, campaign setup, optimization
- **Research & Insights**: Market research, SEO, competitive intelligence
- **Client Services**: Relationship management, account planning
- **Operations**: Agency operations, tool integration

## Predefined Pipelines

1. **Campaign Brief**: Full campaign from intake to launch (14 days)
2. **Social Content Pipeline**: Social content creation and scheduling (30 days)
3. **Ad Creative Production**: Ad creative with A/B testing (7 days)
4. **SEO Audit & Strategy**: Comprehensive SEO audit (10 days)
5. **Competitor Research Report**: Competitive intelligence (5 days)
6. **Media Plan Development**: Media strategy creation (7 days)

## Quality Checkpoints

Quality checkpoints enforce phase transitions:

- **Q1: Intake Complete** — All client info collected
- **Q2: Strategy Approved** — Strategy approved by client
- **Q3: Creative Approved** — Creative work signed off
- **Q4: Pre-Launch** — Final QA before launch
- **Q5: Launch Verified** — Campaign live and verified

## Division Structure

| Division | Color | Roles |
|----------|-------|-------|
| Orchestration | Purple | Operations Lead |
| Client Services | Blue | Client Services Director, Traffic Manager |
| Creative | Teal | Creative Director, Copy Lead, Visual Producer |
| Media | Pink | Media Planning Lead, Performance Lead |
| Research | Sky Blue | Research & Insights Lead |

## Workflow Engine

The workflow engine (`workflow-engine.ts`) handles:

1. **Task Generation**: Creates tasks from workflow templates
2. **Phase Gates**: Enforces quality checkpoints between phases
3. **Checklist Tracking**: Tracks completion of activity checklists
4. **Prompt Building**: Constructs agent prompts with context
5. **Handoff Management**: Documents work transfers between agents

## Phase Flow

```
Intake → Strategy → Creative → Review → Delivery
   ↓         ↓          ↓         ↓         ↓
  Q1        Q2         Q3        Q4        Q5
```

## Adding New Configs

1. Create JSON file in `src/config/`
2. Add TypeScript interface in `src/lib/types.ts`
3. Create loader function in `src/lib/config-loader.ts`
4. Update SPEC.md

## Constraints

- All configs stored as editable JSON in `src/config/`
- No hardcoded values — everything editable
- Opaque identifiers preserved exactly as written
- Config changes don't require code changes
