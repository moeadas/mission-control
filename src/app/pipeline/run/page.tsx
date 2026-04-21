'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { useAgentsStore } from '@/lib/agents-store'
import { SkillImporter } from '@/components/skills/SkillImporter'
import {
  Play,
  Pause,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  Zap,
  Globe,
  FileText,
  MessageSquare,
  Bot,
  Clock,
  Send,
  Loader2,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  routeTask,
  applyExecutionStateToInstance,
  createPipelineInstance,
  validatePipelineClientData,
  type PipelineInstance,
} from '@/lib/pipeline-execution'
import type { Pipeline } from '@/lib/stores/pipelines-store'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import Link from 'next/link'

export default function PipelineRunPage() {
  const agents = useAgentsStore(state => state.agents)
  const clients = useAgentsStore(state => state.clients)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id || '')
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  
  // Task request
  const [taskDescription, setTaskDescription] = useState('')
  const [routingResult, setRoutingResult] = useState<any>(null)
  const [isRouting, setIsRouting] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  
  // Active instances
  const [instances, setInstances] = useState<PipelineInstance[]>([])
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'run' | 'skills' | 'active'>('run')

  function buildDirectExecutionPipeline() {
    return {
      id: 'direct-execution',
      name: 'Direct Specialist Execution',
      description: 'Fallback execution mode for deliverables that do not have a formal pipeline yet.',
      version: 'system',
      isDefault: true,
      estimatedDuration: 'Adaptive',
      clientProfileFields: [],
      phases: [
        {
          id: 'direct',
          name: 'Direct Execution',
          color: 'accent-purple',
          activities: [
            {
              id: 'direct-execution',
              name: 'Specialist Delivery',
              description: 'Run the shared specialist execution flow without a formal pipeline.',
              assignedRole: 'specialist',
              inputs: [],
              outputs: [],
              checklist: [],
            },
          ],
        },
      ],
    } as Pipeline
  }

  useEffect(() => {
    async function loadPipelines() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const response = await fetch('/api/pipelines', {
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : {},
        })

        if (!response.ok) {
          throw new Error('Failed to load pipelines.')
        }

        const loadedPipelines = await response.json()
        setPipelines(loadedPipelines)
        if (loadedPipelines.length > 0) {
          setSelectedPipeline(loadedPipelines[0])
        }
      } catch (error) {
        console.error('Failed to load pipelines:', error)
      }
    }
    loadPipelines()
  }, [supabase])

  useEffect(() => {
    if (!instances.length) return

    const activeTaskIds = instances
      .filter((instance) => instance.taskId && instance.status !== 'completed')
      .map((instance) => instance.taskId as string)

    if (!activeTaskIds.length) return

    let cancelled = false
    let pollCount = 0

    const poll = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const updates = await Promise.all(
          activeTaskIds.map(async (taskId) => {
            const response = await fetch(`/api/tasks/${taskId}/execution`, {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              cache: 'no-store',
            })

            if (!response.ok) return null
            return {
              taskId,
              state: await response.json(),
            }
          })
        )

        if (cancelled) return

        setInstances((current) =>
          current.map((instance) => {
            if (!instance.taskId) return instance
            const update = updates.find((entry) => entry?.taskId === instance.taskId)
            if (!update) return instance
            const pipeline =
              pipelines.find((entry) => entry.id === instance.pipelineId) ||
              (instance.pipelineId === 'direct-execution' ? buildDirectExecutionPipeline() : null)
            return pipeline ? applyExecutionStateToInstance(instance, update.state, pipeline) : instance
          })
        )
      } catch (error) {
        console.error('Failed to poll pipeline execution:', error)
        pollCount += 1
      } finally {
        if (!cancelled) {
          const delay = Math.min(2500 * Math.pow(1.4, pollCount), 15000)
          window.setTimeout(() => {
            if (!cancelled) poll()
          }, delay)
        }
      }
    }

    poll()

    return () => {
      cancelled = true
    }
  }, [instances.length, instances.map((instance) => instance.taskId).join(','), pipelines, supabase])

  const handleRouteTask = async () => {
    if (!taskDescription.trim()) return
    
    setIsRouting(true)
    setRoutingResult(null)
    
    try {
      const result = await routeTask(
        { description: taskDescription, clientId: selectedClient, language },
        pipelines
      )
      setRoutingResult(result)
    } catch (error) {
      setRoutingResult({
        success: false,
        message: `Error: ${error}`,
      })
    }
    
    setIsRouting(false)
  }

  const startExecution = async (routing: { pipelineId?: string; pipelineName?: string; executionMode?: 'pipeline' | 'direct' }) => {
    const isDirectExecution = routing.executionMode === 'direct' || routing.pipelineId === 'direct-execution'
    const pipeline = !isDirectExecution && routing.pipelineId
      ? pipelines.find((entry) => entry.id === routing.pipelineId) || null
      : null
    const directPipeline = buildDirectExecutionPipeline()
    const clientData = createPipelineInstance(pipeline || directPipeline, selectedClient, {}, language).clientData

    if (pipeline) {
      const validation = validatePipelineClientData(pipeline, clientData)
      if (!validation.ok) {
        setRoutingResult({
          success: false,
          message: validation.message,
          availablePipelines: [
            {
              id: pipeline.id,
              name: pipeline.name,
              description: [
                validation.missingFields.length ? `Missing required fields: ${validation.missingFields.join(', ')}` : '',
                validation.missingTemplateVariables.length
                  ? `Missing template variables: ${validation.missingTemplateVariables.join(', ')}`
                  : '',
              ]
                .filter(Boolean)
                .join(' • '),
              version: pipeline.version,
              phases: pipeline.phases.map(ph => ({ id: ph.id, name: ph.name })),
            },
          ],
        })
        return
      }
    }

    if (!pipeline && !isDirectExecution) {
      setRoutingResult({
        success: false,
        message: 'The selected execution mode is not available.',
      })
      return
    }

    setIsLaunching(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('You need to sign in before running pipelines.')
      }

      const response = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          description: taskDescription,
          clientId: selectedClient,
          language,
          pipelineId: pipeline?.id,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to launch tracked pipeline run.')
      }

      const instance = createPipelineInstance(pipeline || directPipeline, selectedClient, clientData, language)
      instance.id = payload.taskId || instance.id
      instance.taskId = payload.taskId
      instance.status = 'running'
      instance.pipelineId = payload.executionMode === 'direct' ? 'direct-execution' : (pipeline?.id || instance.pipelineId)
      instance.pipelineName = payload.pipeline?.name || routing.pipelineName || pipeline?.name || directPipeline.name
      instance.currentPhaseName =
        payload.pipeline?.phases?.[0]?.name ||
        pipeline?.phases[0]?.name ||
        'Direct Execution'
      instance.progress = 5
      instance.jobStatus = payload.job?.status || 'queued'

      setInstances((prev) => [instance, ...prev.filter((entry) => entry.taskId !== instance.taskId)])
      setActiveTab('active')
      setRoutingResult(null)
      setTaskDescription('')
    } catch (error) {
      setRoutingResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to launch pipeline.',
      })
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
            <Zap size={20} className="text-accent-purple" />
            Pipeline Runner
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Route tasks to pipelines, execute with AI agents, manage skills
          </p>
        </div>
        
        {/* Tabs */}
        <div className="px-6 border-b border-border flex gap-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab('run')}
            className={clsx(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'run'
                ? 'border-accent-purple text-accent-purple'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <Send size={14} className="inline mr-1" /> Route Task
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={clsx(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'skills'
                ? 'border-accent-purple text-accent-purple'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <FileText size={14} className="inline mr-1" /> Import Skills
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={clsx(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'active'
                ? 'border-accent-purple text-accent-purple'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <Clock size={14} className="inline mr-1" /> Active Pipelines
            {instances.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded-full text-xs">
                {instances.length}
              </span>
            )}
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Route Task Tab */}
          {activeTab === 'run' && (
            <div className="max-w-3xl space-y-6">
              {/* Task Input */}
              <div className="bg-base-200 rounded-xl p-6 space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <MessageSquare size={16} />
                  Describe the Task
                </h3>
                
                <textarea
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  placeholder="e.g., 'Create a 30-day content calendar for my fitness brand targeting women 25-35 on Instagram and LinkedIn'"
                  className="w-full h-32 bg-base-300 rounded-lg p-4 text-sm resize-none outline-none focus:ring-2 focus:ring-accent-purple"
                />
                
                {/* Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Client</label>
                    <select
                      value={selectedClient}
                      onChange={e => setSelectedClient(e.target.value)}
                      className="w-full bg-base-300 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-purple"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Language</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setLanguage('en')}
                        className={clsx(
                          'p-2 rounded-lg border text-center text-sm transition-all',
                          language === 'en'
                            ? 'bg-accent-purple/20 border-accent-purple ring-2 ring-accent-purple'
                            : 'bg-base-300 border-border hover:border-accent-purple'
                        )}
                      >
                        🇬🇧 English
                      </button>
                      <button
                        onClick={() => setLanguage('ar')}
                        className={clsx(
                          'p-2 rounded-lg border text-center text-sm transition-all',
                          language === 'ar'
                            ? 'bg-accent-purple/20 border-accent-purple ring-2 ring-accent-purple'
                            : 'bg-base-300 border-border hover:border-accent-purple'
                        )}
                      >
                        🇸🇦 العربية
                      </button>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleRouteTask}
                  disabled={!taskDescription.trim() || isRouting}
                  className={clsx(
                    'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all',
                    !taskDescription.trim() || isRouting
                      ? 'bg-base-300 text-text-dim cursor-not-allowed'
                      : 'bg-accent-purple text-white hover:bg-accent-purple/80'
                  )}
                >
                  {isRouting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Routing...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Route to Pipeline
                    </>
                  )}
                </button>
              </div>
              
              {/* Routing Result */}
              {routingResult && (
                <div className={clsx(
                  'rounded-xl p-6 border',
                  routingResult.success
                    ? 'bg-accent-green/5 border-accent-green/20'
                    : 'bg-accent-red/5 border-accent-red/20'
                )}>
                  {routingResult.success ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 size={20} className="text-accent-green" />
                        <h3 className="font-medium text-accent-green">{routingResult.message}</h3>
                      </div>
                      
                      <div className="bg-base-200 rounded-lg p-4 mb-4">
                        <p className="text-sm">
                          <span className="text-text-secondary">
                            {routingResult.executionMode === 'direct' ? 'Execution mode:' : 'Pipeline:'}
                          </span>{' '}
                          <span className="font-medium">{routingResult.pipelineName}</span>
                        </p>
                        <p className="text-xs text-text-dim mt-1">
                          {routingResult.executionMode === 'direct'
                            ? 'This deliverable will run through the shared specialist task runner without a formal pipeline template.'
                            : selectedPipeline?.description}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => startExecution(routingResult)}
                        disabled={isLaunching}
                        className={clsx(
                          'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors',
                          isLaunching
                            ? 'bg-base-300 text-text-dim cursor-not-allowed'
                            : 'bg-accent-green text-white hover:bg-accent-green/80'
                        )}
                      >
                        {isLaunching ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        Start Tracked Run: {routingResult.pipelineName}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <AlertCircle size={20} className="text-accent-red" />
                        <h3 className="font-medium text-accent-red">No Matching Pipeline</h3>
                      </div>
                      
                      <p className="text-sm text-text-secondary mb-4">
                        {routingResult.message}
                      </p>
                      
                      {routingResult.availablePipelines && (
                        <div>
                          <p className="text-sm font-medium mb-2">Available Pipelines:</p>
                          <div className="space-y-2">
                            {routingResult.availablePipelines.map((p: any) => (
                              <div key={p.id} className="bg-base-200 rounded-lg p-3">
                                <p className="font-medium text-sm">{p.name}</p>
                                <p className="text-xs text-text-secondary">{p.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Import Skills Tab */}
          {activeTab === 'skills' && (
            <div className="max-w-4xl">
              <SkillImporter />
            </div>
          )}
          
          {/* Active Pipelines Tab */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {instances.length === 0 ? (
                <div className="text-center py-20">
                  <Zap size={48} className="mx-auto text-text-dim mb-4" />
                  <p className="text-text-secondary">No active pipelines</p>
                  <p className="text-xs text-text-dim mt-1">
                    Route a task to start a pipeline
                  </p>
                </div>
              ) : (
                instances.map(instance => (
                  <div key={instance.id} className="bg-base-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{instance.pipelineName || instance.pipelineId}</h3>
                        <p className="text-xs text-text-secondary">
                          Client: {instance.clientId} • Language: {instance.language}
                        </p>
                        {instance.taskId && (
                          <p className="text-xs text-text-dim mt-1">
                            Task ID: {instance.taskId}
                            {' · '}
                            Phase: {instance.currentPhaseName || instance.currentPhase}
                          </p>
                        )}
                      </div>
                      <span className={clsx(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        instance.status === 'running' ? 'bg-accent-green/20 text-accent-green' :
                        instance.status === 'pending' ? 'bg-accent-yellow/20 text-accent-yellow' :
                        'bg-base-300 text-text-secondary'
                      )}>
                        {instance.status}
                      </span>
                    </div>
                    
                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-secondary">Progress</span>
                        <span className="font-medium">
                          {typeof instance.progress === 'number'
                            ? `${instance.progress}%`
                            : `${instance.tasks.filter(t => t.status === 'completed').length}/${instance.tasks.length}`}
                        </span>
                      </div>
                      <div className="h-2 bg-base-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-purple transition-all"
                          style={{
                            width: `${typeof instance.progress === 'number'
                              ? instance.progress
                              : (instance.tasks.filter(t => t.status === 'completed').length / Math.max(instance.tasks.length, 1)) * 100}%`
                          }}
                        />
                      </div>
                    </div>

                    {instance.taskId && (
                      <div className="mb-4 text-xs text-text-secondary flex items-center justify-between gap-3">
                        <span>Live execution is being tracked through the shared task runner.</span>
                        <Link href={`/tasks/${instance.taskId}`} className="text-accent-purple hover:underline">
                          Open task console
                        </Link>
                      </div>
                    )}
                    
                    {/* Tasks */}
                    <div className="space-y-2">
                      {instance.tasks.slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center gap-2 text-sm">
                          {task.status === 'completed' ? (
                            <CheckCircle2 size={16} className="text-accent-green" />
                          ) : task.status === 'in-progress' ? (
                            <Loader2 size={16} className="text-accent-purple animate-spin" />
                          ) : task.status === 'blocked' ? (
                            <AlertCircle size={16} className="text-accent-red" />
                          ) : (
                            <Circle size={16} className="text-text-dim" />
                          )}
                          <span className={task.status === 'completed' ? 'line-through opacity-60' : ''}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                      {instance.tasks.length > 5 && (
                        <p className="text-xs text-text-dim">+{instance.tasks.length - 5} more tasks</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </ClientShell>
  )
}
