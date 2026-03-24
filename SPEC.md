# Agency Mission Control — SPEC.md

## 1. Concept & Vision

**Agency Mission Control** is a browser-based command center that gives a creative/digital marketing agency a living, breathing virtual office. It feels like a cross between a NASA control room and a stylish co-working space — professional but alive, with animated bot agents doing their thing in real-time. The aesthetic is **dark-mode ops center** with neon accent glows, making it feel like you're piloting something powerful.

The vibe: *"The agency is always running, even when you're not watching."*

---

## 2. Design Language

### Aesthetic Direction
Dark ops-center with glassmorphism panels. Think: control room for a creative agency — clean, purposeful, with subtle energy. Not gamer-dark, not corporate-gray — **modern command center**.

### Color Palette
```
--bg-base:        #0d0f14        (deep space black)
--bg-panel:       #141720        (panel surface)
--bg-card:        #1a1e2a        (card / elevated surface)
--border:         #2a2f3d        (subtle borders)
--border-glow:    #3d4459        (hover borders)

--text-primary:   #e8eaf0        (bright white)
--text-secondary: #8b92a8        (muted)
--text-dim:       #555b73        (disabled / placeholder)

--accent-blue:    #4f8ef7        (primary actions, links)
--accent-purple:  #9b6dff        (strategy / planning agents)
--accent-cyan:    #00d4aa        (creative / design agents)
--accent-orange:  #ff7c42        (production / dev agents)
--accent-pink:    #ff5fa0        (analytics / insights)
--accent-yellow:  #ffd166        (client services)

--glow-blue:      rgba(79, 142, 247, 0.15)
--glow-purple:    rgba(155, 109, 255, 0.15)
--glow-cyan:      rgba(0, 212, 170, 0.15)
```

### Typography
- **Headings:** `Space Grotesk` — bold, technical, agency-forward
- **UI Labels:** `JetBrains Mono` — monospace for that ops feel
- **Body:** `DM Sans` — clean, readable, friendly

### Spatial System
- Base unit: 8px
- Panels: 16px padding, 12px border-radius
- Cards: 20px padding, 16px border-radius
- Gaps: 12px (tight), 20px (normal), 32px (spacious)

### Motion Philosophy
- **Agents:** Continuous subtle float/pulse animations (never static)
- **Panels:** Fade + slide-up on mount (200ms ease-out, staggered 50ms)
- **Hover states:** 150ms ease transitions with subtle glow expansion
- **Bot activity:** Smooth CSS keyframe animations — bobbing, blinking, typing indicators
- **Tab transitions:** Horizontal slide with opacity fade (250ms)

### Visual Assets
- **Icons:** Lucide React (consistent 20px stroke icons)
- **Agent avatars:** Custom SVG bot faces, each with a distinct personality color
- **Decorative:** Subtle grid pattern on background, scan-line overlay on office view

---

## 3. Layout & Structure

### App Shell
```
┌─────────────────────────────────────────────────────┐
│  TOPBAR: Logo | Mission Control title | Status bar  │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│  LAYERED │         MAIN CONTENT AREA               │
│   MENU   │    (switches based on active tab)       │
│  (LEFT)  │                                          │
│          │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

### Layered Menu Tabs (Left Sidebar)
Each tab opens a **layer** — a distinct view. Layers can have sub-tabs.

**Layer 1 — Dashboard** *(default view)*
- Agency overview metrics
- Active agents at a glance
- Recent activity feed
- Quick-actions panel

**Layer 2 — Virtual Office**
- 2D animated office floor plan
- Agent bots moving/working at stations
- Click agent → side panel with agent details
- Office themed rooms: Creative Lab, Strategy Room, Production Suite, Analytics Hub

**Layer 3 — Agents**
- Agent roster grid
- Click to expand → full agent config editor
- Add new agent button
- Agent status, specialty, current task, model config

**Layer 4 — Campaigns** *(scope extensible)*
- Campaign cards
- Pipeline view (Kanban-style)
- Agent assignments per campaign

**Layer 5 — Settings**
- Agency profile
- Agent defaults & system prompt templates
- Theme / display preferences
- Import / Export config

### Responsive Strategy
- Desktop-first (1200px+ optimal)
- Tablet: sidebar collapses to icon-only
- Mobile: sidebar becomes bottom sheet

---

## 4. Features & Interactions

### Virtual Office (Layer 2)
- SVG-based 2D floor plan with styled "rooms"
- Each agent is a small animated bot (CSS sprite/div animations)
- Bots have: idle bobbing, working (typing animation), idle with thought bubble, resting
- Clicking a bot opens a quick-view panel (name, role, current task, live log)
- Bots move between stations on task assignment
- Ambient office soundscape toggle (optional)

### Agent System (Layer 3)
- Each agent has:
  - **Name, Role, Specialty tag**
  - **Avatar** (select from preset bot faces, each color-coded)
  - **System Prompt** (textarea — editable, with template snippets)
  - **Model** (dropdown: GPT-4, GPT-3.5, Claude, Gemini)
  - **Temperature, Max Tokens** (sliders)
  - **Tools enabled** (checkboxes: web search, code, image gen, etc.)
  - **Status:** Active / Idle / Paused
- **Add Agent** opens a creation wizard (slide-over panel)
- **Edit Agent** opens full config panel (right slide-over)
- **Clone Agent** — duplicate with new name
- **Delete Agent** — confirmation modal
- Agents are saved to `agents.json` in the project

### Editable Agent Prompts
- Template library: "Social Media Strategist", "Copywriter", "SEO Analyst", "Graphic Designer", "Project Manager"
- Prompt editor with syntax highlighting (CodeMirror or simple textarea with markdown)
- Variables: `{{agency_name}}`, `{{client}}`, `{{campaign_goal}}` — auto-injected at runtime
- Version history for prompts (last 5 saves)

### 2D Bot Animations
Each bot rendered as a styled `<div>` with CSS animations:
- **Idle:** Gentle Y-axis bob (3s ease-in-out infinite)
- **Working:** Faster bob + typing dots animation
- **Thinking:** Slow pulse + "..." bubble
- **Resting:** Dimmed, slower bob
- **Alert:** Glow pulse + slight shake

### Activity Log
- Real-time log of what each agent is doing
- Timestamped entries
- Filterable by agent / action type
- Copy log entry as prompt snippet

### Dashboard Metrics (Layer 1)
- Total agents active
- Tasks completed today
- Campaigns in progress
- Quick-launch buttons for common actions

---

## 5. Component Inventory

### `<TopBar>`
- Logo (SVG) + "Mission Control" wordmark
- Live clock + date
- Connection status dot (green/yellow/red)
- User avatar + dropdown

### `<Sidebar>`
- Layered nav items with icons
- Active state: left border accent + background tint
- Hover: subtle glow
- Collapsed state: icon-only with tooltips

### `<AgentBot>`
- SVG or styled div bot face
- Color from agent's accent color
- Animation class prop
- Tooltip on hover
- Click → open agent panel

### `<AgentCard>`
- Avatar, name, role, specialty badge
- Status indicator (colored dot)
- Current task preview
- Quick actions (edit, pause, delete)
- Hover: lift shadow + border glow

### `<AgentEditor>` (slide-over panel)
- Full form: name, role, avatar picker, system prompt, model config, tools
- Save / Cancel / Delete buttons
- Prompt template inserter toolbar
- Validation (name required, prompt min 50 chars)

### `<OfficeFloor>`
- SVG floor plan
- Room labels
- Agent position markers
- Animated background grid

### `<BotStation>`
- Positioned bot at a coordinate
- Status badge
- Click target for agent details

### `<ActivityFeed>`
- Scrollable log list
- Agent avatar + action text + timestamp
- Action types: "started task", "completed", "error", "thinking"

### `<CampaignCard>`
- Campaign name, client, status badge
- Assigned agents (avatar stack)
- Progress bar
- Due date

### `<TabBar>` (sub-tabs within layers)
- Horizontal scrollable tabs
- Active underline slide animation

### `<Modal>`
- Glassmorphism backdrop
- Slide-up with backdrop blur
- Used for: delete confirmation, agent creation wizard, settings

### `<Toast>`
- Bottom-right notification stack
- Success (cyan), Error (pink), Info (blue)
- Auto-dismiss 4s

---

## 6. Technical Approach

### Stack
- **Next.js 14** (App Router)
- **React 18** with hooks
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Zustand** for state management (agents, UI state)
- **Framer Motion** for layout animations
- **localStorage** for agent config persistence (JSON file generated/importable)

### Architecture
```
/app
  layout.tsx          — root layout with sidebar
  page.tsx           — redirects to /dashboard
  /dashboard
  /office
  /agents
  /campaigns
  /settings

/components
  /ui                — primitives (Button, Card, Modal, Input, etc.)
  /agents            — AgentCard, AgentEditor, AgentBot, AgentAvatar
  /office            — OfficeFloor, BotStation, RoomLabel
  /layout            — TopBar, Sidebar, LayeredNav
  /dashboard         — MetricsCards, ActivityFeed, QuickActions

/lib
  agents-store.ts    — Zustand store for agent state
  agent-templates.ts — default prompt templates
  bot-animations.ts  — CSS keyframe definitions
  types.ts           — TypeScript interfaces

/data
  agents.json        — persisted agent configurations
```

### Agent Data Model
```typescript
interface Agent {
  id: string;                    // uuid
  name: string;                  // "Maya the Strategist"
  role: string;                  // "Chief Strategy Officer"
  specialty: string;             // "strategy" | "creative" | "production" | "analytics" | "client"
  color: string;                 // accent hex
  avatar: string;                // preset avatar id
  systemPrompt: string;
  model: "gpt-4" | "gpt-3.5" | "claude-3" | "gemini-pro";
  temperature: number;           // 0-2
  maxTokens: number;             // 256-4096
  tools: string[];               // ["web-search", "code", "image-gen"]
  status: "active" | "idle" | "paused";
  currentTask?: string;
  lastActive?: string;           // ISO timestamp
  position?: { x: number; y: number; room: string; };
}
```

### Bot Animation CSS
```css
/* idle bob */
@keyframes bot-idle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
/* working - faster bob + typing dots */
@keyframes bot-working {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.02); }
}
/* thinking bubble */
@keyframes bubble-pop {
  0% { opacity: 0; transform: scale(0.8) translateY(4px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
```

### API Routes (if backend needed)
- `GET /api/agents` — list agents
- `POST /api/agents` — create agent
- `PUT /api/agents/:id` — update agent
- `DELETE /api/agents/:id` — delete agent
- `POST /api/agents/:id/talk` — send message to agent

*(For MVP, all state is client-side with localStorage)*

---

## 7. Agency Agents (Default Roster)

| Agent | Role | Specialty | Color |
|-------|------|-----------|-------|
| **Maya** | Chief Strategy Officer | Strategy | Purple |
| **Finn** | Creative Director | Creative | Cyan |
| **Dex** | Head of Production | Production | Orange |
| **Nova** | Analytics Lead | Analytics | Pink |
| **Sage** | Client Services Manager | Client | Yellow |

These 5 are pre-loaded on first launch. User can edit, add, remove.

---

## 8. File Structure

```
agency-mission-control/
├── SPEC.md
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   └── favicon.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── office/
│   │   │   └── page.tsx
│   │   ├── agents/
│   │   │   └── page.tsx
│   │   ├── campaigns/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Slider.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── Select.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout/
│   │   │   ├── TopBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── LayeredNav.tsx
│   │   ├── agents/
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentEditor.tsx
│   │   │   ├── AgentBot.tsx
│   │   │   ├── AgentAvatar.tsx
│   │   │   └── AgentTemplatePicker.tsx
│   │   ├── office/
│   │   │   ├── OfficeFloor.tsx
│   │   │   ├── BotStation.tsx
│   │   │   └── RoomLabel.tsx
│   │   └── dashboard/
│   │       ├── MetricsCards.tsx
│   │       ├── ActivityFeed.tsx
│   │       └── QuickActions.tsx
│   ├── lib/
│   │   ├── agents-store.ts
│   │   ├── agent-templates.ts
│   │   ├── bot-animations.ts
│   │   └── types.ts
│   └── styles/
│       └── globals.css
```
