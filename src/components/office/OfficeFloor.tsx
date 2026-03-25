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
const FLOOR_H = 560

// Enhanced zone room definitions with game-like styling
const ZONES = [
  {
    id: 'mission-control',
    name: 'Mission Control',
    color: '#9b6dff',
    x: 360, y: 20, w: 240, h: 130,
    icon: '🎯',
    desc: 'Orchestration hub — Iris commands from here',
  },
  {
    id: 'client-services',
    name: 'Client Suite',
    color: '#4f8ef7',
    x: 40, y: 180, w: 260, h: 180,
    icon: '👔',
    desc: 'Client relationships and briefing',
  },
  {
    id: 'creative',
    name: 'Creative Lab',
    color: '#00d4aa',
    x: 340, y: 180, w: 280, h: 180,
    icon: '🎨',
    desc: 'Design, copy, and visual production',
  },
  {
    id: 'media',
    name: 'Media Room',
    color: '#ff5fa0',
    x: 660, y: 180, w: 260, h: 180,
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

// Floating particle component
function FloatingParticle({ color, index }: { color: string; index: number }) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)
  
  useEffect(() => {
    // Random initial position
    setPosition({
      x: Math.random() * 100,
      y: Math.random() * 100,
    })
    
    // Animate opacity
    const opacityTimer = setTimeout(() => setOpacity(0.4 + Math.random() * 0.3), index * 100)
    
    return () => clearTimeout(opacityTimer)
  }, [index])

  const duration = 4 + Math.random() * 4
  const delay = Math.random() * 3

  return (
    <div
      className="absolute rounded-full"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: 2 + Math.random() * 2,
        height: 2 + Math.random() * 2,
        background: color,
        boxShadow: `0 0 ${4 + Math.random() * 4}px ${color}`,
        opacity,
        animation: `float-particle ${duration}s ease-in-out ${delay}s infinite`,
      }}
    />
  )
}

// Animated grid line
function GridOverlay() {
  return (
    <div 
      className="absolute inset-0 opacity-[0.03] pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    />
  )
}

// Zone glow effect
function ZoneGlow({ color, intensity = 0.08 }: { color: string; intensity?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
      }}
    />
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
      className="absolute w-80 slide-in-up z-20"
      style={{
        top: 16,
        right: 16,
      }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-panel)',
          border: `1px solid ${zone.color}40`,
          boxShadow: `0 0 0 1px ${zone.color}15, 0 8px 40px rgba(0,0,0,0.6), 0 0 60px ${zone.color}20`,
        }}
      >
        {/* Zone header */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ background: `${zone.color}12`, borderBottom: `1px solid ${zone.color}25` }}
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
                boxShadow: agents.length > 0 ? '0 0 8px #00d4aa' : 'none',
              }}
            />
            <span className="text-[11px] font-mono text-[var(--text-secondary)]">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} in this zone
            </span>
          </div>
        </div>

        {/* Agent list */}
        <div className="max-h-72 overflow-y-auto">
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
                style={isSelected ? { borderLeft: `3px solid ${agent.color}` } : {}}
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
                      <div className="p-2 rounded-lg" style={{ background: 'var(--bg-base)' }}>
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
  const [time, setTime] = useState(new Date())

  // Animation frame for smooth updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseTime((t) => t + 1)
      setTime(new Date())
    }, 100)
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
        background: 'linear-gradient(145deg, #080a12 0%, #0d1020 40%, #0a0d18 100%)',
        border: '1px solid var(--border)',
        minHeight: 580,
      }}
    >
      {/* CSS for floating particles */}
      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(10px, -15px) scale(1.2); opacity: 0.5; }
          50% { transform: translate(-5px, -25px) scale(0.8); opacity: 0.4; }
          75% { transform: translate(15px, -10px) scale(1.1); opacity: 0.6; }
        }
        @keyframes zone-pulse {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.08; }
        }
        @keyframes bot-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .bot-float { animation: bot-float 2s ease-in-out infinite; }
      `}</style>

      {/* Grid overlay */}
      <GridOverlay />

      {/* Ambient background gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 20% 30%, rgba(155, 109, 255, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 50% 35% at 75% 60%, rgba(0, 212, 170, 0.05) 0%, transparent 45%),
            radial-gradient(ellipse 40% 30% at 50% 80%, rgba(56, 189, 248, 0.04) 0%, transparent 40%)
          `,
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 25 }).map((_, i) => (
          <FloatingParticle
            key={i}
            color={ZONES[i % ZONES.length].color}
            index={i}
          />
        ))}
      </div>

      {/* Floor plan SVG */}
      <svg
        viewBox={`0 0 ${FLOOR_W} ${FLOOR_H}`}
        className="relative w-full h-auto"
        style={{ display: 'block', minHeight: 580 }}
      >
        {/* Floor label and time */}
        <text x={16} y={24} fill="#4a5068" fontSize={9} fontFamily="monospace" letterSpacing={3}>
          AGENCY HQ — FLOOR 1
        </text>
        <text x={FLOOR_W - 16} y={24} fill="#4a5068" fontSize={9} fontFamily="monospace" textAnchor="end">
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </text>

        {/* Connection lines between zones */}
        <path d="M 480 135 Q 200 135 170 270" stroke="#2a2f3d" strokeWidth={1} strokeDasharray="4 6" fill="none" opacity={0.5} />
        <path d="M 480 135 Q 600 135 790 270" stroke="#2a2f3d" strokeWidth={1} strokeDasharray="4 6" fill="none" opacity={0.5} />
        <path d="M 480 135 L 480 390" stroke="#2a2f3d" strokeWidth={1} strokeDasharray="4 6" fill="none" opacity={0.5} />

        {/* Zones */}
        {ZONES.map((zone) => {
          const zoneAgents = agentsByZone[zone.id] || []
          const isHovered = hoveredZone === zone.id
          const hasActiveAgents = zoneAgents.some((a) => a.status === 'active')
          const pulseIntensity = Math.sin(pulseTime * 0.04 + ZONES.indexOf(zone) * 1.2) * 0.5 + 0.5

          return (
            <g key={zone.id}>
              {/* Zone ambient glow */}
              {hasActiveAgents && (
                <rect
                  x={zone.x - 2}
                  y={zone.y - 2}
                  width={zone.w + 4}
                  height={zone.h + 4}
                  rx={14}
                  fill={zone.color}
                  opacity={0.02 + pulseIntensity * 0.03}
                  style={{ filter: 'blur(12px)' }}
                />
              )}

              {/* Hover glow effect */}
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
                  opacity={0.6}
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
                fill={`${zone.color}06`}
                stroke={zone.color}
                strokeWidth={isHovered ? 1.5 : 0.8}
                strokeOpacity={isHovered ? 0.7 : 0.35}
                style={{ transition: 'all 0.3s ease' }}
              />

              {/* Zone header bar */}
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={32}
                rx={12}
                fill={`${zone.color}12`}
                style={{ clipPath: 'inset(0 0 70% 0 round 12px)' }}
              />

              {/* Corner decorations */}
              <circle cx={zone.x + 8} cy={zone.y + 8} r={3} fill={zone.color} opacity={0.8} />
              <circle cx={zone.x + zone.w - 8} cy={zone.y + 8} r={2} fill={zone.color} opacity={0.4} />
              <circle cx={zone.x + zone.w - 8} cy={zone.y + zone.h - 8} r={2} fill={zone.color} opacity={0.3} />

              {/* Zone icon */}
              <text
                x={zone.x + 14}
                y={zone.y + 22}
                fontSize={14}
                style={{ pointerEvents: 'none' }}
              >
                {zone.icon}
              </text>

              {/* Zone name */}
              <text
                x={zone.x + 36}
                y={zone.y + 20}
                fill={zone.color}
                fontSize={10}
                fontFamily="system-ui, sans-serif"
                fontWeight={600}
                style={{ pointerEvents: 'none' }}
              >
                {zone.name.toUpperCase()}
              </text>

              {/* Agent count badge */}
              {zoneAgents.length > 0 && (
                <g transform={`translate(${zone.x + zone.w - 32}, ${zone.y + 6})`}>
                  <rect
                    x={0} y={0} width={26} height={18}
                    rx={9}
                    fill={`${zone.color}25`}
                  />
                  <text
                    x={13} y={13}
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
              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={botX + 20}
                  cy={safeY + 20}
                  r={34}
                  fill="none"
                  stroke={agent.color}
                  strokeWidth={1.5}
                  opacity={0.7}
                />
              )}

              {/* Active agent glow */}
              {agent.status === 'active' && (
                <circle
                  cx={botX + 20}
                  cy={safeY + 20}
                  r={30}
                  fill={agent.color}
                  opacity={0.06}
                  style={{ filter: 'blur(8px)' }}
                />
              )}

              <g className="bot-float" style={{ animationDelay: `${idxInZone * 0.2}s` }}>
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
              </g>

              {/* Agent name */}
              <text
                x={botX + 20}
                y={safeY + 58}
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
        <g transform="translate(16, 510)">
          <circle cx={6} cy={6} r={4} fill="#00d4aa">
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x={16} y={9} fill="#6b7280" fontSize={8} fontFamily="monospace">{activeCount} active</text>
          
          <circle cx={76} cy={6} r={4} fill="#ffd166" opacity={0.6} />
          <text x={86} y={9} fill="#6b7280" fontSize={8} fontFamily="monospace">{idleCount} idle</text>
          
          <text x={136} y={9} fill="#4a5068" fontSize={8} fontFamily="monospace">
            {agents.length} total · Click zones to explore
          </text>
        </g>
      </svg>

      {/* Zone hover tooltip */}
      {hoveredZoneData && !selectedAgent && (
        <div
          className="absolute slide-in-down"
          style={{
            bottom: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 15,
          }}
        >
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-full"
            style={{
              background: 'var(--bg-panel)',
              border: `1px solid ${hoveredZoneData.color}40`,
              boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 30px ${hoveredZoneData.color}15`,
            }}
          >
            <span className="text-lg">{hoveredZoneData.icon}</span>
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
