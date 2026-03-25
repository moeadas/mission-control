'use client'

import React from 'react'
import { useAgentsStore } from '@/lib/agents-store'
import { Card } from '@/components/ui/Card'
import { Bot, CheckCircle2, TrendingUp, Plus, Building2, Target, Zap } from 'lucide-react'
import { AgentBot } from '@/components/agents/AgentBot'
import { useRouter } from 'next/navigation'
import { DELIVERABLE_LABELS } from '@/lib/bot-animations'

export function MetricsCards() {
  const agents = useAgentsStore((state) => state.agents)
  const missions = useAgentsStore((state) => state.missions)

  const activeAgents = agents.filter((a) => a.status === 'active').length
  const activeTasks = missions.filter((task) =>
    ['queued', 'in_progress', 'review', 'blocked', 'paused'].includes(task.status)
  ).length
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
      ring: 'rgba(155, 109, 255, 0.3)',
    },
    {
      label: 'Running Tasks',
      value: activeTasks,
      total: missions.length,
      icon: Target,
      color: '#ff7c42',
      bg: 'rgba(255, 124, 66, 0.1)',
      ring: 'rgba(255, 124, 66, 0.3)',
    },
    {
      label: 'Completed',
      value: completedTasks,
      total: null,
      icon: CheckCircle2,
      color: '#00d4aa',
      bg: 'rgba(0, 212, 170, 0.1)',
      ring: 'rgba(0, 212, 170, 0.3)',
    },
    {
      label: 'On Task',
      value: totalTasks,
      total: null,
      icon: TrendingUp,
      color: '#ff5fa0',
      bg: 'rgba(255, 95, 160, 0.1)',
      ring: 'rgba(255, 95, 160, 0.3)',
    },
    {
      label: 'Open Missions',
      value: missions.filter((m) => !['completed', 'cancelled'].includes(m.status)).length,
      total: missions.length,
      icon: Zap,
      color: '#4f8ef7',
      bg: 'rgba(79, 142, 247, 0.1)',
      ring: 'rgba(79, 142, 247, 0.3)',
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
      {metrics.map((m, i) => {
        const Icon = m.icon
        return (
          <div
            key={m.label}
            className="card-surface p-5 hover-lift relative overflow-hidden transition-shadow duration-200"
            style={{
              animationDelay: `${i * 60}ms`,
              boxShadow: 'none',
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${m.color}18, 0 0 0 1px ${m.color}30`
              ;(e.currentTarget as HTMLElement).style.borderColor = `${m.color}50`
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'none'
              ;(e.currentTarget as HTMLElement).style.borderColor = ''
            }}
          >
            {/* Subtle ambient glow */}
            <div
              className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-10"
              style={{ background: m.color }}
            />

            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-[11px] font-mono text-[var(--text-dim)] uppercase tracking-wider">
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
                    <span className="text-sm text-[var(--text-dim)] font-mono mb-1">
                      /{m.total}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: m.bg, boxShadow: `0 0 12px ${m.ring}` }}
              >
                <Icon size={18} style={{ color: m.color }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function QuickActions() {
  const openEditor = useAgentsStore((state) => state.openEditor)
  const createMissionFromPrompt = useAgentsStore((state) => state.createMissionFromPrompt)
  const router = useRouter()

  const actions = [
    {
      label: 'Add Agent',
      sub: 'Bring a new agent online',
      icon: Bot,
      color: '#9b6dff',
      onClick: () => openEditor(null),
      hoverBg: 'rgba(155, 109, 255, 0.1)',
      hoverBorder: 'rgba(155, 109, 255, 0.3)',
    },
    {
      label: 'Virtual Office',
      sub: 'See the team in action',
      icon: Building2,
      color: '#00d4aa',
      onClick: () => router.push('/office'),
      hoverBg: 'rgba(0, 212, 170, 0.1)',
      hoverBorder: 'rgba(0, 212, 170, 0.3)',
    },
    {
      label: 'New Mission',
      sub: 'Create a task from scratch',
      icon: Target,
      color: '#ff7c42',
      onClick: () => createMissionFromPrompt('Draft a new client-ready mission from dashboard quick actions'),
      hoverBg: 'rgba(255, 124, 66, 0.1)',
      hoverBorder: 'rgba(255, 124, 66, 0.3)',
    },
  ]

  return (
    <div className="card-surface p-5">
      <h3 className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-wider mb-4">
        Quick Actions
      </h3>
      <div className="flex flex-col gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border)] hover:border transition-all text-left"
              style={{
                '--hover-bg': action.hoverBg,
                '--hover-border': action.hoverBorder,
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = action.hoverBg
                e.currentTarget.style.borderColor = action.hoverBorder
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = ''
                e.currentTarget.style.borderColor = ''
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: action.hoverBg }}
              >
                <Icon size={16} style={{ color: action.color }} />
              </div>
              <div>
                <span className="text-sm font-medium text-[var(--text-primary)] block group-hover:text-white transition-colors">
                  {action.label}
                </span>
                <span className="text-[11px] text-[var(--text-dim)]">{action.sub}</span>
              </div>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AgentStrip() {
  const agents = useAgentsStore((state) => state.agents)
  const openEditor = useAgentsStore((state) => state.openEditor)
  const router = useRouter()
  const active = agents.filter((a) => a.status === 'active')
  const idle = agents.filter((a) => a.status === 'idle')

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-wider">
            Active Team
          </h3>
          <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
            {active.length} active · {idle.length} idle
          </p>
        </div>
        <button
          onClick={() => router.push('/agents')}
          className="text-[11px] font-mono text-[var(--accent-blue)] hover:underline"
        >
          View all →
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {active.slice(0, 6).map((agent) => (
          <button
            key={agent.id}
            onClick={() => openEditor(agent.id)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-glow)] hover-lift transition-all group"
          >
            <div className="relative">
              <AgentBot
                name={agent.name}
                avatar={agent.avatar}
                color={agent.color}
                status={agent.status}
                animation={agent.currentTask ? 'working' : 'idle'}
                size={44}
              />
              {/* Status indicator */}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-card)]"
                style={{
                  background: agent.status === 'active' ? '#00d4aa' : '#ffd166',
                  boxShadow: agent.status === 'active' ? '0 0 6px #00d4aa' : 'none',
                }}
              />
            </div>
            <div className="text-center w-full">
              <p className="text-[11px] font-mono font-medium text-[var(--text-primary)] truncate w-full">
                {agent.name}
              </p>
              <p className="text-[9px] text-[var(--text-dim)] truncate w-full mt-0.5">
                {agent.role.split(' ')[0]}
              </p>
            </div>
          </button>
        ))}

        {active.length === 0 && idle.length === 0 && (
          <div className="col-span-full text-center py-8">
            <div className="text-4xl mb-2">🤖</div>
            <p className="text-sm text-[var(--text-dim)]">No agents yet</p>
          </div>
        )}

        {active.length === 0 && idle.length > 0 && (
          <>
            {idle.slice(0, 6).map((agent) => (
              <button
                key={agent.id}
                onClick={() => openEditor(agent.id)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-glow)] hover-lift transition-all group opacity-60"
              >
                <AgentBot
                  name={agent.name}
                  avatar={agent.avatar}
                  color={agent.color}
                  status={agent.status}
                  animation="idle"
                  size={44}
                />
                <div className="text-center w-full">
                  <p className="text-[11px] font-mono font-medium text-[var(--text-primary)] truncate w-full">
                    {agent.name}
                  </p>
                  <p className="text-[9px] text-[var(--text-dim)] truncate w-full mt-0.5">idle</p>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
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
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-wider">
          Mission Queue
        </h3>
        <span className="text-[11px] font-mono text-[var(--text-dim)]">
          {missions.filter((m) => !['completed', 'cancelled'].includes(m.status)).length} active
        </span>
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
              className="w-full text-left p-3 rounded-xl border border-[var(--border)] hover:border-[var(--border-glow)] transition-all cursor-pointer group"
              style={{
                background: activeMissionId === mission.id ? 'var(--bg-elevated)' : '',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-white transition-colors truncate">
                    {mission.title}
                  </p>
                  <p className="text-[11px] text-[var(--text-dim)] mt-1">
                    {client?.name || 'General ops'} ·{' '}
                    <span style={{ color: statusColor[mission.status] }}>
                      {mission.status.replace('_', ' ')}
                    </span>
                  </p>
                </div>
                <span
                  className="badge flex-shrink-0 mt-0.5"
                  style={{
                    background: statusColor[mission.status] + '20',
                    color: statusColor[mission.status],
                  }}
                >
                  {mission.progress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-base)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${mission.progress}%`,
                    background: statusColor[mission.status],
                  }}
                />
              </div>

              {/* Action buttons */}
              <div
                className="mt-3 flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() =>
                    updateMission(mission.id, {
                      status: mission.status === 'paused' ? 'in_progress' : 'paused',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glow)] transition-all"
                >
                  {mission.status === 'paused' ? '↗' : '⏸'}
                </button>
                <button
                  onClick={() =>
                    updateMission(mission.id, { status: 'completed', progress: 100 })
                  }
                  className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glow)] transition-all"
                >
                  ✓
                </button>
                <button
                  onClick={() =>
                    updateMission(mission.id, { status: 'cancelled', progress: 0 })
                  }
                  className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--accent-pink)] hover:border-[rgba(255,95,160,0.3)] transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}

        {missions.length === 0 && (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">🚀</div>
            <p className="text-xs text-[var(--text-dim)]">No missions tracked yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
