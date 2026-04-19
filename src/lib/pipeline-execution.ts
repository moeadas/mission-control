// Pipeline Execution Engine
// Handles task routing, pipeline execution, and agent coordination

import { useAgentsStore } from './agents-store'
import type { Pipeline, Phase, Activity } from '@/lib/stores/pipelines-store'
import { pickAgentForRole } from '@/lib/agent-roles'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { useSkillsStore } from '@/lib/stores/skills-store'
import type { Client } from '@/lib/client-data'
import { inferDeliverableTypeFromText, getDeliverableSpec } from '@/lib/deliverables'

export interface PipelineInstance {
  id: string
  pipelineId: string
  pipelineName?: string
  clientId: string
  language: 'en' | 'ar'
  status: 'pending' | 'running' | 'completed' | 'paused' | 'blocked'
  currentPhase: string
  currentPhaseName?: string | null
  currentActivity: string | null
  taskId?: string
  progress?: number
  jobStatus?: string | null
  tasks: PipelineTask[]
  outputs: Map<string, PipelineOutput>
  clientData: Record<string, string>
  startedAt: number | null
  completedAt: number | null
}

export interface PipelineTask {
  id: string
  phaseId: string
  activityId: string
  title: string
  status: 'pending' | 'in-progress' | 'completed' | 'blocked'
  assignedAgent: string | null
  output: PipelineOutput | null
  checklist: string[]
  completedChecklist: string[]
  startedAt: number | null
  completedAt: number | null
  error: string | null
}

export interface PipelineOutput {
  taskId: string
  content: string
  format: 'text' | 'json' | 'markdown'
  artifacts: string[] // file references
}

export interface PipelineValidationResult {
  ok: boolean
  missingFields: string[]
  missingTemplateVariables: string[]
  message?: string
}

function mapClientToPipelineData(client?: Client | null): Record<string, string> {
  if (!client) return {}

  return {
    brand_name: client.name || '',
    niche: client.industry || '',
    industry: client.industry || '',
    target_audience: client.targetAudiences || '',
    audience_demographics: client.targetAudiences || '',
    audience_psychographics: client.targetAudiences || '',
    product_service: client.productsAndServices || '',
    business_objectives: client.strategicPriorities || '',
    tone: client.toneOfVoice || '',
    brand_voice: client.toneOfVoice || '',
    campaign_theme: client.keyMessages || '',
    visual_direction: client.brandIdentityNotes || '',
    asset_specs: client.brandIdentityNotes || '',
    competitive_landscape: client.competitiveLandscape || '',
    channel_strategy: client.strategicPriorities || '',
    pain_points: client.objectionHandling || '',
    key_dates: client.operationalDetails || '',
    posting_frequency: '3-4 posts per week',
    platforms: 'Instagram, LinkedIn',
    content_goal: 'Awareness and lead generation',
    campaign_duration: '30 days',
  }
}

function extractTemplateVariables(template: string) {
  return Array.from(template.matchAll(/\{\{([^}]+)\}\}/g)).map((match) => match[1].trim())
}

export function validatePipelineClientData(
  pipeline: Pipeline,
  clientData: Record<string, string>
): PipelineValidationResult {
  const missingFields = (pipeline.clientProfileFields || [])
    .filter((field) => field.required && !String(clientData[field.id] || '').trim())
    .map((field) => field.label)

  const templateVariables = new Set<string>()
  for (const phase of pipeline.phases || []) {
    for (const activity of phase.activities || []) {
      for (const template of [activity.prompts?.en, activity.prompts?.ar, activity.description]) {
        if (!template) continue
        for (const variable of extractTemplateVariables(template)) {
          templateVariables.add(variable)
        }
      }
    }
  }

  const missingTemplateVariables = Array.from(templateVariables).filter(
    (variable) => !String(clientData[variable] || '').trim()
  )

  return {
    ok: missingFields.length === 0 && missingTemplateVariables.length === 0,
    missingFields,
    missingTemplateVariables,
    message:
      missingFields.length || missingTemplateVariables.length
        ? 'Pipeline setup is incomplete. Fill the missing client profile fields before running this pipeline.'
        : undefined,
  }
}

function buildKnowledgeAssetsContext(clientId: string) {
  const client = useAgentsStore.getState().clients.find((entry) => entry.id === clientId)
  const assets = Array.isArray(client?.knowledgeAssets) ? client.knowledgeAssets : []
  if (!assets.length) return ''

  return [
    'Client knowledge assets:',
    ...assets.slice(0, 8).map((asset) =>
      `- ${asset.title} (${asset.type}, ${asset.status})${asset.summary ? `: ${asset.summary}` : ''}${asset.extractedInsights ? ` | Insights: ${asset.extractedInsights}` : ''}`
    ),
  ].join('\n')
}

async function getSkillContextForAgent(agentId: string) {
  const skillsStore = useSkillsStore.getState()
  if (!skillsStore.isLoaded) {
    await skillsStore.loadSkills()
  }

  const agent = useAgentsStore.getState().agents.find((entry) => entry.id === agentId)
  const skillDefinitions = (agent?.skills || [])
    .map((skillId) => skillsStore.getSkill(skillId))
    .filter(Boolean)
    .slice(0, 8)

  if (!skillDefinitions.length) return ''

  return [
    'Assigned specialist skills:',
    ...skillDefinitions.map((skill) =>
      [
        `- ${skill!.name}`,
        skill!.description ? `  Description: ${skill!.description}` : '',
        skill!.prompts?.en?.instructions ? `  Instructions: ${skill!.prompts.en.instructions}` : '',
        skill!.prompts?.en?.output_template ? `  Output template: ${skill!.prompts.en.output_template}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    ),
  ].join('\n')
}

// Build execution context from client data
function buildContext(
  promptTemplate: string,
  clientData: Record<string, string>,
  language: 'en' | 'ar',
  extraContext = ''
): string {
  let context = promptTemplate
  
  // Replace all {{variable}} placeholders
  for (const [key, value] of Object.entries(clientData)) {
    const placeholder = `{{${key}}}`
    context = context.split(placeholder).join(value)
  }
  
  // Select language
  if (language === 'ar' && context.includes('{{language}}')) {
    context = context.split('{{language}}').join('Arabic')
  } else if (language === 'en' && context.includes('{{language}}')) {
    context = context.split('{{language}}').join('English')
  }

  return extraContext ? `${extraContext}\n\n${context}` : context
}

// Get agent for a role
function getAgentForRole(
  agents: ReturnType<typeof useAgentsStore.getState>['agents'],
  role: string
): { id: string; name: string } | null {
  const agent = pickAgentForRole(agents, role, 'iris')
  return agent ? { id: agent.id, name: agent.name } : null
}

// Create a new pipeline instance
export function createPipelineInstance(
  pipeline: Pipeline,
  clientId: string,
  clientData: Record<string, string>,
  language: 'en' | 'ar'
): PipelineInstance {
  const client = useAgentsStore.getState().clients.find((entry) => entry.id === clientId)
  const mergedClientData = {
    ...mapClientToPipelineData(client),
    ...(clientData || {}),
  }
  const instance: PipelineInstance = {
    id: `pipeline-${Date.now()}`,
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    clientId,
    language,
    status: 'pending',
    currentPhase: pipeline.phases[0]?.id || '',
    currentPhaseName: pipeline.phases[0]?.name || null,
    currentActivity: null,
    progress: 0,
    jobStatus: null,
    tasks: [],
    outputs: new Map(),
    clientData: mergedClientData,
    startedAt: null,
    completedAt: null,
  }
  
  // Create tasks for each phase/activity
  for (const phase of pipeline.phases) {
    for (const activity of phase.activities) {
      const assignedAgent = getAgentForRole(useAgentsStore.getState().agents, activity.assignedRole)
      instance.tasks.push({
        id: `${phase.id}-${activity.id}`,
        phaseId: phase.id,
        activityId: activity.id,
        title: activity.name,
        status: 'pending',
        assignedAgent: assignedAgent?.id || null,
        output: null,
        checklist: activity.checklist || [],
        completedChecklist: [],
        startedAt: null,
        completedAt: null,
        error: null,
      })
    }
  }
  
  return instance
}

export function applyExecutionStateToInstance(
  instance: PipelineInstance,
  executionState: RemoteExecutionState | null | undefined,
  pipeline: Pipeline
): PipelineInstance {
  if (!executionState) return instance

  const latestRuns = new Map<string, NonNullable<RemoteExecutionState['runs']>[number]>()
  for (const run of executionState.runs || []) {
    if (run.stage) latestRuns.set(run.stage, run)
  }

  const tasks = instance.tasks.map((task) => {
    const run = latestRuns.get(`${task.phaseId}:${task.activityId}`)
    if (!run) return task

    return {
      ...task,
      status:
        run.status === 'completed'
          ? 'completed'
          : run.status === 'failed' || run.status === 'blocked'
            ? 'blocked'
            : run.status === 'in_progress'
              ? 'in-progress'
              : task.status,
      error: run.error_message || null,
      startedAt:
        run.status === 'completed' || run.status === 'failed' || run.status === 'blocked' || run.status === 'in_progress'
          ? task.startedAt || Date.now()
          : task.startedAt,
      completedAt:
        run.status === 'completed' || run.status === 'failed' || run.status === 'blocked'
          ? task.completedAt || Date.now()
          : task.completedAt,
    }
  })

  const currentPhase = pipeline.phases.find((phase) => phase.name === executionState.workflow?.current_phase)
  const nextStatus =
    executionState.workflow?.status === 'completed'
      ? 'completed'
      : executionState.workflow?.status === 'paused'
        ? 'blocked'
        : executionState.job?.status === 'running' || executionState.workflow?.status === 'active'
          ? 'running'
          : instance.status

  return {
    ...instance,
    tasks,
    status: nextStatus,
    currentPhase: currentPhase?.id || instance.currentPhase,
    currentPhaseName: executionState.workflow?.current_phase || instance.currentPhaseName || null,
    currentActivity: tasks.find((task) => task.status === 'in-progress')?.activityId || instance.currentActivity,
    progress:
      typeof executionState.workflow?.progress === 'number'
        ? executionState.workflow.progress
        : instance.progress,
    jobStatus: executionState.job?.status || instance.jobStatus || null,
  }
}

// Execute a single task
export async function executeTask(
  instance: PipelineInstance,
  task: PipelineTask,
  pipeline: Pipeline
): Promise<PipelineOutput> {
  // Find the activity
  const phase = pipeline.phases.find(p => p.id === task.phaseId)
  const activity = phase?.activities.find(a => a.id === task.activityId)
  
  if (!activity) {
    throw new Error(`Activity not found: ${task.activityId}`)
  }
  
  // Get the prompt based on language
  const promptTemplate = activity.prompts?.[instance.language] || activity.prompts?.en || ''
  
  if (!promptTemplate) {
    throw new Error(`No prompt found for activity: ${activity.id}`)
  }
  
  // Build the context
  const agent = getAgentForRole(useAgentsStore.getState().agents, activity.assignedRole)
  const skillContext = await getSkillContextForAgent(agent?.id || 'iris')
  const knowledgeContext = buildKnowledgeAssetsContext(instance.clientId)
  const context = buildContext(
    promptTemplate,
    instance.clientData,
    instance.language,
    [skillContext, knowledgeContext].filter(Boolean).join('\n\n')
  )
  
  // Call the AI agent
  // This would integrate with the actual agent execution system
  const response = await callAgent(agent?.id || 'iris', context)
  
  return {
    taskId: task.id,
    content: response,
    format: 'markdown',
    artifacts: [],
  }
}

export async function executeActivityBatch(
  instance: PipelineInstance,
  phaseId: string,
  activityId: string,
  pipeline: Pipeline
): Promise<PipelineOutput[]> {
  const tasks = instance.tasks.filter(
    (task) => task.phaseId === phaseId && task.activityId === activityId && task.status === 'pending'
  )

  const phase = pipeline.phases.find((entry) => entry.id === phaseId)
  const activity = phase?.activities.find((entry) => entry.id === activityId)
  if (!activity || !tasks.length) return []

  const batchSize = Math.max(1, activity.batching?.batchSize || 1)
  const parallel = activity.batching?.parallel !== false
  const outputs: PipelineOutput[] = []

  for (let index = 0; index < tasks.length; index += batchSize) {
    const slice = tasks.slice(index, index + batchSize)
    const runner = async (task: PipelineTask) => executeTask(instance, task, pipeline)

    if (parallel) {
      outputs.push(...(await Promise.all(slice.map(runner))))
    } else {
      for (const task of slice) {
        outputs.push(await runner(task))
      }
    }
  }

  return outputs
}

// Call an AI agent
async function callAgent(agentId: string, prompt: string): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('You need to sign in before running pipeline tasks.')
  }

  const state = useAgentsStore.getState()
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      providerSettings: state.providerSettings,
      agentMemories: state.agentMemories,
      artifacts: state.artifacts,
      agents: state.agents,
      clients: state.clients,
      missions: state.missions,
      systemPrompt: `Execute this pipeline activity as agent ${agentId}. Produce only the actual activity output with no routing or management boilerplate.`,
      provider: state.agents.find((agent) => agent.id === agentId)?.provider || state.providerSettings.routing.primaryProvider,
      model: state.agents.find((agent) => agent.id === agentId)?.model || undefined,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Pipeline agent execution failed.')
  }

  return payload.response || ''
}

// Get next pending task
export function getNextTask(instance: PipelineInstance, pipeline: Pipeline): PipelineTask | null {
  // Find first pending task
  return instance.tasks.find(t => t.status === 'pending') || null
}

// Check if phase is complete
export function isPhaseComplete(instance: PipelineInstance, phaseId: string): boolean {
  const phaseTasks = instance.tasks.filter(t => t.phaseId === phaseId)
  return phaseTasks.every(t => t.status === 'completed')
}

// Route a task request to the correct pipeline
export interface TaskRequest {
  description: string
  clientId: string
  language?: 'en' | 'ar'
}

export interface TaskResponse {
  success: boolean
  pipelineId?: string
  pipelineName?: string
  instanceId?: string
  taskId?: string
  message: string
  availablePipelines?: Array<{
    id: string
    name: string
    description: string
    version: string
    phases: Array<{ id: string; name: string }>
  }>
}

interface RemoteExecutionState {
  workflow?: {
    current_phase?: string | null
    progress?: number | null
    status?: string | null
  } | null
  runs?: Array<{
    stage?: string | null
    status?: string | null
    error_message?: string | null
  }>
  job?: {
    status?: string | null
  } | null
}

export async function routeTask(
  request: TaskRequest,
  availablePipelines: Pipeline[]
): Promise<TaskResponse> {
  const { description } = request
  const deliverableType = inferDeliverableTypeFromText(description)
  const spec = getDeliverableSpec(deliverableType)
  const lowerDesc = description.toLowerCase()

  let matchedPipeline =
    (spec.pipelineId ? availablePipelines.find((pipeline) => pipeline.id === spec.pipelineId) : null) || null

  if (!matchedPipeline) {
    const ranked = availablePipelines
      .map((pipeline) => {
        const haystack = [pipeline.name, pipeline.description, ...(pipeline.phases || []).map((phase) => phase.name)].join(' ').toLowerCase()
        const score = lowerDesc
          .split(/\s+/)
          .filter((token) => token.length > 3)
          .reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0)
        return { pipeline, score }
      })
      .sort((a, b) => b.score - a.score)
    matchedPipeline = ranked[0] && ranked[0].score > 0 ? ranked[0].pipeline : null
  }

  if (!matchedPipeline) {
    return {
      success: false,
      message: `Iris classified this as ${spec.label.toLowerCase()} work, but there is no tracked pipeline wired for it yet.`,
      availablePipelines: availablePipelines.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        version: p.version,
        phases: p.phases.map(ph => ({ id: ph.id, name: ph.name })),
      })),
    }
  }

  return {
    success: true,
    pipelineId: matchedPipeline.id,
    pipelineName: matchedPipeline.name,
    message: `Matched ${matchedPipeline.name} for ${spec.label.toLowerCase()} work.`,
  }
}
