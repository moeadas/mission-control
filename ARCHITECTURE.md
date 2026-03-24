# Mission Control - Agency OS

**Version:** 2.0 (Phase 1)
**Last Updated:** 2026-03-24

---

## Overview

Mission Control is an AI-powered virtual creative agency command center. It enables agencies to run campaigns with structured workflows, specialized AI agents, and professional quality gates.

---

## Architecture Philosophy

**Config-Driven, Not Hardcoded**

All critical business logic is stored in editable JSON config files in `/src/config/`:

- Agents don't have hardcoded prompts — they use templates from `agent-roles/`
- Workflows aren't embedded in code — they're defined in `workflows/`
- Tools aren't hardcoded — they're configured in `tools/`
- Client structures aren't fixed — they're templated in `client-templates/`

This means you can optimize, add to, and customize the entire agency behavior by editing JSON files — no code changes needed.

---

## Config Files

### `/src/config/workflows/campaign-workflows.json`

Defines standard agency workflows. Each workflow has:
- **Phases**: Logical groupings of activities (Intake → Strategy → Creative → Review → Delivery)
- **Activities**: Individual tasks with checklist items
- **Assigned Roles**: Which agent role handles each activity
- **Inputs/Outputs**: What each activity consumes and produces
- **Timeline**: Default durations per phase

**Current Workflows:**
- `campaign-brief`: Full campaign from intake to launch
- `social-content`: Social media content pipeline
- `ad-creative`: Ad creative production with A/B testing

**Adding a new workflow:** Copy an existing workflow JSON, modify phases/activities, add to array.

---

### `/src/config/agent-roles/agent-roles.json`

Defines agent roles with full professional context:

- **Methodology**: The framework/approach this role uses (e.g., "Agile/Scrum", "Keller's Brand Equity")
- **Core Competencies**: What this role does well
- **Tools**: Which tools this role uses (references `tools-config.json`)
- **Responsibilities**: Key duties
- **Work Products**: What deliverables this role produces
- **Handoff Protocol**: Who this role receives from and delivers to
- **Quality Checkpoints**: Standards this role must meet
- **AI Config**: Provider, model, temperature, and **system prompt template** with `{{variables}}`

**Key Feature: System Prompt Templates**

```json
"aiConfig": {
  "systemPromptTemplate": "You are a Brand Strategist specializing in {{industry}}. 
    You follow the Keller's Brand Equity model. Current project: {{project}}."
}
```

The `{{variables}}` get replaced at runtime with project-specific context, giving each agent tailored instructions.

---

### `/src/config/tools/tools-config.json`

All tools the agency can use, organized by category:
- **Productivity**: Linear, Notion, Asana, Trello, Google Sheets
- **Advertising**: Google Ads, Meta Business, TikTok Ads, LinkedIn Ads
- **Analytics**: GA4, Search Console, SEMrush, Ahrefs, Hotjar
- **Creative**: Figma, Canva, Adobe CC, Image Generation
- **Communication**: Slack, Zoom, Email
- **Research**: Web Search, Social Listening, Surveys
- **Content**: WordPress, Webflow, Social Scheduling
- **Document**: PDF/DOCX generation, E-Signature

Each tool has:
- **Actions**: What the tool can do (referenced by workflows)
- **API Status**: Whether it's connected
- **Documentation**: Link to API docs

---

### `/src/config/client-templates/client-templates.json`

Client onboarding templates. Each template has:
- **Sections**: Logical groupings of fields
- **Fields**: Label, type (text/textarea/select/url/color/toggle), required status

**Current Templates:**
- `default`: Standard client with brand, audience, competitive landscape, goals
- `ecommerce`: Retail-specific with funnel metrics (AOV, conversion rate, cart abandonment)
- `saas`: SaaS metrics (MRR, ARR, churn, LTV:CAC ratio)
- `healthcare`: Compliance-first with HIPAA considerations

---

### `/src/config/checkpoints/quality-checkpoints.json`

Quality gates that must pass before moving phases:
- **Strategy Approved**: Research complete, audience validated, positioning clear, KPIs defined
- **Creative Approved**: Copy complete, visuals complete, brand compliance, technical specs met
- **Client Approved**: Presentation ready, feedback incorporated, formal approval received
- **Delivery Approved**: Campaigns set up, assets uploaded, launch verified

Also includes `qualityStandards` — minimum requirements for each discipline (min data sources, required documents, etc.)

---

## Workflow Engine

### How It Works

1. **Workflow Selected**: User picks a workflow template (e.g., "Campaign Brief")
2. **Client Context Injected**: Client data fills in workflow variables
3. **Phases Activated**: Activities unlock in order as previous phase completes
4. **Agent Tasks Generated**: Each activity creates a task assigned to the appropriate role
5. **Checkpoints Enforced**: Phase gates require all checklist items checked
6. **Handoffs Tracked**: Tasks show who receives from whom and delivery status

### Workflow JSON Structure

```json
{
  "id": "campaign-brief",
  "phases": [
    {
      "id": "intake",
      "name": "Intake & Discovery",
      "order": 1,
      "activities": [
        {
          "id": "intake-1",
          "name": "Client Brief Collection",
          "assignedRole": "client-services",
          "inputs": ["client-questionnaire"],
          "outputs": ["collected-brief"],
          "checklist": [
            "Business objectives confirmed",
            "Target audience defined"
          ]
        }
      ]
    }
  ]
}
```

---

## Agent System

### Role-Based, Not Agent-Specific

Agents are assigned **roles**, not fixed personalities. The same agent can operate as Brand Strategist on one project and Media Planner on another.

Each **Agent Instance** has:
- Assigned roles
- Current task(s)
- Status (active/idle/paused)
- Workload capacity

Each **Role Definition** (from `agent-roles.json`) has:
- Methodology and competencies
- Tools and responsibilities
- Handoff protocols
- Quality checkpoints
- AI configuration

### Agent Card View

Shows:
- Role and division
- Current assignments
- Availability/workload
- Key competencies
- Methodological approach

---

## Phase 2+ Roadmap

### Phase 2: Production Pipeline
- [ ] Production Pipeline dashboard with Kanban
- [ ] Handoff protocol tracking between agents
- [ ] Quality checkpoint UI and enforcement
- [ ] Real-time progress tracking

### Phase 3: Tool Integrations
- [ ] OAuth connections to ad platforms
- [ ] Linear/Notion API integration
- [ ] Figma asset management
- [ ] Slack notifications

### Phase 4: Intelligence
- [ ] Performance analytics dashboard
- [ ] AI learning from past campaigns
- [ ] Predictive timelines
- [ ] Automated A/B analysis

---

## Quick Reference

| Config File | What It Controls | How to Edit |
|------------|------------------|-------------|
| `workflows/*.json` | Agency processes | Add phases, activities, checklists |
| `agent-roles/*.json` | Agent behavior | Edit prompts, tools, responsibilities |
| `tools/*.json` | Available tools | Add integrations, actions |
| `client-templates/*.json` | Client structure | Add fields, sections, templates |
| `checkpoints/*.json` | Quality gates | Modify requirements |

---

## Philosophy

**Professional Agency Standards**
Each workflow, role, and tool is modeled after real agency best practices — not generic AI chat.

**Editable by Non-Developers**
All configs are JSON — readable and editable without coding. Future UI will make this even easier.

**Handoff-First Design**
Work flows between agents formally, with documented inputs/outputs — like a real agency handoff.

**Quality Gates**
Nothing moves forward until checkpoints pass — ensuring consistent output quality.
