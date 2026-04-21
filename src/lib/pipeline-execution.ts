// Pipeline runner compatibility layer.
// Execution now lives on the shared server task lifecycle via /api/pipeline/run.

import { useAgentsStore } from './agents-store'
import type { Pipeline, Phase, Activity } from '@/lib/stores/pipelines-store'
import { pickAgentForRole } from '@/lib/agent-roles'
import type { Client } from '@/lib/client-data'
import { inferDeliverableTypeFromText, getDeliverableSpec } from '@/lib/deliverables'
import { resolvePipelineSelection } from '@/lib/server/ai'

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

function buildLegacyExecutionError() {
  return new Error(
    'Client-side pipeline execution has been retired. Use /api/pipeline/run and the shared server task lifecycle instead.'
  )
}

/**
 * @deprecated Client-side execution is retired. Launch work through /api/pipeline/run.
 */
export async function executeTask(
  _instance: PipelineInstance,
  _task: PipelineTask,
  _pipeline: Pipeline
): Promise<PipelineOutput> {
  throw buildLegacyExecutionError()
}

/**
 * @deprecated Client-side execution is retired. Launch work through /api/pipeline/run.
 */
export async function executeActivityBatch(
  _instance: PipelineInstance,
  _phaseId: string,
  _activityId: string,
  _pipeline: Pipeline
): Promise<PipelineOutput[]> {
  throw buildLegacyExecutionError()
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
  executionMode?: 'pipeline' | 'direct'
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
  const matchedPipeline = resolvePipelineSelection({
    content: description,
    deliverableType,
    pipelines: availablePipelines,
  }).pipeline

  if (!matchedPipeline) {
    return {
      success: true,
      executionMode: 'direct',
      pipelineId: 'direct-execution',
      pipelineName: 'Direct Specialist Execution',
      message: `Iris classified this as ${spec.label.toLowerCase()} work. No formal pipeline is wired yet, so the shared task runner will launch direct specialist execution instead.`,
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
    executionMode: 'pipeline',
    pipelineId: matchedPipeline.id,
    pipelineName: matchedPipeline.name,
    message: `Matched ${matchedPipeline.name} for ${spec.label.toLowerCase()} work.`,
  }
}
