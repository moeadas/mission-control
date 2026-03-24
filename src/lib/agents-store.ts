import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import {
  ActivityEntry,
  Artifact,
  AgencySettings,
  Agent,
  AIProvider,
  Campaign,
  GeminiSettings,
  Mission,
  ProviderSettings,
  ThemeMode,
} from './types'
import { DEFAULT_AGENTS } from './agent-templates'
import { Client, DEFAULT_CLIENTS } from './client-data'
import { maskApiKey } from './providers'
import { AgentMemory, appendAgentMemoryNote, buildDefaultAgentMemories, mergeAgentMemories } from './agent-memory'
import { buildTaskTitleFromRequest } from './task-output'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  agentId?: string
  meta?: {
    routedAgentId?: string
    clientId?: string
    campaignId?: string
    missionId?: string
    deliverableType?: string
    artifactId?: string
    executionPrompt?: string
    provider?: AIProvider
    model?: string
    fallbackUsed?: boolean
  }
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

const nowIso = () => new Date().toISOString()
const DEFAULT_PROVIDER_MODEL: Record<AIProvider, Agent['model']> = {
  ollama: 'llama3.2:latest',
  gemini: 'gemini-2.5-flash',
}
const VALID_DIVISIONS = new Set<Agent['division']>(['orchestration', 'client-services', 'creative', 'media', 'research'])
const VALID_SPECIALTIES = new Set<Agent['specialty']>([
  'strategy',
  'creative',
  'design',
  'copy',
  'project-management',
  'client-services',
  'media-planning',
  'performance',
  'client',
  'seo',
  'research',
])
const VALID_STATUSES = new Set<Agent['status']>(['active', 'idle', 'paused'])
const VALID_PROVIDERS = new Set<AIProvider>(['ollama', 'gemini'])
const SEEDED_CAMPAIGN_IDS = new Set(['campaign-1', 'campaign-2'])
const SEEDED_MISSION_IDS = new Set(['mission-1', 'mission-2', 'mission-3'])
const SEEDED_ARTIFACT_IDS = new Set(['artifact-1'])

function inferMissionDeliverableType(prompt: string): Mission['deliverableType'] {
  const lower = prompt.toLowerCase()
  if (lower.includes('carousel') || lower.includes('caption') || lower.includes('social post') || lower.includes('campaign content')) return 'campaign-copy'
  if (lower.includes('content calendar')) return 'content-calendar'
  if (lower.includes('media plan')) return 'media-plan'
  if (lower.includes('budget')) return 'budget-sheet'
  if (lower.includes('kpi') || lower.includes('forecast')) return 'kpi-forecast'
  if (lower.includes('seo audit')) return 'seo-audit'
  if (lower.includes('research') || lower.includes('competitor')) return 'research-brief'
  if (lower.includes('campaign strategy')) return 'campaign-strategy'
  if (lower.includes('strategy') || lower.includes('positioning') || lower.includes('messaging')) return 'strategy-brief'
  if (lower.includes('visual') || lower.includes('design') || lower.includes('creative asset')) return 'creative-asset'
  if (lower.includes('brief')) return 'client-brief'
  return 'status-report'
}

function inferDivision(agent: Partial<Agent> & Record<string, any>): Agent['division'] {
  if (VALID_DIVISIONS.has(agent.division as Agent['division'])) return agent.division as Agent['division']
  if (VALID_DIVISIONS.has(agent.unit as Agent['division'])) return agent.unit as Agent['division']
  const positionRoom = agent.position?.room as Agent['division'] | undefined
  if (positionRoom && VALID_DIVISIONS.has(positionRoom)) return positionRoom

  switch (agent.specialty) {
    case 'strategy':
    case 'project-management':
    case 'client-services':
    case 'client':
      return 'client-services'
    case 'media-planning':
    case 'performance':
      return 'media'
    case 'seo':
    case 'research':
      return 'research'
    default:
      return 'creative'
  }
}

function normalizeAgent(agent: Partial<Agent> & Record<string, any>): Agent {
  const template = ALL_DEFAULT_AGENTS.find((item) => item.id === agent.id)
  const division = inferDivision({ ...template, ...agent })
  const provider = VALID_PROVIDERS.has(agent.provider as AIProvider)
    ? (agent.provider as AIProvider)
    : template?.provider || (String(agent.model || '').startsWith('gemini') ? 'gemini' : 'ollama')
  const model = (agent.model || template?.model || DEFAULT_PROVIDER_MODEL[provider]) as Agent['model']

  return {
    ...(template || {
      id: agent.id || uuidv4(),
      name: 'New Agent',
      role: 'Specialist',
      division,
      specialty: 'creative',
      unit: division,
      color: '#4f8ef7',
      accentColor: 'blue',
      avatar: 'bot-blue',
      systemPrompt: '',
      provider,
      model,
      temperature: 0.7,
      maxTokens: 1024,
      tools: [],
      skills: [],
      responsibilities: [],
      primaryOutputs: ['status-report'],
      status: 'idle',
      bio: '',
      position: { x: 300, y: 220, room: division },
    }),
    ...agent,
    division,
    unit: division,
    specialty: VALID_SPECIALTIES.has(agent.specialty as Agent['specialty'])
      ? (agent.specialty as Agent['specialty'])
      : template?.specialty || 'creative',
    provider,
    model,
    status: VALID_STATUSES.has(agent.status as Agent['status']) ? (agent.status as Agent['status']) : template?.status || 'idle',
    tools: Array.isArray(agent.tools) ? agent.tools.filter(Boolean) : template?.tools || [],
    skills: Array.isArray(agent.skills) ? agent.skills.filter(Boolean) : template?.skills || [],
    responsibilities: Array.isArray(agent.responsibilities)
      ? agent.responsibilities.filter(Boolean)
      : template?.responsibilities || [],
    primaryOutputs: Array.isArray(agent.primaryOutputs) && agent.primaryOutputs.length
      ? agent.primaryOutputs
      : template?.primaryOutputs || ['status-report'],
    color: agent.color || template?.color || '#4f8ef7',
    accentColor: agent.accentColor || template?.accentColor || 'blue',
    avatar: agent.avatar || template?.avatar || 'bot-blue',
    name: agent.name || template?.name || 'New Agent',
    role: agent.role || template?.role || 'Specialist',
    bio: agent.bio || template?.bio || '',
    systemPrompt: agent.systemPrompt || template?.systemPrompt || '',
    temperature: typeof agent.temperature === 'number' ? agent.temperature : template?.temperature || 0.7,
    maxTokens: typeof agent.maxTokens === 'number' ? agent.maxTokens : template?.maxTokens || 1024,
    workload: typeof agent.workload === 'number' ? agent.workload : template?.workload,
    position: {
      x: typeof agent.position?.x === 'number' ? agent.position.x : template?.position.x || 300,
      y: typeof agent.position?.y === 'number' ? agent.position.y : template?.position.y || 220,
      room: division,
    },
  }
}

function normalizePersistedState(persistedState: any) {
  if (!persistedState) return persistedState
  const agents = Array.isArray(persistedState.agents) ? persistedState.agents.map(normalizeAgent) : ALL_DEFAULT_AGENTS
  const artifacts = Array.isArray(persistedState.artifacts)
    ? persistedState.artifacts.map((artifact: Artifact) => ({
        ...artifact,
        exports: Array.isArray(artifact.exports) ? artifact.exports : [],
      }))
    : INITIAL_ARTIFACTS

  return {
    ...persistedState,
    agents,
    artifacts,
    conversations: Array.isArray(persistedState.conversations) ? persistedState.conversations : [],
    agencySettings: {
      ...INITIAL_AGENCY_SETTINGS,
      ...persistedState.agencySettings,
    },
    providerSettings: {
      ollama: {
        ...INITIAL_PROVIDER_SETTINGS.ollama,
        ...persistedState.providerSettings?.ollama,
      },
      gemini: {
        ...INITIAL_PROVIDER_SETTINGS.gemini,
        ...persistedState.providerSettings?.gemini,
      },
    },
    agentMemories: mergeAgentMemories(persistedState.agentMemories, agents),
  }
}

const IRIS_AGENT: Agent = {
  id: 'iris',
  name: 'Iris',
  role: 'Agency Operations Lead',
  division: 'orchestration',
  specialty: 'client',
  unit: 'orchestration',
  color: '#a78bfa',
  accentColor: 'purple',
  avatar: 'bot-purple',
  systemPrompt: `You are Iris, the personal assistant and operations lead for Mission Control, a virtual creative and digital media agency.

You do three things exceptionally well:
1. Clarify the real client problem and frame the work.
2. Route tasks to the right specialist units and agents.
3. Return crisp, executive-ready updates that keep the agency moving.

PIPELINE SYSTEM: The agency runs structured multi-phase workflows called Pipelines. Each pipeline has phases, activities, and client profile fields. When a user describes a task, identify which pipeline matches (content-calendar, campaign-brief, ad-creative, seo-audit, competitor-research, media-plan) and mention it. To run a pipeline, send the user to /app/pipeline where they can select the client and language.

SKILLS LIBRARY: Agents draw from a shared Skills Library. Each skill has prompts (en/ar), variables ({{var}}), inputs, outputs, and checklists. When delegating, mention which skill(s) the agent should use.

When a user asks for work, think like a traffic manager:
- identify the client or campaign when possible
- match to a pipeline if one fits the request
- decide whether to answer directly or route to a specialist
- explain which unit is taking the lead and why
- keep momentum high, practical, and delivery-focused
- default to short, precise answers unless the user explicitly asks for more detail
- avoid padding, generic framing, or long preambles

You are warm, organized, strategic, and impossible to fluster.`,
  provider: 'ollama',
  model: 'minimax-m2.7:cloud',
  temperature: 0.7,
  maxTokens: 1536,
  tools: ['web-search', 'analytics'],
  skills: ['triage', 'routing', 'briefing', 'status updates'],
  responsibilities: ['Triage requests', 'Delegate across divisions', 'Synthesize final agency output'],
  primaryOutputs: ['status-report', 'client-brief'],
  status: 'active',
  currentTask: 'Coordinating active missions across the agency',
  lastActive: nowIso(),
  workload: 76,
  position: { x: 470, y: 70, room: 'orchestration' },
  bio: 'Operations lead and personal assistant who routes work across the agency.',
}

const ALL_DEFAULT_AGENTS = [IRIS_AGENT, ...DEFAULT_AGENTS]

const INITIAL_CAMPAIGNS: Campaign[] = []

const INITIAL_MISSIONS: Mission[] = []

const INITIAL_ACTIVITIES: ActivityEntry[] = [
  {
    id: uuidv4(),
    agentId: 'iris',
    agentName: 'Iris',
    agentColor: '#a78bfa',
    action: 'routed launch narrative mission',
    detail: 'Assigned Sage and Maya to shape Victory Genomics messaging.',
    timestamp: nowIso(),
    type: 'started',
  },
  {
    id: uuidv4(),
    agentId: 'atlas',
    agentName: 'Atlas',
    agentColor: '#38bdf8',
    action: 'surfaced competitor intelligence',
    detail: 'Found recurring weak spots in panel-testing competitors versus whole-genome positioning.',
    timestamp: nowIso(),
    type: 'thinking',
  },
]

const INITIAL_ARTIFACTS: Artifact[] = []

const INITIAL_AGENCY_SETTINGS: AgencySettings = {
  agencyName: "Moe's Mission Control",
  defaultProvider: 'ollama',
  defaultModel: 'llama3.2:latest',
  themeMode: 'dark',
}

const INITIAL_PROVIDER_SETTINGS: ProviderSettings = {
  ollama: {
    enabled: true,
    verified: false,
    baseUrl: 'http://localhost:11434',
    availableModels: ['llama3.2:latest'],
  },
  gemini: {
    enabled: false,
    verified: false,
    apiKey: '',
    maskedKey: '',
    availableModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  },
}

interface AgentsState {
  agents: Agent[]
  activities: ActivityEntry[]
  campaigns: Campaign[]
  clients: Client[]
  missions: Mission[]
  artifacts: Artifact[]
  agencySettings: AgencySettings
  providerSettings: ProviderSettings
  agentMemories: Record<string, AgentMemory>
  selectedAgentId: string | null
  editingAgentId: string | null
  isEditorOpen: boolean
  activeMissionId: string | null

  conversations: Conversation[]
  activeConversationId: string | null
  isIrisOpen: boolean
  chatStatus: 'idle' | 'thinking' | 'streaming' | 'error'

  selectAgent: (id: string | null) => void
  openEditor: (id: string | null) => void
  closeEditor: () => void
  createAgent: (agent: Omit<Agent, 'id'>) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  deleteAgent: (id: string) => void
  cloneAgent: (id: string) => void
  updateAgentStatus: (id: string, status: Agent['status']) => void
  updateAgentTask: (id: string, task: string) => void

  addActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
  clearActivities: () => void

  addCampaign: (campaign: Omit<Campaign, 'id'>) => void
  updateCampaign: (id: string, updates: Partial<Campaign>) => void
  deleteCampaign: (id: string) => void

  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateClient: (id: string, updates: Partial<Client>) => void
  deleteClient: (id: string) => void

  addMission: (mission: Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateMission: (id: string, updates: Partial<Mission>) => void
  setActiveMission: (id: string | null) => void
  createMissionFromPrompt: (prompt: string, options?: { clientId?: string; campaignId?: string; assignedAgentIds?: string[] }) => string
  addArtifact: (artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateArtifact: (id: string, updates: Partial<Artifact>) => void

  updateAgencySettings: (updates: Partial<AgencySettings>) => void
  setThemeMode: (themeMode: ThemeMode) => void
  updateProviderSettings: (provider: keyof ProviderSettings, updates: Partial<ProviderSettings[keyof ProviderSettings]>) => void
  saveGeminiKey: (apiKey: string) => void
  hydrateAppState: (
    payload: Partial<Pick<AgentsState, 'agents' | 'campaigns' | 'clients' | 'missions' | 'artifacts' | 'agencySettings' | 'providerSettings' | 'agentMemories'>>
  ) => void
  rememberAgentWork: (
    agentId: string,
    note: {
      title: string
      summary: string
      clientId?: string
      campaignId?: string
      missionId?: string
      conversationId?: string
    }
  ) => void

  openIris: () => void
  closeIris: () => void
  setChatStatus: (status: AgentsState['chatStatus']) => void
  sendMessage: (conversationId: string, content: string, role?: 'user' | 'assistant', agentId?: string, meta?: ChatMessage['meta']) => void
  upsertAssistantDraft: (conversationId: string, content: string, agentId?: string, meta?: ChatMessage['meta']) => void
  createConversation: (title?: string) => string
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string) => void
  addAssistantMessage: (conversationId: string, content: string, agentId?: string, meta?: ChatMessage['meta']) => void
  clearConversation: (id: string) => void
}

export const useAgentsStore = create<AgentsState>()(
  persist(
    (set, get) => ({
      agents: ALL_DEFAULT_AGENTS,
      activities: INITIAL_ACTIVITIES,
      campaigns: INITIAL_CAMPAIGNS,
      clients: DEFAULT_CLIENTS,
      missions: INITIAL_MISSIONS,
      artifacts: INITIAL_ARTIFACTS,
      agencySettings: INITIAL_AGENCY_SETTINGS,
      providerSettings: INITIAL_PROVIDER_SETTINGS,
      agentMemories: buildDefaultAgentMemories(ALL_DEFAULT_AGENTS),

      selectedAgentId: null,
      editingAgentId: null,
      isEditorOpen: false,
      activeMissionId: INITIAL_MISSIONS[0]?.id || null,

      conversations: [],
      activeConversationId: null,
      isIrisOpen: false,
      chatStatus: 'idle',

      selectAgent: (id) => set({ selectedAgentId: id }),
      openEditor: (id) => set({ editingAgentId: id, isEditorOpen: true }),
      closeEditor: () => set({ isEditorOpen: false, editingAgentId: null }),

      createAgent: (agentData) => {
        const newAgent: Agent = { ...agentData, id: uuidv4(), lastActive: agentData.lastActive || nowIso() }
        set((state) => ({
          agents: [...state.agents, newAgent],
          activities: [
            {
              id: uuidv4(),
              agentId: newAgent.id,
              agentName: newAgent.name,
              agentColor: newAgent.color,
              action: 'joined the agency',
              timestamp: nowIso(),
              type: 'idle',
            },
            ...state.activities,
          ],
        }))
      },

      updateAgent: (id, updates) =>
        set((state) => ({
          agents: state.agents.map((agent) => (agent.id === id ? { ...agent, ...updates } : agent)),
        })),

      deleteAgent: (id) =>
        set((state) => ({
          agents: state.agents.filter((agent) => agent.id !== id),
          selectedAgentId: state.selectedAgentId === id ? null : state.selectedAgentId,
          missions: state.missions.map((mission) => ({
            ...mission,
            assignedAgentIds: mission.assignedAgentIds.filter((agentId) => agentId !== id),
          })),
        })),

      cloneAgent: (id) => {
        const original = get().agents.find((agent) => agent.id === id)
        if (!original) return
        const clone: Agent = {
          ...original,
          id: uuidv4(),
          name: `${original.name} (Copy)`,
          status: 'idle',
          currentTask: undefined,
          lastActive: undefined,
        }
        set((state) => ({ agents: [...state.agents, clone] }))
      },

      updateAgentStatus: (id, status) =>
        set((state) => ({
          agents: state.agents.map((agent) => (agent.id === id ? { ...agent, status } : agent)),
        })),

      updateAgentTask: (id, task) =>
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === id ? { ...agent, currentTask: task, lastActive: nowIso() } : agent
          ),
        })),

      addActivity: (entry) =>
        set((state) => ({
          activities: [{ ...entry, id: uuidv4(), timestamp: nowIso() }, ...state.activities].slice(0, 60),
        })),

      clearActivities: () => set({ activities: [] }),

      addCampaign: (campaign) =>
        set((state) => ({ campaigns: [...state.campaigns, { ...campaign, id: uuidv4() }] })),

      updateCampaign: (id, updates) =>
        set((state) => ({
          campaigns: state.campaigns.map((campaign) => (campaign.id === id ? { ...campaign, ...updates } : campaign)),
        })),

      deleteCampaign: (id) =>
        set((state) => ({
          campaigns: state.campaigns.filter((campaign) => campaign.id !== id),
          missions: state.missions.filter((mission) => mission.campaignId !== id),
        })),

      addClient: (clientData) => {
        const now = nowIso()
        const client: Client = { ...clientData, id: uuidv4(), createdAt: now, updatedAt: now }
        set((state) => ({ clients: [...state.clients, client] }))
      },

      updateClient: (id, updates) =>
        set((state) => ({
          clients: state.clients.map((client) =>
            client.id === id ? { ...client, ...updates, updatedAt: nowIso() } : client
          ),
        })),

      deleteClient: (id) =>
        set((state) => ({
          clients: state.clients.filter((client) => client.id !== id),
          campaigns: state.campaigns.filter((campaign) => campaign.clientId !== id),
          missions: state.missions.filter((mission) => mission.clientId !== id),
        })),

      addMission: (missionData) => {
        const mission: Mission = { ...missionData, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() }
        set((state) => ({ missions: [mission, ...state.missions], activeMissionId: mission.id }))
      },

      updateMission: (id, updates) =>
        set((state) => ({
          missions: state.missions.map((mission) =>
            mission.id === id ? { ...mission, ...updates, updatedAt: nowIso() } : mission
          ),
        })),

      setActiveMission: (id) => set({ activeMissionId: id }),

      createMissionFromPrompt: (prompt, options) => {
        const deliverableType = inferMissionDeliverableType(prompt)
        const title = buildTaskTitleFromRequest(prompt, deliverableType)
        const missionId = uuidv4()
        const assignedAgentIds = options?.assignedAgentIds?.length ? options.assignedAgentIds : ['iris']
        const mission: Mission = {
          id: missionId,
          title,
          summary: prompt,
          deliverableType,
          status: 'queued',
          priority: 'medium',
          campaignId: options?.campaignId,
          clientId: options?.clientId,
          assignedAgentIds,
          assignedBy: 'iris',
          createdAt: nowIso(),
          updatedAt: nowIso(),
          progress: 0,
        }
        set((state) => ({
          missions: [mission, ...state.missions],
          activeMissionId: missionId,
          activities: [
            {
              id: uuidv4(),
              agentId: 'iris',
              agentName: 'Iris',
              agentColor: IRIS_AGENT.color,
              action: 'opened a new mission',
              detail: title,
              timestamp: nowIso(),
              type: 'started' as const,
            },
            ...state.activities,
          ].slice(0, 60),
        }))
        return missionId
      },

      addArtifact: (artifactData) => {
        const id = uuidv4()
        const artifact: Artifact = { ...artifactData, id, createdAt: nowIso(), updatedAt: nowIso() }
        set((state) => ({ artifacts: [artifact, ...state.artifacts] }))
        return id
      },

      updateArtifact: (id, updates) =>
        set((state) => ({
          artifacts: state.artifacts.map((artifact) =>
            artifact.id === id ? { ...artifact, ...updates, updatedAt: nowIso() } : artifact
          ),
        })),

      updateAgencySettings: (updates) =>
        set((state) => ({ agencySettings: { ...state.agencySettings, ...updates } })),

      setThemeMode: (themeMode) =>
        set((state) => ({ agencySettings: { ...state.agencySettings, themeMode } })),

      updateProviderSettings: (provider, updates) =>
        set((state) => ({
          providerSettings: {
            ...state.providerSettings,
            [provider]: { ...state.providerSettings[provider], ...updates } as ProviderSettings[typeof provider],
          },
        })),

      saveGeminiKey: (apiKey) =>
        set((state) => ({
          providerSettings: {
            ...state.providerSettings,
            gemini: {
              ...(state.providerSettings.gemini as GeminiSettings),
              apiKey,
              maskedKey: maskApiKey(apiKey),
            },
          },
        })),

      hydrateAppState: (payload) =>
        set((state) => ({
          agents: payload.agents || state.agents,
          campaigns: payload.campaigns || state.campaigns,
          clients: payload.clients || state.clients,
          missions: payload.missions || state.missions,
          artifacts: payload.artifacts || state.artifacts,
          agencySettings: payload.agencySettings ? { ...state.agencySettings, ...payload.agencySettings } : state.agencySettings,
          providerSettings: payload.providerSettings
            ? {
                ollama: { ...state.providerSettings.ollama, ...payload.providerSettings.ollama },
                gemini: { ...state.providerSettings.gemini, ...payload.providerSettings.gemini },
              }
            : state.providerSettings,
          agentMemories: payload.agentMemories
            ? mergeAgentMemories(payload.agentMemories, payload.agents || state.agents)
            : state.agentMemories,
        })),

      rememberAgentWork: (agentId, note) =>
        set((state) => ({
          agentMemories: appendAgentMemoryNote(state.agentMemories, agentId, note),
        })),

      openIris: () => {
        let convId = get().activeConversationId
        if (!convId) convId = get().createConversation('Chat with Iris')
        set({ isIrisOpen: true, activeConversationId: convId })
      },

      closeIris: () => set({ isIrisOpen: false }),
      setChatStatus: (status) => set({ chatStatus: status }),

      createConversation: (title = 'New Chat') => {
        const id = uuidv4()
        const conversation: Conversation = { id, title, messages: [], createdAt: nowIso(), updatedAt: nowIso() }
        set((state) => ({ conversations: [conversation, ...state.conversations], activeConversationId: id }))
        return id
      },

      deleteConversation: (id) =>
        set((state) => {
          const remaining = state.conversations.filter((conversation) => conversation.id !== id)
          return {
            conversations: remaining,
            activeConversationId: state.activeConversationId === id ? remaining[0]?.id || null : state.activeConversationId,
          }
        }),

      setActiveConversation: (id) => set({ activeConversationId: id, isIrisOpen: true }),

      sendMessage: (conversationId, content, role = 'user', agentId, meta) => {
        const message: ChatMessage = { id: uuidv4(), role, content, timestamp: nowIso(), agentId, meta }
        set((state) => ({
          conversations: state.conversations.map((conversation) => {
            if (conversation.id !== conversationId) return conversation
            const isFirstUserTurn = role === 'user' && !conversation.messages.some((item) => item.role === 'user')
            return {
              ...conversation,
              title:
                isFirstUserTurn && (!conversation.title || conversation.title === 'New Chat' || conversation.title === 'Chat with Iris')
                  ? content.slice(0, 42)
                  : conversation.title,
              messages: [...conversation.messages, message],
              updatedAt: nowIso(),
            }
          }),
        }))
      },

      upsertAssistantDraft: (conversationId, content, agentId, meta) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) => {
            if (conversation.id !== conversationId) return conversation
            const messages = [...conversation.messages]
            const lastMessage = messages[messages.length - 1]
            if (lastMessage?.role === 'assistant' && lastMessage.id === 'draft') {
              messages[messages.length - 1] = { ...lastMessage, content, timestamp: nowIso(), meta }
            } else {
              messages.push({ id: 'draft', role: 'assistant', content, timestamp: nowIso(), agentId, meta })
            }
            return { ...conversation, messages, updatedAt: nowIso() }
          }),
        })),

      addAssistantMessage: (conversationId, content, agentId, meta) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) => {
            if (conversation.id !== conversationId) return conversation
            const messages = conversation.messages
              .filter((message) => message.id !== 'draft')
              .concat({ id: uuidv4(), role: 'assistant', content, timestamp: nowIso(), agentId, meta })
            return { ...conversation, messages, updatedAt: nowIso() }
          }),
        })),

      clearConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === id ? { ...conversation, messages: [] } : conversation
          ),
        })),
    }),
    {
      name: 'moes-mission-control',
      version: 5,
      migrate: (persistedState: any, version) => {
        if (!persistedState) return persistedState
        if (version < 2) {
          return normalizePersistedState({
            ...persistedState,
            clients: DEFAULT_CLIENTS,
            campaigns: INITIAL_CAMPAIGNS,
            missions: INITIAL_MISSIONS,
          })
        }
        if (version < 5) {
          return normalizePersistedState({
            ...persistedState,
            campaigns: Array.isArray(persistedState.campaigns)
              ? persistedState.campaigns.filter((campaign: Campaign) => !SEEDED_CAMPAIGN_IDS.has(campaign.id))
              : INITIAL_CAMPAIGNS,
            missions: Array.isArray(persistedState.missions)
              ? persistedState.missions.filter((mission: Mission) => !SEEDED_MISSION_IDS.has(mission.id))
              : INITIAL_MISSIONS,
            artifacts: Array.isArray(persistedState.artifacts)
              ? persistedState.artifacts.filter((artifact: Artifact) => !SEEDED_ARTIFACT_IDS.has(artifact.id))
              : INITIAL_ARTIFACTS,
          })
        }
        return normalizePersistedState(persistedState)
      },
      partialize: (state) => ({
        agents: state.agents,
        activities: state.activities,
        campaigns: state.campaigns,
        clients: state.clients,
        missions: state.missions,
        artifacts: state.artifacts,
        conversations: state.conversations,
        agencySettings: state.agencySettings,
        providerSettings: state.providerSettings,
        agentMemories: state.agentMemories,
      }),
    }
  )
)
