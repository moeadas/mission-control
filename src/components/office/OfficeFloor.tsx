'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useAgentsStore } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { Card } from '@/components/ui/Card'
import { X, MapPin, Zap, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { OFFICE_ROOMS } from '@/lib/agent-templates'
import { DIVISION_LABELS, formatTimestamp } from '@/lib/bot-animations'
import { getModelLabel, getProviderLabel } from '@/lib/providers'
import { Agent } from '@/lib/types'
import { clsx } from 'clsx'

const FLOOR_W = 960
const FLOOR_H = 520

// Zone room definitions with more character
const ZONES = [
  {
    id: 'mission-control',
    name: 'Mission Control',
    color: '#9b6dff',
    x: 360, y: 20, w: 240, h: 120,
    icon: '🎯',
    desc: 'Orchestration hub — Iris commands from here',
  },
  {
    id: 'client-services',
    name: 'Client Suite',
    color: '#4f8ef7',
    x: 40, y: 170, w: 260, h: 180,
    icon: '👔',
    desc: 'Client relationships and briefing',
  },
  {
    id: 'creative',
    name: 'Creative Lab',
    color: '#00d4aa',
    x: 340, y: 170, w: 280, h: 180,
    icon: '🎨',
    desc: 'Design, copy, and visual production',
  },
  {
    id: 'media',
    name: 'Media Room',
    color: '#ff5fa0',
    x: 660, y: 170, w: 260, h: 180,
    icon: '📊',
    desc: 'Media planning and performance',
  },
  {
    id: 'research',
    name: 'Research Hub',
    color: '#38bdf8',
    x: 200, y: 390, w: 560, h: 110,
    icon: '🔬',
    desc: 'Insights, SEO, and competitive intelligence',
  },
]

function FloatingParticle({ color }: { color: string }) {
  return (
    <div
      className="absolute w-1.5 h-1.5 rounded-full opacity-40 float"
      style={{
        background: color,
        boxShadow: `0 0 6px ${color}`,
        animationDuration: `${3 + Math.random() * 4}s`,
        animationDelay: `${Math.random() * 3}s`,
      }}
    />
  )
}

function AgentAvatar({
  agent,
  isSelected,
  onClick,
  index,
  total,
  zoneCenter,
  zoneMaxY,
}: {
  agent: Agent
  isSelected: boolean
  onClick: () => void
  index: number
  total: number
  zoneCenter: { x: number; y: number }
  zoneMaxY: number
}) {
  const [pulse, setPulse] = useState(false)
  const [bounce, setBounce] = useState(false)

  useEffect(() => {
    const interval1 = setInterval(() => setPulse((p) => !p), 2000)
    const interval2 = setInterval(() => setBounce((b) => !b), 1500 + Math.random() * 1000)
    return () => { clearInterval(interval1); clearInterval(interval2) }
  }, [])

  const spacing = 50
  const totalWidth = total * spacing
  const startX = zoneCenter.x - totalWidth / 2 + spacing / 2
  const botX = startX + index * spacing
  const botY = Math.max(zoneCenter.y, zoneCenter.y - 10)
  const safeY = Math.min(botY, zoneMaxY - 56)

  const statusColor =
    agent.status === 'active' ? '#00d4aa' :
    agent.status === 'paused' ? '#ffd166' : '#555b73'

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={botX + 20}
          cy={safeY + 20}
          r={32}
          fill="none"
          stroke={agent.color}
          strokeWidth={1.5}
          opacity={pulse ? 0.3 : 0.8}
          style={{ transition: 'opacity 1s' }}
        />
      )}

      {/* Ambient glow for active agents */}
      {agent.status === 'active' && (
        <circle
          cx={botX + 20}
          cy={safeY + 20}
          r={28}
          fill={agent.color}
          opacity={0.05}
          style={{ filter: 'blur(8px)' }}
        />
      )}

      {/* Bot container */}
      <foreignObject x={botX} y={safeY} width={42} height={46}>
        <div style={{ width: 42, height: 46 }}>
          <AgentBot
            name={agent.name}
            avatar={agent.avatar}
            color={agent.color}
            status={agent.status}
            animation={
              agent.status === 'active' && agent.currentTask ? 'working' :
              agent.status === 'idle' ? 'idle' :
              agent.status === 'paused' ? 'resting' : 'idle'
            }
            size={40}
          />
        </div>
      </foreignObject>

      {/* Name tag */}
      <text
        x={botX + 20}
        y={safeY + 56}
        textAnchor="middle"
        fill={isSelected ? agent.color : '#6b7280'}
        fontSize={9}
        fontFamily="monospace"
        fontWeight={600}
      >
        {agent.name}
      </text>

      {/* Status dot */}
      <circle
        cx={botX + 36}
        cy={safeY + 4}
        r={4}
        fill={statusColor}
        style={{
          filter: agent.status === 'active' ? `drop-shadow(0 0 4px ${statusColor})` : 'none',
        }}
      />

      {/* Bounce indicator for active agents */}
      {agent.status === 'active' && bounce && (
        <text
          x={botX + 20}
          y={safeY - 6}
          textAnchor="middle"
          fill={agent.color}
          fontSize={8}
          opacity={0.6}
        >
          ✦
        </text>
      )}
    </g>
  )
}

function ZonePanel({
  zone,
  agents,
  selectedAgent,
  onSelectAgent,
  onClose,
}: {
  zone: (typeof ZONES)[0]
  agents: Agent[]
  selectedAgent: Agent | null
  onSelectAgent: (id: string | null) => void
  onClose: () => void
}) {
  const missions = useAgentsStore((state) => state.missions)
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="absolute w-72 slide-in-up"
      style={{
        top: 16,
        right: 16,
        zIndex: 20,
      }}
    >
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--bg-panel)',
          borderColor: zone.color + '40',
          boxShadow: `0 0 0 1px ${zone.color}20, 0 8px 32px rgba(0,0,0,0.5), 0 0 40px ${zone.color}15`,
        }}
      >
        {/* Zone header */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ background: zone.color + '15', borderBottom: `1px solid ${zone.color}30` }}
        >
          <span className="text-xl">{zone.icon}</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">{zone.name}</h4>
            <p className="text-[10px] text-[var(--text-dim)] font-mono">{zone.desc}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-dim)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Agent count */}
        <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: agents.length > 0 ? '#00d4aa' : '#555b73',
                boxShadow: agents.length > 0 ? '0 0 6px #00d4aa' : 'none',
              }}
            />
            <span className="text-[11px] font-mono text-[var(--text-secondary)]">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} in this zone
            </span>
          </div>
        </div>

        {/* Agent list */}
        <div className="max-h-64 overflow-y-auto">
          {agents.map((agent) => {
            const agentMissions = missions.filter((m) => m.assignedAgentIds.includes(agent.id))
            const isSelected = selectedAgent?.id === agent.id
            return (
              <div
                key={agent.id}
                onClick={() => onSelectAgent(isSelected ? null : agent.id)}
                className={clsx(
                  'px-4 py-3 border-b border-[var(--border-subtle)] cursor-pointer transition-all',
                  isSelected ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-elevated)]/50'
                )}
                style={isSelected ? { borderLeft: `2px solid ${agent.color}` } : {}}
              >
                <div className="flex items-center gap-3">
                  <AgentBot
                    name={agent.name}
                    avatar={agent.avatar}
                    color={agent.color}
                    status={agent.status}
                    animation={agent.status === 'active' && agent.currentTask ? 'working' : 'idle'}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text-primary)]">{agent.name}</p>
                    <p className="text-[10px] text-[var(--text-dim)] truncate">{agent.role}</p>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: agent.status === 'active' ? '#00d4aa' : agent.status === 'paused' ? '#ffd166' : '#555b73',
                      boxShadow: agent.status === 'active' ? '0 0 6px #00d4aa' : 'none',
                    }}
                  />
                </div>

                {/* Expanded details */}
                {isSelected && (
                  <div className="mt-3 space-y-2">
                    {agent.bio && (
                      <p className="text-[11px] text-[var(--text-secondary)] italic">"{agent.bio}"</p>
                    )}
                    {agent.currentTask && (
                      <div className="p-2 rounded-lg bg-[var(--bg-base)]">
                        <p className="text-[9px] font-mono text-[var(--text-dim)] uppercase mb-1">Current task</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">{agent.currentTask}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--text-dim)]">
                      <span>{agentMissions.length} mission{agentMissions.length !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{agent.workload || 0}% workload</span>
                      <span>·</span>
                      <span>{getProviderLabel(agent.provider)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {agents.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[var(--text-dim)]">No agents in this zone</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function OfficeFloor() {
  const agents = useAgentsStore((state) => state.agents)
  const missions = useAgentsStore((state) => state.missions)
  const selectedAgentId = useAgentsStore((state) => state.selectedAgentId)
  const selectAgent = useAgentsStore((state) => state.selectAgent)
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [pulseTime, setPulseTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setPulseTime((t) => t + 1), 100)
    return () => clearInterval(interval)
  }, [])

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null

  const agentsByZone = useMemo(
    () =>
      agents.reduce<Record<string, Agent[]>>((acc, agent) => {
        const zoneId = agent.position.room
        acc[zoneId] = [...(acc[zoneId] || []), agent]
        return acc
      }, {}),
    [agents]
  )

  const activeCount = agents.filter((a) => a.status === 'active').length
  const idleCount = agents.filter((a) => a.status === 'idle').length

  const hoveredZoneData = hoveredZone
    ? ZONES.find((z) => z.id === hoveredZone)
    : null

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #0d1020 0%, #111827 50%, #0d1020 100%)',
        border: '1px solid var(--border)',
        minHeight: 540,
      }}
    >
      {/* Ambient background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(155, 109, 255, 0.08) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(0, 212, 170, 0.06) 0%, transparent 40%)`,
        }}
      />

      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(56, 59, 83, 0.8) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <FloatingParticle
            key={i}
            color={ZONES[i % ZONES.length].color}
          />
        ))}
      </div>

      {/* Floor plan SVG */}
      <svg
        viewBox={`0 0 ${FLOOR_W} ${FLOOR_H}`}
        className="relative w-full h-auto"
        style={{ display: 'block', minHeight: 540 }}
      >
        {/* Floor label */}
        <text x={16} y={24} fill="#3d4459" fontSize={10} fontFamily="monospace" letterSpacing={2}>
          AGENCY HQ — FLOOR PLAN
        </text>

        {/* Connection lines */}
        <path d="M 480 140 Q 200 140 170 260" stroke="#2a2f3d" strokeWidth={1.5} strokeDasharray="6 4" fill="none" opacity={0.6} />
        <path d="M 480 140 Q 600 140 760 260" stroke="#2a2f3d" strokeWidth={1.5} strokeDasharray="6 4" fill="none" opacity={0.6} />
        <path d="M 480 140 L 480 390" stroke="#2a2f3d" strokeWidth={1.5} strokeDasharray="6 4" fill="none" opacity={0.6} />

        {/* Zones */}
        {ZONES.map((zone) => {
          const zoneAgents = agentsByZone[zone.id] || []
          const isHovered = hoveredZone === zone.id
          const pulse = Math.sin(pulseTime * 0.05 + ZONES.indexOf(zone) * 0.8) > 0.7

          return (
            <g key={zone.id}>
              {/* Zone glow */}
              {isHovered && (
                <rect
                  x={zone.x - 4}
                  y={zone.y - 4}
                  width={zone.w + 8}
                  height={zone.h + 8}
                  rx={14}
                  fill="none"
                  stroke={zone.color}
                  strokeWidth={2}
                  opacity={0.3}
                  style={{ filter: `blur(4px)` }}
                />
              )}

              {/* Zone fill */}
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                rx={12}
                fill={`${zone.color}08`}
                stroke={zone.color}
                strokeWidth={isHovered ? 2 : 1}
                strokeOpacity={isHovered ? 0.8 : 0.4}
                style={{ transition: 'all 0.3s ease' }}
              />

              {/* Ambient pulse for active zones */}
              {zoneAgents.some((a) => a.status === 'active') && pulse && (
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.w}
                  height={zone.h}
                  rx={12}
                  fill={zone.color}
                  opacity={0.03}
                />
              )}

              {/* Corner decoration */}
              <circle cx={zone.x + 10} cy={zone.y + 10} r={3} fill={zone.color} opacity={0.7} />
              <circle cx={zone.x + zone.w - 10} cy={zone.y + 10} r={2} fill={zone.color} opacity={0.4} />

              {/* Zone icon + name */}
              <text
                x={zone.x + 16}
                y={zone.y + 22}
                fontSize={14}
                style={{ pointerEvents: 'none' }}
              >
                {zone.icon}
              </text>
              <text
                x={zone.x + 38}
                y={zone.y + 20}
                fill={zone.color}
                fontSize={10}
                fontFamily="sans-serif"
                fontWeight={600}
                style={{ pointerEvents: 'none' }}
              >
                {zone.name.toUpperCase()}
              </text>

              {/* Agent count badge */}
              {zoneAgents.length > 0 && (
                <g transform={`translate(${zone.x + zone.w - 28}, ${zone.y + 8})`}>
                  <rect
                    x={0} y={0} width={24} height={16}
                    rx={8}
                    fill={zone.color + '30'}
                  />
                  <text
                    x={12} y={12}
                    textAnchor="middle"
                    fill={zone.color}
                    fontSize={9}
                    fontFamily="monospace"
                    fontWeight={600}
                  >
                    {zoneAgents.length}
                  </text>
                </g>
              )}

              {/* Invisible hover target */}
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                rx={12}
                fill="transparent"
                stroke="transparent"
                strokeWidth={0}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                onClick={() => setHoveredZone(hoveredZone === zone.id ? null : zone.id)}
              />
            </g>
          )
        })}

        {/* Agents */}
        {agents.map((agent) => {
          const zone = ZONES.find((z) => z.id === agent.position.room)
          const isSelected = agent.id === selectedAgentId
          const zoneAgents = agentsByZone[agent.position.room] || []
          const idxInZone = zoneAgents.indexOf(agent)
          const countInZone = zoneAgents.length

          if (!zone) return null

          const anchor = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 + 4 }
          const spacing = 50
          const totalWidth = countInZone * spacing
          const startX = anchor.x - totalWidth / 2 + spacing / 2
          const botX = startX + idxInZone * spacing
          const botY = anchor.y + 10
          const safeY = Math.min(botY, zone.y + zone.h - 60)

          return (
            <g
              key={agent.id}
              style={{ cursor: 'pointer' }}
              onClick={() => selectAgent(isSelected ? null : agent.id)}
              onMouseEnter={() => setHoveredZone(agent.position.room)}
              onMouseLeave={() => setHoveredZone(null)}
            >
              {isSelected && (
                <circle
                  cx={botX + 20}
                  cy={safeY + 20}
                  r={32}
                  fill="none"
                  stroke={agent.color}
                  strokeWidth={1.5}
                  opacity={0.8}
                />
              )}
              <foreignObject x={botX} y={safeY} width={42} height={46}>
                <div style={{ width: 42, height: 46 }}>
                  <AgentBot
                    name={agent.name}
                    avatar={agent.avatar}
                    color={agent.color}
                    status={agent.status}
                    animation={
                      agent.status === 'active' && agent.currentTask ? 'working' :
                      agent.status === 'idle' ? 'idle' :
                      agent.status === 'paused' ? 'resting' : 'idle'
                    }
                    size={40}
                  />
                </div>
              </foreignObject>
              <text
                x={botX + 20}
                y={safeY + 56}
                textAnchor="middle"
                fill={isSelected ? agent.color : '#6b7280'}
                fontSize={9}
                fontFamily="monospace"
                fontWeight={600}
              >
                {agent.name}
              </text>
            </g>
          )
        })}

        {/* Legend */}
        <g transform="translate(16, 480)">
          <circle cx={6} cy={6} r={4} fill="#00d4aa">
            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x={16} y={9} fill="#6b7280" fontSize={8} fontFamily="monospace">{activeCount} active</text>
          <circle cx={76} cy={6} r={4} fill="#ffd166" opacity={0.7} />
          <text x={86} y={9} fill="#6b7280" fontSize={8} fontFamily="monospace">{idleCount} idle</text>
          <text x={136} y={9} fill="#3d4459" fontSize={8} fontFamily="monospace">{agents.length} total · Click zones to explore</text>
        </g>
      </svg>

      {/* Zone info panel on hover */}
      {hoveredZoneData && !selectedAgent && (
        <div
          className="absolute slide-in-down"
          style={{
            bottom: 64,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
          }}
        >
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-full"
            style={{
              background: 'var(--bg-panel)',
              border: `1px solid ${hoveredZoneData.color}40`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 20px ${hoveredZoneData.color}20`,
            }}
          >
            <span className="text-base">{hoveredZoneData.icon}</span>
            <div>
              <p className="text-xs font-semibold" style={{ color: hoveredZoneData.color }}>
                {hoveredZoneData.name}
              </p>
              <p className="text-[10px] text-[var(--text-dim)]">
                {(agentsByZone[hoveredZoneData.id] || []).length} agent
                {(agentsByZone[hoveredZoneData.id] || []).length !== 1 ? 's' : ''} · Click to explore
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected agent panel */}
      {selectedAgent && (
        <ZonePanel
          zone={ZONES.find((z) => z.id === selectedAgent.position.room) || ZONES[0]}
          agents={agentsByZone[selectedAgent.position.room] || []}
          selectedAgent={selectedAgent}
          onSelectAgent={(id) => selectAgent(id)}
          onClose={() => selectAgent(null)}
        />
      )}
    </div>
  )
}
