'use client'

import React, { useEffect, useState } from 'react'
import { Pause, Play, Trash2, Copy, ChevronRight, Sparkles, ShieldCheck, BriefcaseBusiness } from 'lucide-react'

import { Agent } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { AgentBot } from './AgentBot'
import { DELIVERABLE_LABELS, DIVISION_LABELS, SPECIALTY_LABELS, formatTimestamp } from '@/lib/bot-animations'
import { useAgentsStore } from '@/lib/agents-store'
import { getModelLabel, getProviderLabel } from '@/lib/providers'

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#00d4aa' },
  idle: { label: 'Idle', color: '#ffd166' },
  paused: { label: 'Paused', color: '#555b73' },
}

interface AgentCardProps {
  agent: Agent
  onEdit?: () => void
}

export function AgentCard({ agent, onEdit }: AgentCardProps) {
  const cloneAgent = useAgentsStore((state) => state.cloneAgent)
  const deleteAgent = useAgentsStore((state) => state.deleteAgent)
  const updateAgentStatus = useAgentsStore((state) => state.updateAgentStatus)
  const missions = useAgentsStore((state) => state.missions)
  const statusCfg = STATUS_CONFIG[agent.status]
  const skills = Array.isArray(agent.skills) ? agent.skills : []
  const primaryOutputs = Array.isArray(agent.primaryOutputs) ? agent.primaryOutputs : []
  const completedTasksCount = missions.filter((mission) => {
    if (mission.status !== 'completed') return false
    const assignedAgentIds = Array.isArray(mission.assignedAgentIds) ? mission.assignedAgentIds : []
    return mission.leadAgentId === agent.id || assignedAgentIds.includes(agent.id)
  }).length

  const [timeAgo, setTimeAgo] = useState('')

  useEffect(() => {
    if (agent.lastActive) {
      setTimeAgo(formatTimestamp(agent.lastActive))
    }
  }, [agent.lastActive])

  const workload = agent.workload || 0
  const primaryOutputLabel = primaryOutputs[0] ? DELIVERABLE_LABELS[primaryOutputs[0]] || primaryOutputs[0] : 'General ops'
  const modelLabel =
    agent.model && agent.provider ? `${getProviderLabel(agent.provider)} · ${getModelLabel(agent.model)}` : 'Agency default'
  const surfaceTone = 'color-mix(in srgb, var(--bg-card) 94%, white 6%)'
  const elevatedTone = 'color-mix(in srgb, var(--bg-elevated) 88%, transparent)'
  const subtleTone = 'color-mix(in srgb, var(--bg-card) 78%, transparent)'
  const readableTone = 'color-mix(in srgb, var(--text-primary) 88%, transparent)'
  const secondaryTone = 'color-mix(in srgb, var(--text-secondary) 86%, transparent)'
  const dimTone = 'color-mix(in srgb, var(--text-secondary) 58%, transparent)'

  return (
    <article
      className="group relative overflow-hidden rounded-[28px] p-[1px] transition-all duration-200 hover:-translate-y-1"
      onClick={onEdit}
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, ${agent.color} 28%, var(--border) 72%) 0%, color-mix(in srgb, ${agent.color} 12%, var(--border) 88%) 100%)`,
        boxShadow: '0 22px 40px rgba(15,23,42,0.12)',
      }}
    >
      <div
        className="relative h-full rounded-[27px] p-5"
        style={{
          background: `radial-gradient(circle at top, color-mix(in srgb, ${agent.color} 14%, transparent), transparent 34%), linear-gradient(180deg, ${surfaceTone} 0%, color-mix(in srgb, var(--bg-panel) 92%, transparent) 100%)`,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-28 opacity-90"
          style={{
            background: `radial-gradient(circle at top right, color-mix(in srgb, ${agent.color} 34%, transparent), transparent 54%)`,
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--bg-panel) 18%, transparent))' }} />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-[0.14em]"
              style={{
                border: '1px solid color-mix(in srgb, var(--border) 80%, white 20%)',
                background: subtleTone,
                color: readableTone,
              }}
            >
              <Sparkles size={11} style={{ color: agent.color }} />
              Agent Profile
            </div>
            <div
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em]"
              style={{
                color: statusCfg.color,
                borderColor: `${statusCfg.color}40`,
                background: `color-mix(in srgb, ${statusCfg.color} 12%, transparent)`,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusCfg.color }} />
              {statusCfg.label}
            </div>
          </div>

          <div className="mt-4 flex items-start gap-4">
            <div
              className="rounded-[24px] p-3"
              style={{
                border: '1px solid color-mix(in srgb, var(--border) 78%, white 22%)',
                background: elevatedTone,
                boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 12%, transparent)',
              }}
            >
              <AgentBot
                name={agent.name}
                avatar={agent.avatar}
                color={agent.color}
                photoUrl={agent.photoUrl}
                status={agent.status}
                animation={agent.status === 'active' && agent.currentTask ? 'working' : 'idle'}
                size={64}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-heading font-bold text-text-primary">{agent.name}</h3>
                  <p className="truncate text-sm mt-0.5" style={{ color: secondaryTone }}>{agent.role}</p>
                </div>

                <div
                  className="rounded-[18px] px-3 py-2 text-right"
                  style={{
                    border: '1px solid color-mix(in srgb, var(--border) 78%, white 22%)',
                    background: elevatedTone,
                    boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 10%, transparent)',
                  }}
                >
                  <p className="text-[9px] font-mono uppercase tracking-[0.14em]" style={{ color: dimTone }}>Completed</p>
                  <p className="mt-1 text-xl font-heading font-black leading-none text-text-primary">{completedTasksCount}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge color={agent.color} size="sm">
                  {DIVISION_LABELS[agent.division] || agent.division}
                </Badge>
                <Badge color={agent.color} size="sm">
                  {SPECIALTY_LABELS[agent.specialty] || agent.specialty}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div
              className="rounded-[18px] px-3 py-2.5"
              style={{
                border: '1px solid color-mix(in srgb, var(--border) 78%, white 22%)',
                background: elevatedTone,
              }}
            >
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: dimTone }}>
                <ShieldCheck size={11} />
                Output
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug text-text-primary">{primaryOutputLabel}</p>
            </div>

            <div
              className="rounded-[18px] px-3 py-2.5"
              style={{
                border: '1px solid color-mix(in srgb, var(--border) 78%, white 22%)',
                background: elevatedTone,
              }}
            >
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: dimTone }}>
                <BriefcaseBusiness size={11} />
                Runtime
              </div>
              <p className="mt-1.5 text-xs font-semibold leading-snug text-text-primary">{modelLabel}</p>
            </div>

            <div
              className="rounded-[18px] px-3 py-2.5"
              style={{
                border: '1px solid color-mix(in srgb, var(--border) 78%, white 22%)',
                background: elevatedTone,
              }}
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: dimTone }}>Workload</p>
              <p className="mt-1.5 text-xs font-semibold text-text-primary">{workload}% utilization</p>
              <div className="mt-2 h-1.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--border) 65%, transparent)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(10, workload || (agent.status === 'active' ? 52 : 18)))}%`,
                    background: `linear-gradient(90deg, ${agent.color}, rgba(255,255,255,0.95))`,
                  }}
                />
              </div>
            </div>
          </div>

          {agent.currentTask ? (
            <div
              className="mt-4 rounded-[20px] px-4 py-3"
              style={{
                border: '1px solid color-mix(in srgb, var(--border) 78%, white 22%)',
                background: 'color-mix(in srgb, var(--bg-panel) 16%, transparent)',
              }}
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: dimTone }}>Current Mission</p>
              <p className="mt-1.5 text-sm leading-relaxed line-clamp-2 text-text-primary">{agent.currentTask}</p>
            </div>
          ) : null}

          {skills.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.08em]"
                  style={{
                    border: '1px solid color-mix(in srgb, var(--border) 78%, white 22%)',
                    background: subtleTone,
                    color: secondaryTone,
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4" onClick={(event) => event.stopPropagation()}>
            <button
              onClick={() => updateAgentStatus(agent.id, agent.status === 'active' ? 'idle' : 'active')}
              className="inline-flex min-w-[110px] items-center justify-center gap-2 rounded-[16px] px-3 py-2 text-[12px] font-semibold transition-all"
              style={{
                border: '1px solid color-mix(in srgb, var(--border) 74%, white 26%)',
                background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 92%, white 8%), color-mix(in srgb, var(--bg-card) 92%, transparent))',
                color: readableTone,
              }}
            >
              {agent.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
              {agent.status === 'active' ? 'Pause' : 'Activate'}
            </button>

            <button
              onClick={() => cloneAgent(agent.id)}
              className="inline-flex min-w-[92px] items-center justify-center gap-2 rounded-[16px] px-3 py-2 text-[12px] font-semibold transition-all"
              style={{
                border: '1px solid color-mix(in srgb, var(--border) 74%, white 26%)',
                background: subtleTone,
                color: secondaryTone,
              }}
            >
              <Copy size={13} />
              Clone
            </button>

            <button
              onClick={() => {
                if (confirm(`Remove ${agent.name} from the agency?`)) deleteAgent(agent.id)
              }}
              className="inline-flex min-w-[98px] items-center justify-center gap-2 rounded-[16px] px-3 py-2 text-[12px] font-semibold transition-all ml-auto"
              style={{
                border: '1px solid color-mix(in srgb, #ef4444 32%, transparent)',
                background: 'color-mix(in srgb, #ef4444 10%, transparent)',
                color: 'color-mix(in srgb, #ef4444 78%, var(--text-primary) 22%)',
              }}
            >
              <Trash2 size={13} />
              Remove
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              {agent.lastActive ? (
                <p className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: dimTone }}>
                  Last active {timeAgo || '...'}
                </p>
              ) : (
                <p className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: dimTone }}>No recent activity</p>
              )}
              {primaryOutputs.length > 0 ? (
                <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.08em]" style={{ color: dimTone }}>
                  {primaryOutputs.slice(0, 2).map((item) => DELIVERABLE_LABELS[item] || item).join(' · ')}
                </p>
              ) : null}
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: secondaryTone }}>
              Open profile
              <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
