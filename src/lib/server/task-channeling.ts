import { ChannelingConfidence, DeliverableType } from '@/lib/types'
import { getDeliverableAgentPlan } from '@/lib/agent-roles'
import { getAuditExecutionProfile } from '@/lib/audit-capabilities'
import { getDeliverableChannelingProfile, getDeliverableSpec } from '@/lib/deliverables'

type RuntimeAgent = {
  id: string
  name: string
  role: string
  specialty?: string
  skills?: string[]
}

type PipelineLike = {
  id: string
  name: string
  phases?: Array<{
    id: string
    name: string
    activities?: Array<{
      id: string
      name: string
      assignedRole?: string
    }>
  }>
}

type EnrichedSkillDefinition = {
  id: string
  name: string
  description?: string
  prompts?: {
    en?: {
      trigger?: string
      context?: string
      instructions?: string
      output_template?: string
    }
  }
  agents?: string[]
  pipelines?: string[]
}

type SkillCategory = {
  id: string
  name: string
  skills: EnrichedSkillDefinition[]
}

interface ChannelingDeliverableSpec {
  id: DeliverableType
  defaultLead: string
  defaultCollaborators: string[]
  skillBoostPatterns: RegExp[]
  skillPenaltyPatterns: RegExp[]
  complexity: 'low' | 'medium' | 'high'
  simpleVariantPatterns?: RegExp[]
}

function getChannelingSpec(deliverableType: DeliverableType): ChannelingDeliverableSpec {
  const profile = getDeliverableChannelingProfile(deliverableType)
  return {
    id: profile.id,
    defaultLead: profile.leadAgentId,
    defaultCollaborators: profile.collaboratorAgentIds,
    skillBoostPatterns: profile.skillBoostPatterns,
    skillPenaltyPatterns: profile.skillPenaltyPatterns,
    complexity: profile.complexity,
    simpleVariantPatterns: profile.simpleVariantPatterns,
  }
}

export interface TaskChannelingPlan {
  leadAgentId: string
  collaboratorAgentIds: string[]
  assignedAgentIds: string[]
  selectedSkillsByAgent: Record<string, string[]>
  orchestrationTrace: string[]
  confidence: ChannelingConfidence
  resolvedDeliverableType: DeliverableType
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function buildSkillIndex(skillCategories: SkillCategory[]): Map<string, EnrichedSkillDefinition> {
  const byId = new Map<string, EnrichedSkillDefinition>()
  for (const category of skillCategories || []) {
    for (const skill of category.skills || []) byId.set(skill.id, skill)
  }
  return byId
}

function scoreSkill(
  skill: EnrichedSkillDefinition,
  request: string,
  deliverableType: DeliverableType,
  pipeline: PipelineLike | null,
  agentId: string
): number {
  const spec = getChannelingSpec(deliverableType)
  const haystack = [
    skill.id,
    skill.name,
    skill.description || '',
    skill.prompts?.en?.trigger || '',
    skill.prompts?.en?.context || '',
    skill.prompts?.en?.instructions || '',
  ].join(' ').toLowerCase()

  let score = 0
  for (const token of tokenize(request)) {
    if (token.length >= 3 && haystack.includes(token)) score += 2
  }
  if (skill.agents?.includes(agentId)) score += 3
  if (pipeline && skill.pipelines?.includes(pipeline.id)) score += 4
  if (spec.skillBoostPatterns.some((pattern) => pattern.test(skill.id))) score += 6
  if (spec.skillPenaltyPatterns.some((pattern) => pattern.test(skill.id))) score -= 8
  if (/deep-research/.test(skill.id) && ['research-brief', 'strategy-brief', 'campaign-strategy', 'data-analysis', 'seo-audit'].includes(deliverableType)) score += 10
  if (/(brand-template|brand-guidelines|brand-consistency|reference-image)/.test(skill.id) && ['creative-asset', 'brand-guidelines'].includes(deliverableType)) score += 7
  return score
}

function isSimpleVariant(request: string, spec: ChannelingDeliverableSpec): boolean {
  if (!spec.simpleVariantPatterns?.length) return false
  const lower = request.toLowerCase()
  if (!spec.simpleVariantPatterns.some((pattern) => pattern.test(lower))) return false
  return !/\b(carousel|content calendar|multi-?post|campaign strategy|visual direction|design|asset|image|media plan|forecast|budget|research|audit|competitor|benchmark|series|sequence|a\/b test|variant|multiple|several|all platforms)\b/.test(lower)
}

function inferCollaborators(
  request: string,
  deliverableType: DeliverableType,
  leadAgentId: string,
  agents: RuntimeAgent[]
): string[] {
  const spec = getChannelingSpec(deliverableType)
  const lower = request.toLowerCase()
  const availableAgentIds = new Set(agents.map((agent) => agent.id))
  const collaborators = new Set(spec.defaultCollaborators.filter((id) => id !== leadAgentId && availableAgentIds.has(id)))

  if (isSimpleVariant(request, spec)) {
    const essential = spec.defaultCollaborators.find((id) => id !== leadAgentId && availableAgentIds.has(id))
    collaborators.clear()
    if (essential) collaborators.add(essential)
  }

  const dynamicSignals: Array<{ pattern: RegExp; agentId: string }> = [
    { pattern: /(visual|image|design|creative|artwork|graphic|mockup|illustration|banner|poster|carousel|infographic)/, agentId: 'lyra' },
    { pattern: /(campaign concept|creative concept|big idea|angle|concept|creative direction)/, agentId: 'finn' },
    { pattern: /(research|competitor|market|benchmark|trend|analysis|data|insight|audience research)/, agentId: 'atlas' },
    { pattern: /(stakeholder|board|investor|executive|c-suite|management|pitch|client presentation|status update|account update)/, agentId: 'sage' },
    { pattern: /(media|channel|budget|spend|allocation|paid|organic|schedule|ad spend|placement)/, agentId: 'nova' },
    { pattern: /(excel|spreadsheet|kpi|pacing|budget sheet|forecast|projection|dashboard|reporting)/, agentId: 'dex' },
    { pattern: /(timeline|schedule|handoff|traffic|resourcing|project plan|milestone|deadline|gantt)/, agentId: 'piper' },
    { pattern: /(copy|caption|headline|hook|cta|content|script|article|blog|newsletter|email)/, agentId: 'echo' },
    { pattern: /(strategy|positioning|messaging|audience|persona|value proposition|brand)/, agentId: 'maya' },
  ]

  for (const signal of dynamicSignals) {
    if (signal.pattern.test(lower) && signal.agentId !== leadAgentId && availableAgentIds.has(signal.agentId)) {
      collaborators.add(signal.agentId)
    }
  }

  return Array.from(collaborators)
}

function resolveLeadAgent(
  deliverableType: DeliverableType,
  routedAgentId: string | undefined,
  initialLeadFromRoles: string,
  agents: RuntimeAgent[]
): string {
  const spec = getChannelingSpec(deliverableType)
  const availableAgentIds = new Set(agents.map((agent) => agent.id))

  if (routedAgentId && routedAgentId !== 'iris' && availableAgentIds.has(routedAgentId) && deliverableType !== 'status-report') {
    return routedAgentId
  }
  if (initialLeadFromRoles !== 'iris' && availableAgentIds.has(initialLeadFromRoles) && deliverableType !== 'status-report') {
    return initialLeadFromRoles
  }
  if (deliverableType !== 'status-report' && spec.defaultLead !== 'iris' && availableAgentIds.has(spec.defaultLead)) {
    return spec.defaultLead
  }
  const fallback = spec.defaultCollaborators.find((id) => id !== 'iris' && availableAgentIds.has(id))
  return fallback || initialLeadFromRoles
}

function getSkillCap(agentId: string, leadAgentId: string, complexity: 'low' | 'medium' | 'high') {
  const caps = {
    low: { lead: 2, collaborator: 1, iris: 1 },
    medium: { lead: 3, collaborator: 2, iris: 1 },
    high: { lead: 4, collaborator: 3, iris: 1 },
  }[complexity]

  if (agentId === 'iris') return caps.iris
  if (agentId === leadAgentId) return caps.lead
  return caps.collaborator
}

function computeChannelingConfidence(input: {
  deliverableType: DeliverableType
  leadAgentId: string
  selectedSkillsByAgent: Record<string, string[]>
  pipeline: PipelineLike | null
  agents: RuntimeAgent[]
}): ChannelingConfidence {
  let score = 0
  if (input.deliverableType !== 'status-report' && input.deliverableType !== 'general-task') score += 3
  else if (input.deliverableType === 'general-task') score += 1
  if (input.agents.some((agent) => agent.id === input.leadAgentId)) score += 2
  const leadSkills = input.selectedSkillsByAgent[input.leadAgentId] || []
  if (leadSkills.length >= 2) score += 2
  else if (leadSkills.length >= 1) score += 1
  if (input.pipeline) score += 2
  if (score >= 7) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

export function resolveTaskRoutingBlueprint(input: {
  request: string
  deliverableType: DeliverableType
  routedAgentId?: string
  agents: RuntimeAgent[]
  pipeline?: PipelineLike | null
}) {
  const initialBase = getDeliverableAgentPlan(input.deliverableType, input.request, input.routedAgentId)
  const leadAgentId = resolveLeadAgent(
    input.deliverableType,
    input.routedAgentId,
    initialBase.leadAgentId,
    input.agents
  )

  const collaboratorAgentIds = unique([
    ...(initialBase.collaboratorAgentIds || []),
    ...inferCollaborators(input.request, input.deliverableType, leadAgentId, input.agents),
  ]).filter((id) => id !== 'iris' && id !== leadAgentId)

  const confidence = computeChannelingConfidence({
    deliverableType: input.deliverableType,
    leadAgentId,
    selectedSkillsByAgent: { [leadAgentId]: [] },
    pipeline: input.pipeline || null,
    agents: input.agents,
  })

  return {
    leadAgentId,
    collaboratorAgentIds,
    confidence,
  }
}

export function buildTaskChannelingPlan(input: {
  request: string
  deliverableType: DeliverableType
  routedAgentId?: string
  agents: RuntimeAgent[]
  skillCategories: SkillCategory[]
  pipeline: PipelineLike | null
}): TaskChannelingPlan {
  const { request, deliverableType, routedAgentId, agents, skillCategories, pipeline } = input
  const spec = getChannelingSpec(deliverableType)
  const deliverableMeta = getDeliverableSpec(deliverableType)
  const initialBase = getDeliverableAgentPlan(deliverableType, request, routedAgentId)
  const leadAgentId = resolveLeadAgent(deliverableType, routedAgentId, initialBase.leadAgentId, agents)
  const leadAgent = agents.find((agent) => agent.id === leadAgentId)
  const skillIndex = buildSkillIndex(skillCategories)

  const pipelineAgentIds = unique(
    (pipeline?.phases || [])
      .flatMap((phase) => phase.activities || [])
      .flatMap((activity) =>
        agents
          .filter((agent) => {
            const role = (activity.assignedRole || '').toLowerCase()
            return role && (agent.role.toLowerCase().includes(role) || agent.specialty?.toLowerCase() === role)
          })
          .map((agent) => agent.id)
      )
  )

  const collaboratorAgentIds = unique([
    ...(initialBase.collaboratorAgentIds || []),
    ...inferCollaborators(request, deliverableType, leadAgentId, agents),
    ...pipelineAgentIds.filter((id) => id !== leadAgentId),
  ]).filter((id) => id !== 'iris' && id !== leadAgentId)

  const assignedAgentIds = unique(['iris', leadAgentId, ...collaboratorAgentIds])
  const selectedSkillsByAgent: Record<string, string[]> = {}

  for (const agentId of assignedAgentIds) {
    const agent = agents.find((entry) => entry.id === agentId)
    if (!agent) continue
    const ranked = (agent.skills || [])
      .map((skillId) => ({ skillId, skill: skillIndex.get(skillId) }))
      .filter((entry) => entry.skill)
      .map((entry) => ({
        skillId: entry.skillId,
        score: scoreSkill(entry.skill!, request, deliverableType, pipeline, agentId),
      }))
      .sort((a, b) => b.score - a.score)

    const chosen = ranked
      .filter((entry) => entry.score > 0)
      .slice(0, getSkillCap(agentId, leadAgentId, spec.complexity))
      .map((entry) => entry.skillId)

    selectedSkillsByAgent[agentId] = chosen.length ? chosen : (agent.skills || []).slice(0, getSkillCap(agentId, leadAgentId, spec.complexity))
  }

  const confidence = computeChannelingConfidence({
    deliverableType,
    leadAgentId,
    selectedSkillsByAgent,
    pipeline,
    agents,
  })

  const orchestrationTrace: string[] = [
    `Iris analyzed this as ${deliverableMeta.label.toLowerCase()} work.`,
    pipeline ? `Selected pipeline: ${pipeline.name}.` : 'No formal pipeline matched, so direct specialist execution was selected.',
    `Lead specialist: ${leadAgentId}${leadAgent ? ` (${leadAgent.name} — ${leadAgent.role})` : ''}.`,
    collaboratorAgentIds.length
      ? `Supporting specialists: ${collaboratorAgentIds.map((id) => {
          const agent = agents.find((item) => item.id === id)
          return agent ? `${id} (${agent.name})` : id
        }).join(', ')}.`
      : 'No supporting specialists were required.',
    `Confidence: ${confidence}.`,
  ]

  for (const agentId of assignedAgentIds) {
    if (agentId === 'iris') continue
    const agent = agents.find((item) => item.id === agentId)
    orchestrationTrace.push(
      `${agent ? `${agent.name} (${agentId})` : agentId} activates: ${(selectedSkillsByAgent[agentId] || []).join(', ') || 'general specialist context'}.`
    )
  }

  const defaults = new Set(spec.defaultCollaborators)
  for (const agentId of collaboratorAgentIds.filter((id) => !defaults.has(id) && !(initialBase.collaboratorAgentIds || []).includes(id))) {
    const agent = agents.find((item) => item.id === agentId)
    orchestrationTrace.push(`${agent?.name || agentId} was dynamically added based on content signals in the request.`)
  }

  const auditProfile = getAuditExecutionProfile(request, deliverableType)
  if (auditProfile) {
    orchestrationTrace.push(`Audit mode: ${auditProfile.title}.`)
    orchestrationTrace.push(`Tool stack requested: ${auditProfile.requiredConnectors.map((connector) => connector.shortName).join(', ')}.`)
  }

  return {
    leadAgentId,
    collaboratorAgentIds,
    assignedAgentIds,
    selectedSkillsByAgent,
    orchestrationTrace,
    confidence,
    resolvedDeliverableType: deliverableType,
  }
}
