// Agent Config Loader - Loads agents from individual JSON config files
// This provides a clean interface for the agents store to load agent configs

import { Agent } from './types'

const AGENT_CONFIG_FILES: Record<string, string> = {
  iris: '@/config/agents/iris.json',
  sage: '@/config/agents/sage.json',
  piper: '@/config/agents/piper.json',
  maya: '@/config/agents/maya.json',
  finn: '@/config/agents/finn.json',
  echo: '@/config/agents/echo.json',
  'nova-studio': '@/config/agents/nova-studio.json',
  nova: '@/config/agents/nova.json',
  atlas: '@/config/agents/atlas.json',
  dex: '@/config/agents/dex.json',
}

export async function loadAgentConfigs(): Promise<Partial<Agent>[]> {
  const agents: Partial<Agent>[] = []
  
  for (const [id, filePath] of Object.entries(AGENT_CONFIG_FILES)) {
    try {
      const module = await import(/* @ts-ignore */ filePath)
      agents.push(module.default || module)
    } catch (error) {
      console.warn(`Failed to load agent config for ${id}:`, error)
    }
  }
  
  return agents
}

export async function loadAgentConfig(agentId: string): Promise<Partial<Agent> | null> {
  const filePath = AGENT_CONFIG_FILES[agentId]
  if (!filePath) return null
  
  try {
    const module = await import(/* @ts-ignore */ filePath)
    return module.default || module
  } catch (error) {
    console.warn(`Failed to load agent config for ${agentId}:`, error)
    return null
  }
}

// Get list of all configured agent IDs
export function getConfiguredAgentIds(): string[] {
  return Object.keys(AGENT_CONFIG_FILES)
}
