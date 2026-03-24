'use client'

import React, { useState, useEffect } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { useAgentsStore } from '@/lib/agents-store'
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Plus,
  GripVertical,
  FileText,
  MessageSquare,
  Lightbulb,
  Target,
  Rocket,
  BarChart3,
  AlertCircle,
  ArrowRight,
  User,
  Users,
  Zap,
} from 'lucide-react'
import { clsx } from 'clsx'

// Types
interface Activity {
  id: string
  name: string
  description: string
  assignedRole: string
  inputs: string[]
  outputs: string[]
  checklist: string[]
}

interface Phase {
  id: string
  name: string
  color: string
  activities: Activity[]
}

interface Pipeline {
  id: string
  name: string
  description: string
  version: string
  isDefault: boolean
  estimatedDuration: string
  phases: Phase[]
}

interface WorkflowTask {
  id: string
  missionId: string
  pipelineId: string
  phaseId: string
  activityId: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'blocked'
  assignedAgent: string | null
  checklist: string[]
  completedItems: string[]
  createdAt: number
  updatedAt: number
}

const PHASE_ICONS: Record<string, React.ReactNode> = {
  intake: <Search size={14} />,
  research: <Lightbulb size={14} />,
  strategy: <Target size={14} />,
  planning: <FileText size={14} />,
  briefing: <MessageSquare size={14} />,
  creative: <Zap size={14} />,
  creation: <Plus size={14} />,
  production: <Rocket size={14} />,
  review: <Filter size={14} />,
  approval: <CheckCircle2 size={14} />,
  testing: <BarChart3 size={14} />,
  analysis: <BarChart3 size={14} />,
  delivery: <Rocket size={14} />,
  analytics: <BarChart3 size={14} />,
  concepting: <Lightbulb size={14} />,
  identification: <Search size={14} />,
  strategy: <Target size={14} />,
}

export default function PipelinePage() {
  const agents = useAgentsStore(state => state.agents)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [showNewMission, setShowNewMission] = useState(false)
  const [selectedMission, setSelectedMission] = useState<string>('mission-1')

  // Load pipelines
  useEffect(() => {
    async function loadPipelines() {
      try {
        const modules = await import('@/config/pipelines/pipelines.json')
        setPipelines(modules.default.pipelines)
        if (modules.default.pipelines.length > 0) {
          setSelectedPipeline(modules.default.pipelines[0].id)
        }
      } catch (error) {
        console.error('Failed to load pipelines:', error)
      }
    }
    loadPipelines()
  }, [])

  const currentPipeline = pipelines.find(p => p.id === selectedPipeline)
  const mission = useAgentsStore(state => state.missions.find(m => m.id === selectedMission))
  const missionTasks = tasks.filter(t => t.missionId === selectedMission)

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  const getTaskStatus = (phaseId: string, activityId: string): WorkflowTask['status'] => {
    const task = missionTasks.find(t => t.phaseId === phaseId && t.activityId === activityId)
    return task?.status || 'pending'
  }

  const toggleTaskStatus = (phaseId: string, activityId: string, activityName: string) => {
    setTasks(prev => {
      const existing = prev.find(t => t.phaseId === phaseId && t.activityId === activityId && t.missionId === selectedMission)
      if (existing) {
        return prev.map(t => {
          if (t.id === existing.id) {
            const nextStatus: WorkflowTask['status'] =
              t.status === 'pending' ? 'in-progress' :
              t.status === 'in-progress' ? 'completed' :
              t.status === 'completed' ? 'pending' : 'pending'
            return { ...t, status: nextStatus, updatedAt: Date.now() }
          }
          return t
        })
      } else {
        const newTask: WorkflowTask = {
          id: `task-${Date.now()}`,
          missionId: selectedMission,
          pipelineId: selectedPipeline || '',
          phaseId,
          activityId,
          title: activityName,
          description: '',
          status: 'in-progress',
          assignedAgent: null,
          checklist: [],
          completedItems: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        return [...prev, newTask]
      }
    })
  }

  const getPhaseProgress = (phase: Phase): { completed: number; total: number } => {
    const phaseTasks = missionTasks.filter(t => t.phaseId === phase.id)
    const completed = phaseTasks.filter(t => t.status === 'completed').length
    return { completed, total: phase.activities.length }
  }

  const getTotalProgress = (): { completed: number; total: number } => {
    if (!currentPipeline) return { completed: 0, total: 0 }
    const total = currentPipeline.phases.reduce((sum, p) => sum + p.activities.length, 0)
    const completed = missionTasks.filter(t => t.status === 'completed').length
    return { completed, total }
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
              <BarChart3 size={20} className="text-accent-purple" />
              Production Pipeline
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {currentPipeline?.name || 'Select a pipeline'} — {currentPipeline?.estimatedDuration || ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Mission Selector */}
            <select
              value={selectedMission}
              onChange={e => setSelectedMission(e.target.value)}
              className="bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
            >
              <option value="mission-1">Campaign Brief</option>
              <option value="mission-2">Social Content</option>
              <option value="mission-3">Ad Creative</option>
            </select>
            {/* Pipeline Selector */}
            <select
              value={selectedPipeline || ''}
              onChange={e => setSelectedPipeline(e.target.value)}
              className="bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
            >
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 border-b border-border bg-base-100/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-secondary">Overall Progress</span>
                <span className="text-text-primary font-medium">
                  {getTotalProgress().completed}/{getTotalProgress().total} activities
                </span>
              </div>
              <div className="h-2 bg-base-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-purple transition-all duration-300"
                  style={{
                    width: `${getTotalProgress().total > 0
                      ? (getTotalProgress().completed / getTotalProgress().total) * 100
                      : 0}%`
                  }}
                />
              </div>
            </div>
            <div className="text-xs text-text-secondary text-right">
              {mission?.name || 'No mission selected'}
            </div>
          </div>
        </div>

        {/* Pipeline Kanban */}
        <div className="flex-1 overflow-x-auto p-6">
          {currentPipeline ? (
            <div className="flex gap-4 h-full min-w-max">
              {currentPipeline.phases.map(phase => {
                const progress = getPhaseProgress(phase)
                const isExpanded = expandedPhases.has(phase.id)
                return (
                  <div
                    key={phase.id}
                    className="w-80 flex flex-col bg-base-100 rounded-xl border border-border flex-shrink-0"
                  >
                    {/* Phase Header */}
                    <div
                      className="p-4 border-b border-border cursor-pointer"
                      onClick={() => togglePhase(phase.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: phase.color + '20', color: phase.color }}
                        >
                          {PHASE_ICONS[phase.id] || <Circle size={14} />}
                        </div>
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-text-dim" />
                        ) : (
                          <ChevronRight size={16} className="text-text-dim" />
                        )}
                      </div>
                      <h3 className="font-medium text-sm text-text-primary">{phase.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-secondary">
                          {progress.completed}/{progress.total} complete
                        </span>
                        <div className="flex-1 h-1 bg-base-300 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                              backgroundColor: phase.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {phase.activities.map(activity => {
                        const status = getTaskStatus(phase.id, activity.id)
                        return (
                          <div
                            key={activity.id}
                            className={clsx(
                              'p-3 rounded-lg border transition-all cursor-pointer',
                              status === 'completed'
                                ? 'bg-accent-green/5 border-accent-green/20'
                                : status === 'in-progress'
                                ? 'bg-accent-purple/5 border-accent-purple/20'
                                : status === 'blocked'
                                ? 'bg-accent-red/5 border-accent-red/20'
                                : 'bg-base border-border hover:border-border-glow'
                            )}
                            onClick={() => toggleTaskStatus(phase.id, activity.id, activity.name)}
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5">
                                {status === 'completed' ? (
                                  <CheckCircle2 size={16} className="text-accent-green" />
                                ) : status === 'in-progress' ? (
                                  <Circle size={16} className="text-accent-purple fill-accent-purple/20" />
                                ) : status === 'blocked' ? (
                                  <AlertCircle size={16} className="text-accent-red" />
                                ) : (
                                  <Circle size={16} className="text-text-dim" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={clsx(
                                  'text-sm font-medium',
                                  status === 'completed' ? 'text-text-primary line-through opacity-60' : 'text-text-primary'
                                )}>
                                  {activity.name}
                                </p>
                                <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                                  {activity.description}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                  <span
                                    className="px-2 py-0.5 rounded text-[10px] font-medium"
                                    style={{
                                      backgroundColor: phase.color + '15',
                                      color: phase.color,
                                    }}
                                  >
                                    {activity.assignedRole}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <BarChart3 size={48} className="text-text-dim mb-4" />
              <p className="text-text-secondary">No pipeline selected</p>
              <p className="text-xs text-text-dim mt-1">Select a pipeline to view the workflow</p>
            </div>
          )}
        </div>

        {/* Activity Legend */}
        <div className="px-6 py-3 border-t border-border bg-base-100/50 flex-shrink-0">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <Circle size={12} className="text-text-dim" />
              <span className="text-text-secondary">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle size={12} className="text-accent-purple fill-accent-purple/20" />
              <span className="text-text-secondary">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-accent-green" />
              <span className="text-text-secondary">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle size={12} className="text-accent-red" />
              <span className="text-text-secondary">Blocked</span>
            </div>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
