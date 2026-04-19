import { DeliverableType } from '@/lib/types'
import { getDeliverableAgentDefaults, getDeliverableSpec } from '@/lib/deliverables'

export const ROLE_AGENT_MAP: Record<string, string[]> = {
  'client-services': ['sage', 'piper'],
  orchestration: ['iris', 'piper'],
  creative: ['finn', 'echo', 'lyra'],
  media: ['nova', 'dex'],
  research: ['atlas'],
  strategy: ['maya'],
  'brand-strategist': ['maya'],
  copy: ['echo'],
  'visual-producer': ['lyra'],
  'media-planner': ['nova'],
  performance: ['dex'],
  'content-strategist': ['maya', 'echo'],
  'traffic-manager': ['piper'],
  'creative-director': ['finn'],
  'seo-specialist': ['atlas'],
}

export function getAgentIdsForRole(role?: string) {
  if (!role) return []
  return ROLE_AGENT_MAP[role] || []
}

export function pickAgentForRole<T extends { id: string }>(agents: T[], role?: string, fallbackAgentId?: string) {
  const preferredIds = getAgentIdsForRole(role)
  const preferredAgent = preferredIds.map((id) => agents.find((agent) => agent.id === id)).find(Boolean) || null
  if (preferredAgent) return preferredAgent
  return fallbackAgentId ? agents.find((agent) => agent.id === fallbackAgentId) || null : null
}

export function getDeliverableAgentPlan(deliverableType: DeliverableType, request: string, routedAgentId?: string) {
  const lower = request.toLowerCase()
  const spec = getDeliverableSpec(deliverableType)
  const defaults = getDeliverableAgentDefaults(deliverableType)

  const basePlan = {
    leadAgentId: routedAgentId || defaults.leadAgentId || spec.defaultLead || 'iris',
    collaboratorAgentIds: [...defaults.collaboratorAgentIds],
  }

  switch (deliverableType) {
    case 'campaign-copy':
      return {
        ...basePlan,
        collaboratorAgentIds:
          lower.includes('carousel') || lower.includes('instagram')
            ? Array.from(new Set([...basePlan.collaboratorAgentIds, 'lyra']))
            : basePlan.collaboratorAgentIds,
      }
    case 'client-brief':
      return { ...basePlan, collaboratorAgentIds: Array.from(new Set(['maya', 'piper'])) }
    default:
      return basePlan
  }
}
