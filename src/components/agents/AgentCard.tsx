'use client'

import React from 'react'
import { Pause, Play, Trash2, Copy } from 'lucide-react'
import { Agent } from '@/lib/types'
import { Card } from '@/components/ui/Card'
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
  const statusCfg = STATUS_CONFIG[agent.status]
  const skills = Array.isArray(agent.skills) ? agent.skills : []
  const primaryOutputs = Array.isArray(agent.primaryOutputs) ? agent.primaryOutputs : []

  return (
    <Card
      className="relative overflow-hidden group"
      hover
      onClick={onEdit}
    >
      {/* Subtle left border accent */}
      <div
        className="absolute top-3 bottom-3 left-0 w-0.5 rounded-full opacity-60"
        style={{ background: agent.color }}
      />

      <div className="flex items-start gap-4 pt-2">
        {/* Avatar */}
        <AgentBot
          name={agent.name}
          avatar={agent.avatar}
          color={agent.color}
          status={agent.status}
          animation={agent.status === 'active' && agent.currentTask ? 'working' : 'idle'}
          size={52}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-semibold text-text-primary">
              {agent.name}
            </h3>
            <div
              className="flex items-center gap-1 text-[10px] font-mono"
              style={{ color: statusCfg.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.color }} />
              {statusCfg.label}
            </div>
          </div>

          <p className="text-xs text-text-secondary mt-0.5">{agent.role}</p>

          <div className="flex items-center gap-2 mt-2">
            <Badge color={agent.color} size="sm">
              {DIVISION_LABELS[agent.division] || agent.division}
            </Badge>
            <Badge color={agent.color} size="sm">
              {SPECIALTY_LABELS[agent.specialty] || agent.specialty}
            </Badge>
            {agent.model && agent.provider && (
              <span className="text-[10px] font-mono text-text-dim">
                {getProviderLabel(agent.provider)} · {getModelLabel(agent.model)}
              </span>
            )}
          </div>

          {agent.currentTask && (
            <p className="text-[11px] text-text-secondary mt-2 italic truncate">
              → {agent.currentTask}
            </p>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div
        className="flex items-center gap-1 mt-4 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => updateAgentStatus(agent.id, agent.status === 'active' ? 'idle' : 'active')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-base border border-border hover:border-border-glow text-text-secondary hover:text-text-primary transition-all"
        >
          {agent.status === 'active' ? <Pause size={11} /> : <Play size={11} />}
          {agent.status === 'active' ? 'Pause' : 'Activate'}
        </button>
        <button
          onClick={() => cloneAgent(agent.id)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-base border border-border hover:border-border-glow text-text-secondary hover:text-text-primary transition-all"
        >
          <Copy size={11} /> Clone
        </button>
        <button
          onClick={() => {
            if (confirm(`Remove ${agent.name} from the agency?`)) deleteAgent(agent.id)
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all ml-auto"
        >
          <Trash2 size={11} /> Remove
        </button>
      </div>

      {/* Last active */}
      {agent.lastActive && (
        <p className="text-[10px] text-text-dim mt-2 font-mono">
          Last active {formatTimestamp(agent.lastActive)}
        </p>
      )}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {skills.slice(0, 3).map((skill) => (
            <span key={skill} className="px-2 py-1 rounded-full bg-base border border-border text-[10px] font-mono text-text-dim">
              {skill}
            </span>
          ))}
        </div>
      )}
      {primaryOutputs.length > 0 && (
        <p className="text-[10px] text-text-dim mt-2 font-mono">
          Outputs: {primaryOutputs.slice(0, 2).map((item) => DELIVERABLE_LABELS[item] || item).join(' · ')}
        </p>
      )}
    </Card>
  )
}
