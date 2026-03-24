// Pipeline Execution Engine
// Handles task routing, pipeline execution, and agent coordination

import { useAgentsStore } from './agents-store'
import type { Pipeline, PipelinePhase, Activity } from '@/config/pipelines/pipelines'

export interface PipelineInstance {
  id: string
  pipelineId: string
  clientId: string
  language: 'en' | 'ar'
  status: 'pending' | 'running' | 'completed' | 'paused' | 'blocked'
  currentPhase: string
  currentActivity: string | null
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

// Build execution context from client data
function buildContext(
  promptTemplate: string,
  clientData: Record<string, string>,
  language: 'en' | 'ar'
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
  
  return context
}

// Get agent for a role
function getAgentForRole(
  agents: ReturnType<typeof useAgentsStore.getState>['agents'],
  role: string
): { id: string; name: string } | null {
  const roleMap: Record<string, string[]> = {
    'client-services': ['sage'],
    'orchestration': ['iris', 'piper'],
    'creative': ['finn', 'echo', 'nova-studio'],
    'media': ['nova', 'dex'],
    'research': ['atlas'],
    'strategy': ['maya'],
    'brand-strategist': ['maya'],
    'copy': ['echo'],
    'visual-producer': ['nova-studio'],
    'media-planner': ['nova'],
    'performance': ['dex'],
    'content-strategist': ['maya'],
    'traffic-manager': ['piper'],
    'creative-director': ['finn'],
    'seo-specialist': ['atlas'],
  }
  
  const agentIds = roleMap[role] || []
  const agent = agents.find(a => agentIds.includes(a.id))
  return agent ? { id: agent.id, name: agent.name } : null
}

// Create a new pipeline instance
export function createPipelineInstance(
  pipeline: Pipeline,
  clientId: string,
  clientData: Record<string, string>,
  language: 'en' | 'ar'
): PipelineInstance {
  const instance: PipelineInstance = {
    id: `pipeline-${Date.now()}`,
    pipelineId: pipeline.id,
    clientId,
    language,
    status: 'pending',
    currentPhase: pipeline.phases[0]?.id || '',
    currentActivity: null,
    tasks: [],
    outputs: new Map(),
    clientData,
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
  const context = buildContext(promptTemplate, instance.clientData, instance.language)
  
  // Get assigned agent
  const agent = getAgentForRole(useAgentsStore.getState().agents, activity.assignedRole)
  
  // Call the AI agent
  // This would integrate with the actual agent execution system
  const response = await callAgent(agent?.name || 'Iris', context)
  
  return {
    taskId: task.id,
    content: response,
    format: 'markdown',
    artifacts: [],
  }
}

// Call an AI agent
async function callAgent(agentName: string, prompt: string): Promise<string> {
  // This is a placeholder - integrates with the actual agent system
  // For now, return a mock response
  return `[${agentName}] Task completed:\n\n${prompt.slice(0, 200)}...\n\n[This would call the actual AI agent with the prompt]`
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
  availablePipelines?: Pipeline[]
}

export async function routeTask(
  request: TaskRequest,
  availablePipelines: Pipeline[]
): Promise<TaskResponse> {
  const { description, clientId, language = 'en' } = request
  
  // Analyze the task description to find matching pipeline
  const lowerDesc = description.toLowerCase()
  
  // Pipeline matching keywords
  const pipelineKeywords: Record<string, string[]> = {
    'content-calendar': [
      'content calendar', 'social media content', 'content ideas', 'post copy',
      '30 day content', 'content plan', 'hashtags', 'visual brief', 'hooks',
      'instagram', 'linkedin', 'tiktok', 'facebook', 'twitter', 'social posts'
    ],
    'campaign-brief': [
      'campaign brief', 'campaign strategy', 'marketing campaign', 'campaign plan',
      'campaign concept', 'positioning', 'messaging'
    ],
    'ad-creative': [
      'ad creative', 'advertising creative', 'ad copy', 'ad assets', 'banner ads',
      'facebook ads', 'google ads', 'instagram ads', 'ad campaign'
    ],
    'seo-audit': [
      'seo audit', 'seo analysis', 'search engine optimization', 'keyword research',
      'technical seo', 'seo report'
    ],
    'competitor-research': [
      'competitor research', 'competitive analysis', 'competitor report',
      'market research', 'competitor intelligence'
    ],
    'media-plan': [
      'media plan', 'media strategy', 'channel strategy', 'budget allocation',
      'media buying', 'ad spend'
    ],
  }
  
  // Find matching pipeline
  let matchedPipelineId: string | null = null
  let highestMatchCount = 0
  
  for (const [pipelineId, keywords] of Object.entries(pipelineKeywords)) {
    const matchCount = keywords.filter(kw => lowerDesc.includes(kw)).length
    if (matchCount > highestMatchCount) {
      highestMatchCount = matchCount
      matchedPipelineId = pipelineId
    }
  }
  
  if (!matchedPipelineId) {
    return {
      success: false,
      message: `No matching pipeline found for: "${description.slice(0, 50)}..."`,
      availablePipelines: availablePipelines.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        version: p.version,
        phases: p.phases.map(ph => ({ id: ph.id, name: ph.name })),
      })),
    }
  }
  
  const matchedPipeline = availablePipelines.find(p => p.id === matchedPipelineId)
  
  if (!matchedPipeline) {
    return {
      success: false,
      message: `Pipeline found but not loaded: ${matchedPipelineId}`,
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
    message: `Found pipeline: ${matchedPipeline.name}`,
  }
}
