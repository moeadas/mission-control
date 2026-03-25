// Builds default agents from individual JSON config files
// This merges the JSON config with required store fields

import { Agent, DeliverableType } from './types'
import IrisConfig from '@/config/agents/iris.json'
import SageConfig from '@/config/agents/sage.json'
import PiperConfig from '@/config/agents/piper.json'
import MayaConfig from '@/config/agents/maya.json'
import FinnConfig from '@/config/agents/finn.json'
import EchoConfig from '@/config/agents/echo.json'
import LyraConfig from '@/config/agents/lyra.json'
import NovaConfig from '@/config/agents/nova.json'
import AtlasConfig from '@/config/agents/atlas.json'
import DexConfig from '@/config/agents/dex.json'

type AgentConfig = {
  id: string
  name: string
  role: string
  division: string
  color: string
  bio: string
  methodology: string
  avatar: string | null
  status: string
  skills: string[]
  responsibilities: string[]
  handoffs: { receivesFrom: string[]; sendsTo: string[] }
  qualityCheckpoints: string[]
  tools: string[]
  ai: { provider: string; model: string; temperature: number; maxTokens: number }
}

const configs: AgentConfig[] = [
  IrisConfig as AgentConfig,
  SageConfig as AgentConfig,
  PiperConfig as AgentConfig,
  MayaConfig as AgentConfig,
  FinnConfig as AgentConfig,
  EchoConfig as AgentConfig,
  LyraConfig as AgentConfig,
  NovaConfig as AgentConfig,
  AtlasConfig as AgentConfig,
  DexConfig as AgentConfig,
]

// Map division to valid division
const DIVISION_MAP: Record<string, Agent['division']> = {
  orchestration: 'orchestration',
  'client-services': 'client-services',
  creative: 'creative',
  media: 'media',
  research: 'research',
  strategy: 'creative', // map strategy to creative
}

// Map division to specialty
const SPECIALTY_MAP: Record<string, Agent['specialty']> = {
  orchestration: 'project-management',
  'client-services': 'client-services',
  creative: 'creative',
  media: 'media-planning',
  research: 'research',
  strategy: 'strategy',
}

export function buildAgentsFromConfigs(): Agent[] {
  return configs.map(config => ({
    id: config.id,
    name: config.name,
    role: config.role,
    division: DIVISION_MAP[config.division] || 'creative',
    specialty: SPECIALTY_MAP[config.division] || 'creative',
    unit: DIVISION_MAP[config.division] || 'creative',
    color: config.color,
    accentColor: 'blue',
    bio: config.bio,
    status: (config.status as Agent['status']) || 'idle',
    avatar: config.avatar || 'bot-blue',
    provider: config.ai?.provider as Agent['provider'] || 'ollama',
    model: config.ai?.model as Agent['model'] || 'minimax-m2.7:cloud',
    temperature: config.ai?.temperature || 0.7,
    maxTokens: config.ai?.maxTokens || 1536,
    tools: config.tools || [],
    skills: config.skills || [],
    responsibilities: config.responsibilities || [],
    systemPrompt: `You are ${config.name}, ${config.role}. ${config.methodology ? `Your methodology: ${config.methodology}.` : ''} ${config.bio}`,
    methodology: config.methodology || '',
    primaryOutputs: [] as DeliverableType[],
    qualityCheckpoints: config.qualityCheckpoints || [],
    handoffs: config.handoffs || { receivesFrom: [], sendsTo: [] },
    // Store-specific fields (not in config)
    isAgent: true,
    currentMission: null,
    memory: [],
    unreadCount: 0,
    position: { x: 200, y: 200, room: DIVISION_MAP[config.division] || 'creative' },
  }))
}

export const CONFIG_AGENTS = buildAgentsFromConfigs()
