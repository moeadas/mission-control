import { ArtifactExecutionStep, AIProvider, DeliverableType } from '@/lib/types'
import { generateText } from '@/lib/server/ai'
import { pickAgentForRole } from '@/lib/agent-roles'
import { sanitizePromptProfile, sanitizePromptValue } from '@/lib/server/prompt-safety'
import { validateDeliverableQuality } from '@/lib/output-quality'

interface RuntimeAgent {
  id: string
  name: string
  role: string
  specialty?: string
  skills?: string[]
  tools?: string[]
  provider?: AIProvider
  model?: string
  systemPrompt?: string
  qualityCheckpoints?: string[]
}

interface PipelineActivity {
  id: string
  name: string
  description?: string
  assignedRole?: string
  checklist?: string[]
  prompts?: { en?: string; ar?: string }
  outputs?: string[]
}

interface PipelinePhase {
  id: string
  name: string
  activities?: PipelineActivity[]
}

interface PipelineLike {
  id: string
  name: string
  phases?: PipelinePhase[]
}

interface ClientProfileMap {
  [key: string]: string
}

interface SkillRef {
  name: string
  description?: string
  instructions?: string
  outputTemplate?: string
  checklist?: string[]
}

interface ExecutionHooks {
  onPhaseStart?: (input: { phase: PipelinePhase; progress: number }) => Promise<void> | void
  onActivityComplete?: (input: {
    phase: PipelinePhase
    activity: PipelineActivity
    agent: RuntimeAgent
    runtime: { provider: AIProvider; model: string }
    summary: string
    outputIds: string[]
    progress: number
  }) => Promise<void> | void
}

function slugLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function truncate(value: string, max = 900) {
  const normalized = value.trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 3)}...`
}

function extractClientContextValue(source: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?=\\n[A-Z][^\\n]*:|$)`))
  return match?.[1]?.trim() || ''
}

function buildClientProfileMap(clientContext: string, explicitProfile?: ClientProfileMap) {
  const merged: ClientProfileMap = { ...(sanitizePromptProfile(explicitProfile || {}) || {}) }

  const derivedValues: Record<string, string> = {
    brand_name: explicitProfile?.brand_name || sanitizePromptValue(extractClientContextValue(clientContext, 'Name')),
    niche: explicitProfile?.niche || sanitizePromptValue(extractClientContextValue(clientContext, 'Industry')),
    industry: explicitProfile?.industry || sanitizePromptValue(extractClientContextValue(clientContext, 'Industry')),
    target_audience: explicitProfile?.target_audience || sanitizePromptValue(extractClientContextValue(clientContext, 'Audience')),
    audience_demographics: explicitProfile?.audience_demographics || sanitizePromptValue(extractClientContextValue(clientContext, 'Audience')),
    audience_psychographics: explicitProfile?.audience_psychographics || sanitizePromptValue(extractClientContextValue(clientContext, 'Audience')),
    pain_points: explicitProfile?.pain_points || sanitizePromptValue(extractClientContextValue(clientContext, 'Strategic priorities')),
    tone: explicitProfile?.tone || sanitizePromptValue(extractClientContextValue(clientContext, 'Tone of voice')),
    brand_voice: explicitProfile?.brand_voice || sanitizePromptValue(extractClientContextValue(clientContext, 'Tone of voice')),
    product_service: explicitProfile?.product_service || sanitizePromptValue(extractClientContextValue(clientContext, 'Products')),
    business_objectives: explicitProfile?.business_objectives || sanitizePromptValue(extractClientContextValue(clientContext, 'Strategic priorities')),
    campaign_theme: explicitProfile?.campaign_theme || sanitizePromptValue(extractClientContextValue(clientContext, 'Key messages')),
    visual_direction: explicitProfile?.visual_direction || sanitizePromptValue(extractClientContextValue(clientContext, 'Brand promise')),
    asset_specs: explicitProfile?.asset_specs || sanitizePromptValue(extractClientContextValue(clientContext, 'Brand identity notes')),
    competitive_landscape: explicitProfile?.competitive_landscape || sanitizePromptValue(extractClientContextValue(clientContext, 'Notes')),
    channel_strategy: explicitProfile?.channel_strategy || sanitizePromptValue(extractClientContextValue(clientContext, 'Strategic priorities')),
    budget_range: explicitProfile?.budget_range || 'TBD - planning assumptions required',
    budget: explicitProfile?.budget || 'TBD - planning assumptions required',
    timeline: explicitProfile?.timeline || 'TBD',
    campaign_duration: explicitProfile?.campaign_duration || '30 days',
    key_dates: explicitProfile?.key_dates || 'TBD',
    posting_frequency: explicitProfile?.posting_frequency || '3-4 posts per week',
    platforms: explicitProfile?.platforms || 'Instagram, LinkedIn',
    content_goal: explicitProfile?.content_goal || 'Awareness and lead generation',
    month_label: explicitProfile?.month_label || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  }

  for (const [key, value] of Object.entries(derivedValues)) {
    if (value && !merged[key]) merged[key] = value
  }

  return merged
}

function interpolateTemplate(template: string, data: ClientProfileMap) {
  let result = template
  for (const [key, value] of Object.entries(data)) {
    result = result.split(`{{${key}}}`).join(value)
  }
  return result.replace(/\{\{[^}]+\}\}/g, 'TBD')
}

function buildSkillLookup(skillCategories: any[]) {
  const skillLookup = new Map<string, SkillRef>()
  for (const category of skillCategories || []) {
    for (const skill of category.skills || []) {
      skillLookup.set(skill.id, {
        name: skill.name,
        description: skill.description,
        instructions: skill.instructions || skill.prompts?.en?.instructions || '',
        outputTemplate: skill.outputTemplate || skill.prompts?.en?.output_template || '',
        checklist: skill.checklist || [],
      })
    }
  }
  return skillLookup
}

function agentSkillsContext(agent: RuntimeAgent, skillLookup: Map<string, SkillRef>) {
  const assignedSkills = (agent.skills || [])
    .map((skillId) => ({ id: skillId, ...(skillLookup.get(skillId) || { name: skillId }) }))
    .slice(0, 8) // cap at 8 to avoid oversized prompts

  const tools = (agent.tools || []).slice(0, 8)

  if (!assignedSkills.length && !tools.length) return 'No explicit skills assigned.'

  const parts: string[] = []

  for (const skill of assignedSkills) {
    const lines: string[] = [`### ${skill.name}`]
    if (skill.description) lines.push(skill.description)
    if (skill.instructions) lines.push(`**How to apply:**\n${skill.instructions}`)
    if (skill.outputTemplate) lines.push(`**Output format:**\n${skill.outputTemplate}`)
    if (skill.checklist?.length) lines.push(`**Checklist:**\n- ${skill.checklist.join('\n- ')}`)
    parts.push(lines.join('\n'))
  }

  if (tools.length) {
    parts.push(`**Available tools:** ${tools.join(', ')}`)
  }

  return parts.join('\n\n')
}

function isProviderAvailable(provider: AIProvider | undefined, input: { geminiApiKey?: string; ollamaBaseUrl?: string }) {
  if (provider === 'gemini') return Boolean(input.geminiApiKey)
  if (provider === 'ollama') return Boolean(input.ollamaBaseUrl)
  return false
}

function resolveAgentRuntime(agent: RuntimeAgent, fallback: { provider: AIProvider; model: string; geminiApiKey?: string; ollamaBaseUrl?: string }) {
  const provider = agent.provider && isProviderAvailable(agent.provider, fallback) ? agent.provider : fallback.provider
  const model = agent.model && provider === agent.provider ? agent.model : fallback.model
  return { provider, model }
}

function getAgentForRole(agents: RuntimeAgent[], role: string | undefined, fallbackAgentId?: string) {
  return pickAgentForRole(agents, role, fallbackAgentId)
}

function summarizeOutputs(outputRegister: Record<string, string>) {
  const entries = Object.entries(outputRegister)
  if (!entries.length) return 'No prior outputs.'
  return entries
    .map(([key, value]) => `### ${key}\n${truncate(value, 700)}`)
    .join('\n\n')
}

function buildFallbackDeliverable(input: {
  request: string
  deliverableType: DeliverableType
  leadAgentName: string
  pipeline: PipelineLike | null
  pipelineOutputs: Record<string, string>
  executionSteps: ArtifactExecutionStep[]
}) {
  const outputEntries = Object.entries(input.pipelineOutputs)
  const sections = outputEntries.length
    ? outputEntries
        .map(([key, value]) => `## ${key.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}\n\n${truncate(value, 1800)}`)
        .join('\n\n')
    : input.executionSteps
        .filter((step) => step.role !== 'quality')
        .map((step) => `## ${step.title}\n\n${truncate(step.summary, 1800)}`)
        .join('\n\n')

  return [
    `# ${input.pipeline?.name || 'Task Output'} Draft`,
    '## Status',
    `Draft assembled by ${input.leadAgentName} because the final model pass returned no visible output.`,
    '## Request',
    input.request,
    '## Deliverable Type',
    input.deliverableType,
    sections || '## Output\n\nNo output available.',
  ].join('\n\n')
}

function isInvalidFinalDeliverable(response: string) {
  if (!response.trim()) return true
  // Only check the first 300 chars — legitimate deliverables can contain phrases
  // like "Next Steps" or "Delivery Timeline" inside their content sections
  const head = response.trim().toLowerCase().slice(0, 300)

  return (
    head.startsWith('task routed to') ||
    head.startsWith('lead agent') ||
    head.includes('status: in progress') ||
    head.includes('i have not drafted the deliverable yet') ||
    // Catch pure coordination responses that have no actual H1 and start with management language
    (head.includes('lead agent') && !/^#\s+.+/m.test(response))
  )
}

function buildActivityPrompt(input: {
  agent: RuntimeAgent
  request: string
  clientContext: string
  clientProfile: ClientProfileMap
  pipeline: PipelineLike
  phase: PipelinePhase
  activity: PipelineActivity
  previousOutputs: Record<string, string>
  qualityChecklist: string[]
  skillContext: string
}) {
  const pipelinePrompt = interpolateTemplate(
    input.activity.prompts?.en || input.activity.description || `Complete the activity "${input.activity.name}".`,
    input.clientProfile
  )

  // Combine global checklist with this agent's own quality checkpoints
  const allQualityChecks = [
    ...input.qualityChecklist,
    ...(input.agent.qualityCheckpoints || []),
  ]

  return [
    input.agent.systemPrompt || `You are ${input.agent.name}, ${input.agent.role}.`,
    `You are autonomously executing a pipeline activity for Mission Control.`,
    `Pipeline: ${input.pipeline.name}`,
    `Phase: ${input.phase.name}`,
    `Activity: ${input.activity.name}`,
    input.activity.description ? `Activity goal: ${input.activity.description}` : '',
    `Original task request: ${input.request}`,
    input.clientContext ? `Client context:\n${input.clientContext}` : '',
    `Specialist skills and methodology:\n${input.skillContext}`,
    Object.keys(input.previousOutputs).length
      ? `Previous pipeline outputs available for handoff:\n${summarizeOutputs(input.previousOutputs)}`
      : 'This is an early activity. No prior phase outputs yet.',
    input.activity.checklist?.length
      ? `Activity checklist:\n- ${input.activity.checklist.join('\n- ')}`
      : '',
    allQualityChecks.length
      ? `Quality checkpoints:\n- ${allQualityChecks.join('\n- ')}`
      : '',
    `Activity instructions:\n${pipelinePrompt}`,
    'Execute the activity now without asking the user for approval.',
    'Return one concise but useful specialist output that can be handed to the next agent.',
    'Do not return project-management boilerplate.',
    'Do not claim anything was exported or delivered.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildSupportPrompt(input: {
  agent: RuntimeAgent
  request: string
  clientContext: string
  deliverableType: DeliverableType
  pipeline: PipelineLike | null
  qualityChecklist: string[]
  skillContext: string
}) {
  return [
    input.agent.systemPrompt || `You are ${input.agent.name}, ${input.agent.role}.`,
    `Your assigned role in this task: supporting specialist.`,
    `User request: ${input.request}`,
    `Deliverable type: ${input.deliverableType}`,
    input.clientContext ? `Client context:\n${input.clientContext}` : '',
    input.pipeline
      ? `Relevant pipeline: ${input.pipeline.name}\nPhases:\n${(input.pipeline.phases || []).map((phase) => `- ${phase.name}`).join('\n')}`
      : '',
    `Assigned skills and tools:\n${input.skillContext}`,
    `Quality checkpoints:\n- ${input.qualityChecklist.join('\n- ')}`,
    'Return a concise specialist handoff with these sections only:',
    '## Specialist Angle',
    '## Recommendations',
    '## Quality Risks',
    '## Inputs for Lead Agent',
    'Be concrete and useful. Do not produce the final deliverable.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildLeadPrompt(input: {
  agent: RuntimeAgent
  request: string
  clientContext: string
  deliverableType: DeliverableType
  executionPrompt: string
  pipeline: PipelineLike | null
  qualityChecklist: string[]
  skillContext: string
  supportHandoffs: ArtifactExecutionStep[]
  pipelineOutputs: Record<string, string>
}) {
  return [
    input.agent.systemPrompt || `You are ${input.agent.name}, ${input.agent.role}.`,
    `You are the lead agent responsible for producing the final deliverable.`,
    `Assigned skills and tools:\n${input.skillContext}`,
    input.clientContext ? `Client context:\n${input.clientContext}` : '',
    input.pipeline
      ? `Pipeline in use: ${input.pipeline.name}\nPhase sequence:\n${(input.pipeline.phases || []).map((phase) => `- ${phase.name}`).join('\n')}`
      : '',
    `Quality checklist:\n- ${input.qualityChecklist.join('\n- ')}`,
    Object.keys(input.pipelineOutputs).length
      ? `Pipeline activity outputs:\n${summarizeOutputs(input.pipelineOutputs)}`
      : '',
    input.supportHandoffs.length
      ? `Supporting agent handoffs:\n${input.supportHandoffs.map((step) => `### ${step.agentName}\n${step.summary}`).join('\n\n')}`
      : 'Supporting agent handoffs: none',
    `Final deliverable instructions:\n${input.executionPrompt}`,
    'Use the supporting handoffs and pipeline outputs, but produce one clean final deliverable.',
    'Do not mention routing, internal workflow, or task management language.',
    'Do not say what you will do later. Deliver the output now.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function runPipelineExecution(input: {
  request: string
  provider: AIProvider
  model: string
  ollamaBaseUrl?: string
  geminiApiKey?: string
  clientContext: string
  clientProfile: ClientProfileMap
  agents: RuntimeAgent[]
  pipeline: PipelineLike
  qualityChecklist: string[]
  skillLookup: Map<string, SkillRef>
  maxTokens: number
  hooks?: ExecutionHooks
}) {
  const executionSteps: ArtifactExecutionStep[] = []
  const outputRegister: Record<string, string> = {}
  const phases = input.pipeline.phases || []
  const totalActivities = phases.reduce((sum, phase) => sum + (phase.activities?.length || 0), 0) || 1
  let completedActivities = 0

  for (const phase of phases) {
    await input.hooks?.onPhaseStart?.({
      phase,
      progress: Math.max(5, Math.round((completedActivities / totalActivities) * 75)),
    })
    for (const activity of phase.activities || []) {
      const assignedAgent = getAgentForRole(input.agents, activity.assignedRole) || input.agents.find((agent) => agent.id === 'iris')
      if (!assignedAgent) continue

      const skillContext = agentSkillsContext(assignedAgent, input.skillLookup)
      const runtime = resolveAgentRuntime(assignedAgent, input)
      const summary = await generateText({
        provider: runtime.provider,
        model: runtime.model,
        temperature: 0.45,
        maxTokens: Math.min(input.maxTokens, 2048),
        messages: [
          {
            role: 'system',
            content: buildActivityPrompt({
              agent: assignedAgent,
              request: input.request,
              clientContext: input.clientContext,
              clientProfile: input.clientProfile,
              pipeline: input.pipeline,
              phase,
              activity,
              previousOutputs: outputRegister,
              qualityChecklist: input.qualityChecklist,
              skillContext,
            }),
          },
        ],
        ollamaBaseUrl: input.ollamaBaseUrl,
        geminiApiKey: input.geminiApiKey,
      })

      for (const outputId of activity.outputs || []) {
        outputRegister[outputId] = summary
      }
      completedActivities += 1
      const progress = Math.max(5, Math.round((completedActivities / totalActivities) * 85))
      await input.hooks?.onActivityComplete?.({
        phase,
        activity,
        agent: assignedAgent,
        runtime,
        summary,
        outputIds: activity.outputs || [],
        progress,
      })

      executionSteps.push({
        id: `${activity.id}-${Date.now()}-${executionSteps.length}`,
        agentId: assignedAgent.id,
        agentName: assignedAgent.name,
        role: assignedAgent.id === 'iris' ? 'quality' : 'support',
        title: `${phase.name} · ${activity.name}`,
        summary: truncate(summary, 1600),
        status: 'completed',
        phaseId: phase.id,
        phaseName: phase.name,
        activityId: activity.id,
        outputIds: activity.outputs || [],
        provider: runtime.provider,
        model: runtime.model,
      })
    }
  }

  return { executionSteps, outputRegister }
}

export async function executeAutonomousTask(input: {
  request: string
  provider: AIProvider
  model: string
  temperature: number
  maxTokens: number
  ollamaBaseUrl?: string
  geminiApiKey?: string
  deliverableType: DeliverableType
  executionPrompt: string
  clientContext: string
  clientProfile?: ClientProfileMap
  agents: RuntimeAgent[]
  leadAgentId: string
  collaboratorAgentIds: string[]
  qualityChecklist: string[]
  pipeline: PipelineLike | null
  skillCategories: any[]
  hooks?: ExecutionHooks
}) {
  const skillLookup = buildSkillLookup(input.skillCategories)
  const agentMap = new Map(input.agents.map((agent) => [agent.id, agent]))
  const executionSteps: ArtifactExecutionStep[] = []
  const pipelineOutputs: Record<string, string> = {}
  const clientProfile = buildClientProfileMap(input.clientContext, input.clientProfile)

  if (input.pipeline?.phases?.length) {
    const pipelineRun = await runPipelineExecution({
      request: input.request,
      provider: input.provider,
      model: input.model,
      ollamaBaseUrl: input.ollamaBaseUrl,
      geminiApiKey: input.geminiApiKey,
      clientContext: input.clientContext,
      clientProfile,
      agents: input.agents,
      pipeline: input.pipeline,
      qualityChecklist: input.qualityChecklist,
      skillLookup,
      maxTokens: input.maxTokens,
      hooks: input.hooks,
    })
    executionSteps.push(...pipelineRun.executionSteps)
    Object.assign(pipelineOutputs, pipelineRun.outputRegister)
  } else {
    for (const collaboratorId of input.collaboratorAgentIds) {
      const agent = agentMap.get(collaboratorId)
      if (!agent) continue

      const skillContext = agentSkillsContext(agent, skillLookup)
      const runtime = resolveAgentRuntime(agent, input)
      const summary = await generateText({
        provider: runtime.provider,
        model: runtime.model,
        temperature: 0.45,
        maxTokens: Math.min(input.maxTokens, 1536),
        messages: [
          {
            role: 'system',
            content: buildSupportPrompt({
              agent,
              request: input.request,
              clientContext: input.clientContext,
              deliverableType: input.deliverableType,
              pipeline: input.pipeline,
              qualityChecklist: input.qualityChecklist,
              skillContext,
            }),
          },
        ],
        ollamaBaseUrl: input.ollamaBaseUrl,
        geminiApiKey: input.geminiApiKey,
      })

      executionSteps.push({
        id: `${collaboratorId}-${Date.now()}-${executionSteps.length}`,
        agentId: collaboratorId,
        agentName: agent.name,
        role: 'support',
        title: `${agent.name} handoff`,
        summary: truncate(summary, 1600),
      })
    }
  }

  const leadAgent = agentMap.get(input.leadAgentId) || agentMap.get('iris') || {
    id: 'iris',
    name: 'Iris',
    role: 'Operations Lead',
  }
  const leadSkillContext = agentSkillsContext(leadAgent, skillLookup)
  const leadRuntime = resolveAgentRuntime(leadAgent, input)

  let response = await generateText({
    provider: leadRuntime.provider,
    model: leadRuntime.model,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    messages: [
      {
        role: 'system',
        content: buildLeadPrompt({
          agent: leadAgent,
          request: input.request,
          clientContext: input.clientContext,
          deliverableType: input.deliverableType,
          executionPrompt: input.executionPrompt,
          pipeline: input.pipeline,
          qualityChecklist: input.qualityChecklist,
          skillContext: leadSkillContext,
          supportHandoffs: executionSteps,
          pipelineOutputs,
        }),
      },
    ],
    ollamaBaseUrl: input.ollamaBaseUrl,
    geminiApiKey: input.geminiApiKey,
  })

  if (isInvalidFinalDeliverable(response)) {
    response = await generateText({
      provider: leadRuntime.provider,
      model: leadRuntime.model,
      temperature: Math.min(input.temperature, 0.45),
      maxTokens: input.maxTokens,
      messages: [
        {
          role: 'system',
          content: [
            buildLeadPrompt({
              agent: leadAgent,
              request: input.request,
              clientContext: input.clientContext,
              deliverableType: input.deliverableType,
              executionPrompt: input.executionPrompt,
              pipeline: input.pipeline,
              qualityChecklist: input.qualityChecklist,
              skillContext: leadSkillContext,
              supportHandoffs: executionSteps,
              pipelineOutputs,
            }),
            'Your previous answer was invalid because it used coordination or status language instead of the actual deliverable.',
            'Return only the final deliverable now.',
            'Do not mention routing, lead agent, status, delivery timing, or next steps.',
          ].join('\n\n'),
        },
      ],
      ollamaBaseUrl: input.ollamaBaseUrl,
      geminiApiKey: input.geminiApiKey,
    })
  }

  executionSteps.push({
    id: `${leadAgent.id}-${Date.now()}-lead`,
    agentId: leadAgent.id,
    agentName: leadAgent.name,
    role: 'lead',
    title: `${leadAgent.name} final assembly`,
    summary: 'Lead agent assembled the final deliverable from pipeline steps, skill-based handoffs, and client context.',
    status: 'completed',
    provider: leadRuntime.provider,
    model: leadRuntime.model,
  })

  const qualityResult = validateDeliverableQuality(input.deliverableType, response)

  executionSteps.push({
    id: `quality-${Date.now()}`,
    agentId: 'iris',
    agentName: 'Iris',
    role: 'quality',
    title: 'Quality control pass',
    summary: qualityResult.ok
      ? `Quality gate passed (${qualityResult.score}/100). ${input.qualityChecklist.join(' | ')}`
      : `Quality gate flagged issues (${qualityResult.score}/100): ${qualityResult.issues.join(' | ')}`,
    status: qualityResult.ok ? 'completed' : 'warning',
    qualityIssues: qualityResult.issues,
  })

  if (isInvalidFinalDeliverable(response)) {
    response = buildFallbackDeliverable({
      request: input.request,
      deliverableType: input.deliverableType,
      leadAgentName: leadAgent.name,
      pipeline: input.pipeline,
      pipelineOutputs,
      executionSteps,
    })
  }

  return {
    response,
    executionSteps,
    qualityResult,
  }
}
