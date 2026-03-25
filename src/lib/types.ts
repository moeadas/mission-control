export type ThemeMode = 'dark' | 'light'
export type AgentStatus = 'active' | 'idle' | 'paused'
export type AgencyDivision = 'orchestration' | 'client-services' | 'creative' | 'media' | 'research'
export type AgentSpecialty =
  | 'strategy'
  | 'creative'
  | 'design'
  | 'copy'
  | 'project-management'
  | 'client-services'
  | 'media-planning'
  | 'performance'
  | 'client'
  | 'seo'
  | 'research'
export type BotAnimation = 'idle' | 'working' | 'thinking' | 'resting' | 'alert'
export type AIProvider = 'ollama' | 'gemini'
export type AgentModel =
  | 'llama3.2:latest'
  | 'llama3.1:latest'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  | 'gemini-1.0-pro'
  | 'minimax-m2.7:cloud'

export interface ProviderOption {
  id: AgentModel
  label: string
  provider: AIProvider
}

export interface Agent {
  id: string
  name: string
  role: string
  division: AgencyDivision
  specialty: AgentSpecialty
  unit: AgencyDivision
  color: string
  accentColor: string
  avatar: string
  systemPrompt: string
  provider: AIProvider
  model: AgentModel
  temperature: number
  maxTokens: number
  tools: string[]
  skills: string[]
  responsibilities: string[]
  primaryOutputs: DeliverableType[]
  status: AgentStatus
  currentTask?: string
  lastActive?: string
  workload?: number
  position: {
    x: number
    y: number
    room: string
  }
  bio: string
  methodology: string
}

export interface ActivityEntry {
  id: string
  agentId: string
  agentName: string
  agentColor: string
  action: string
  detail?: string
  timestamp: string
  type: 'started' | 'completed' | 'thinking' | 'error' | 'idle'
}

export interface Campaign {
  id: string
  name: string
  clientId: string
  status: 'planning' | 'active' | 'review' | 'completed' | 'paused'
  agents: string[]
  progress: number
  dueDate?: string
  description?: string
}

export interface AgentTemplate {
  id: string
  name: string
  role: string
  division: AgencyDivision
  specialty: AgentSpecialty
  unit: AgencyDivision
  color: string
  accentColor: string
  avatar: string
  bio: string
  methodology: string
  systemPrompt: string
  provider: AIProvider
  model: AgentModel
  temperature: number
  maxTokens: number
  tools: string[]
  skills: string[]
  responsibilities: string[]
  primaryOutputs: DeliverableType[]
}

export interface OfficeRoom {
  id: string
  name: string
  color: string
  agents: string[]
}

export type MissionStatus = 'queued' | 'in_progress' | 'blocked' | 'review' | 'paused' | 'cancelled' | 'completed'
export type MissionPriority = 'low' | 'medium' | 'high'
export type DeliverableType =
  | 'client-brief'
  | 'strategy-brief'
  | 'campaign-strategy'
  | 'content-calendar'
  | 'campaign-copy'
  | 'creative-asset'
  | 'media-plan'
  | 'budget-sheet'
  | 'kpi-forecast'
  | 'seo-audit'
  | 'research-brief'
  | 'status-report'

export interface Mission {
  id: string
  title: string
  summary: string
  deliverableType: DeliverableType
  status: MissionStatus
  priority: MissionPriority
  campaignId?: string
  clientId?: string
  assignedAgentIds: string[]
  assignedBy: string
  createdAt: string
  updatedAt: string
  dueDate?: string
  progress: number
}

export type ArtifactStatus = 'draft' | 'ready' | 'delivered'
export type ArtifactFormat = 'markdown' | 'docx' | 'pdf' | 'xlsx' | 'image' | 'link'

export interface ArtifactExport {
  id: string
  format: Extract<ArtifactFormat, 'docx' | 'pdf' | 'xlsx' | 'image'>
  fileName: string
  path: string
  publicUrl: string
  createdAt: string
  notes?: string
}

export interface CreativeArtifactSpec {
  assetType: 'social-post' | 'carousel' | 'story' | 'ad-creative' | 'hero-image' | 'deck-visual' | 'other'
  visualDirection: string
  imagePrompt: string
  aspectRatio: '1:1' | '4:5' | '16:9' | '9:16' | 'custom'
  referenceNotes?: string
  deliverableSpecs: string[]
  assetUrl?: string
  assetPath?: string
}

export interface Artifact {
  id: string
  title: string
  deliverableType: DeliverableType
  status: ArtifactStatus
  format: ArtifactFormat
  content?: string
  sourcePrompt?: string
  path?: string
  link?: string
  notes?: string
  clientId?: string
  campaignId?: string
  missionId?: string
  agentId?: string
  exports?: ArtifactExport[]
  creative?: CreativeArtifactSpec
  createdAt: string
  updatedAt: string
}

export interface ProviderSetting {
  enabled: boolean
  verified: boolean
  verifiedAt?: string
  model?: string
}

export interface OllamaSettings extends ProviderSetting {
  baseUrl: string
  availableModels: string[]
}

export interface GeminiSettings extends ProviderSetting {
  apiKey: string
  maskedKey: string
  availableModels: string[]
}

export interface ProviderSettings {
  ollama: OllamaSettings
  gemini: GeminiSettings
}

export interface AgencySettings {
  agencyName: string
  defaultProvider: AIProvider
  defaultModel: AgentModel
  themeMode: ThemeMode
}
