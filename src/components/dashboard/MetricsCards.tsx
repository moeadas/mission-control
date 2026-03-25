'use client'

import React from 'react'
import { useAgentsStore } from '@/lib/agents-store'
import { Card } from '@/components/ui/Card'
import { Bot, CheckCircle2, TrendingUp, Plus, Building2, Target } from 'lucide-react'
import { AgentBot } from '@/components/agents/AgentBot'
import { useRouter } from 'next/navigation'
import { DELIVERABLE_LABELS } from '@/lib/bot-animations'

export function MetricsCards() {
  const agents = useAgentsStore((state) => state.agents)
  const missions = useAgentsStore((state) => state.missions)

  const activeAgents = agents.filter((a) => a.status === 'active').length
  const activeTasks = missions.filter((task) => ['queued', 'in_progress', 'review', 'blocked', 'paused'].includes(task.status)).length
  const completedTasks = missions.filter((task) => task.status === 'completed').length
  const totalTasks = agents.filter((a) => a.currentTask).length

  const metrics = [
    {
      label: 'Active Agents',
      value: activeAgents,
      total: agents.length,
      icon: Bot,
      color: '#9b6dff',
      bg: 'rgba(155, 109, 255, 0.1)',
    },
    {
      label: 'Running Tasks',
      value: activeTasks,
      total: missions.length,
      icon: Target,
      color: '#ff7c42',
      bg: 'rgba(255, 124, 66, 0.1)',
    },
    {
      label: 'Completed',
      value: completedTasks,
      total: null,
      icon: CheckCircle2,
      color: '#00d4aa',
      bg: 'rgba(0, 212, 170, 0.1)',
    },
    {
      label: 'Active Tasks',
      value: totalTasks,
      total: null,
      icon: TrendingUp,
      color: '#ff5fa0',
      bg: 'rgba(255, 95, 160, 0.1)',
    },
    {
      label: 'Open Missions',
      value: missions.filter((mission) => !['completed', 'cancelled'].includes(mission.status)).length,
      total: missions.length,
      icon: Target,
      color: '#4f8ef7',
      bg: 'rgba(79, 142, 247, 0.1)',
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
      {metrics.map((m, i) => {
        const Icon = m.icon
        return (
          <Card
            key={m.label}
            className="relative overflow-hidden"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className="absolute top-0 left-0 w-full h-0.5"
              style={{ background: m.color }}
            />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                  {m.label}
                </p>
                <div className="flex items-end gap-1 mt-2">
                  <span
                    className="text-3xl font-heading font-bold"
                    style={{ color: m.color }}
                  >
                    {m.value}
                  </span>
                  {m.total !== null && (
                    <span className="text-sm text-text-dim font-mono mb-1">
                      /{m.total}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: m.bg }}
              >
                <Icon size={18} style={{ color: m.color }} />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export function QuickActions() {
  const openEditor = useAgentsStore((state) => state.openEditor)
  const createMissionFromPrompt = useAgentsStore((state) => state.createMissionFromPrompt)
  const router = useRouter()

  return (
    <Card>
      <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-4">
        Quick Actions
      </h3>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => openEditor(null)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent-blue/10 border border-accent-blue/20 hover:bg-accent-blue/20 transition-all group"
        >
          <Plus size={16} className="text-accent-blue" />
          <span className="text-sm text-text-primary">Add New Agent</span>
        </button>
        <button
          onClick={() => router.push('/office')}
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border hover:border-border-glow transition-all group"
        >
          <Building2 size={16} className="text-text-secondary" />
          <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">Open Virtual Office</span>
        </button>
        <button
          onClick={() => createMissionFromPrompt('Draft a new client-ready mission from dashboard quick actions')}
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent-orange/10 border border-accent-orange/20 hover:bg-accent-orange/20 transition-all group"
        >
          <Target size={16} className="text-accent-orange" />
          <span className="text-sm text-text-primary">Create Task</span>
        </button>
      </div>
    </Card>
  )
}

export function AgentStrip() {
  const agents = useAgentsStore((state) => state.agents)
  const openEditor = useAgentsStore((state) => state.openEditor)
  const router = useRouter()
  const active = agents.filter((a) => a.status === 'active')

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider">
          Active Team
        </h3>
        <button
          onClick={() => router.push('/agents')}
          className="text-[11px] font-mono text-accent-blue hover:underline"
        >
          View all →
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        {active.slice(0, 6).map((agent) => (
          <button
            key={agent.id}
            onClick={() => openEditor(agent.id)}
            className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-card transition-all group"
          >
            <AgentBot
              name={agent.name}
              avatar={agent.avatar}
              color={agent.color}
              status={agent.status}
              animation={agent.currentTask ? 'working' : 'idle'}
              size={44}
            />
            <span className="text-[10px] font-mono text-text-secondary group-hover:text-text-primary transition-colors">
              {agent.name}
            </span>
          </button>
        ))}
        {active.length === 0 && (
          <p className="text-xs text-text-dim py-4">No active agents</p>
        )}
      </div>
    </Card>
  )
}

export function MissionQueue() {
  const missions = useAgentsStore((state) => state.missions)
  const clients = useAgentsStore((state) => state.clients)
  const activeMissionId = useAgentsStore((state) => state.activeMissionId)
  const setActiveMission = useAgentsStore((state) => state.setActiveMission)
  const updateMission = useAgentsStore((state) => state.updateMission)
  const router = useRouter()

  const statusColor: Record<string, string> = {
    queued: '#ffd166',
    in_progress: '#00d4aa',
    blocked: '#ff7c42',
    review: '#9b6dff',
    paused: '#8b92a8',
    cancelled: '#555b73',
    completed: '#4f8ef7',
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider">
          Task Queue
        </h3>
        <span className="text-[11px] font-mono text-text-dim">{missions.length} tracked</span>
      </div>
      <div className="space-y-3">
        {missions.slice(0, 4).map((mission) => {
          const client = clients.find((item) => item.id === mission.clientId)
          return (
            <div
              key={mission.id}
              onClick={() => {
                setActiveMission(mission.id)
                router.push(`/tasks/${mission.id}`)
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                activeMissionId === mission.id ? 'bg-base border-border-glow' : 'bg-base/60 border-border hover:border-border-glow'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{mission.title}</p>
                  <p className="text-[11px] text-text-secondary mt-1">{client?.name || 'General ops'} · {DELIVERABLE_LABELS[mission.deliverableType] || mission.deliverableType}</p>
                </div>
                <span className="text-[10px] font-mono uppercase" style={{ color: statusColor[mission.status] }}>
                  {mission.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-panel overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${mission.progress}%`, background: statusColor[mission.status] }} />
              </div>
              <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() =>
                    updateMission(mission.id, {
                      status: mission.status === 'paused' ? 'in_progress' : 'paused',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg border border-border text-[10px] text-text-secondary hover:text-text-primary"
                >
                  {mission.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={() => updateMission(mission.id, { status: 'cancelled', progress: 0 })}
                  className="px-2.5 py-1 rounded-lg border border-border text-[10px] text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateMission(mission.id, { status: 'completed', progress: 100 })}
                  className="px-2.5 py-1 rounded-lg border border-border text-[10px] text-text-secondary hover:text-text-primary"
                >
                  Complete
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
