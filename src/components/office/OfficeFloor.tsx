'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useAgentsStore } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { X, Users, Zap, Clock } from 'lucide-react'
import { Agent } from '@/lib/types'
import { clsx } from 'clsx'

const FLOOR_W = 960
const FLOOR_H = 560

// Zone definitions — strategy game HQ aesthetic
const ZONES = [
  {
    id: 'mission-control',
    name: 'Mission Control',
    color: '#a78bfa',
    x: 360, y: 16, w: 240, h: 130,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="12" x2="15" y2="15"/>
      </svg>
    ),
    desc: 'Orchestration hub',
  },
  {
    id: 'client-services',
    name: 'Client Suite',
    color: '#60a5fa',
    x: 32, y: 180, w: 270, h: 185,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    desc: 'Client relationships',
  },
  {
    id: 'creative',
    name: 'Creative Lab',
    color: '#2dd4bf',
    x: 338, y: 180, w: 285, h: 185,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z"/>
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
        <path d="M2 2l7.586 7.586"/>
        <circle cx="11" cy="11" r="2"/>
      </svg>
    ),
    desc: 'Design & production',
  },
  {
    id: 'media',
    name: 'Media Room',
    color: '#f472b6',
    x: 658, y: 180, w: 270, h: 185,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    desc: 'Media & performance',
  },
  {
    id: 'research',
    name: 'Research Hub',
    color: '#fbbf24',
    x: 195, y: 405, w: 570, h: 125,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    desc: 'Insights & SEO',
  },
]

// Animated grid background
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Primary grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(167,139,250,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(167,139,250,0.6) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          animation: 'grid-drift 20s linear infinite',
        }}
      />
      {/* Secondary finer grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px',
        }}
      />
      <style>{`
        @keyframes grid-drift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
      `}</style>
    </div>
  )
}

// Floating particles
function ParticleField() {
  const [particles] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      color: ZONES[i % ZONES.length].color,
      duration: 4 + Math.random() * 8,
      delay: Math.random() * 6,
      opacity: 0.2 + Math.random() * 0.4,
    }))
  )

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            opacity: p.opacity,
            animation: `particle-float ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(8px); }
          50% { transform: translateY(-10px) translateX(-5px); }
          75% { transform: translateY(-25px) translateX(3px); }
        }
      `}</style>
    </div>
  )
}

// Glowing room outline
function ZoneRoom({ zone, isHovered, pulse, onHover, onClick }: {
  zone: typeof ZONES[0]
  isHovered: boolean
  pulse: boolean
  onHover: (id: string | null) => void
  onClick: () => void
}) {
  const glowIntensity = isHovered ? 0.5 : (pulse ? 0.25 : 0.15)
  const strokeWidth = isHovered ? 1.5 : 1

  return (
    <g
      onMouseEnter={() => onHover(zone.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Outer glow layer */}
      <rect
        x={zone.x - 6}
        y={zone.y - 6}
        width={zone.w + 12}
        height={zone.h + 12}
        rx={16}
        fill="none"
        stroke={zone.color}
        strokeWidth={1}
        opacity={glowIntensity * 0.4}
        style={{
          filter: `blur(8px)`,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Room fill */}
      <rect
        x={zone.x}
        y={zone.y}
        width={zone.w}
        height={zone.h}
        rx={12}
        fill={`${zone.color}06`}
        stroke={zone.color}
        strokeWidth={strokeWidth}
        opacity={isHovered ? 0.9 : 0.5}
        style={{ transition: 'all 0.3s ease' }}
      />

      {/* Inner corner accents */}
      <path
        d={`M ${zone.x + 12} ${zone.y} L ${zone.x + 12} ${zone.y + 12} L ${zone.x} ${zone.y + 12}`}
        stroke={zone.color}
        strokeWidth={1.5}
        fill="none"
        opacity={isHovered ? 0.7 : 0.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`M ${zone.x + zone.w - 12} ${zone.y} L ${zone.x + zone.w - 12} ${zone.y + 12} L ${zone.x + zone.w} ${zone.y + 12}`}
        stroke={zone.color}
        strokeWidth={1.5}
        fill="none"
        opacity={isHovered ? 0.7 : 0.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Zone icon + name header */}
      <foreignObject x={zone.x + 12} y={zone.y + 10} width={zone.w - 24} height={28}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: zone.color,
            opacity: isHovered ? 1 : 0.7,
            transition: 'opacity 0.3s ease',
          }}
        >
          {zone.icon}
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: 'ui-monospace, monospace',
          }}>
            {zone.name}
          </span>
        </div>
      </foreignObject>

      {/* Agent slot indicators */}
      <g transform={`translate(${zone.x + 12}, ${zone.y + zone.h - 20})`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <rect
            key={i}
            x={i * 14}
            y={0}
            width={10}
            height={10}
            rx={2}
            fill={i === 0 ? zone.color : 'transparent'}
            stroke={zone.color}
            strokeWidth={1}
            opacity={i === 0 ? 0.4 : 0.15}
          />
        ))}
      </g>
    </g>
  )
}

// Agent game sprite
function AgentSprite({ agent, isSelected, onClick }: {
  agent: Agent
  isSelected: boolean
  onClick: () => void
}) {
  const zone = ZONES.find((z) => z.id === agent.position.room)
  if (!zone) return null

  const zoneAgents = agents.filter((a) => a.position.room === agent.position.room)
  const idxInZone = zoneAgents.indexOf(agent)
  const countInZone = zoneAgents.length

  const spacing = 44
  const totalWidth = countInZone * spacing
  const startX = zone.x + zone.w / 2 - totalWidth / 2 + spacing / 2
  const botX = startX + idxInZone * spacing
  const botY = zone.y + zone.h / 2 + 4

  return (
    <g
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={botX}
          cy={botY}
          r={22}
          fill="none"
          stroke={agent.color}
          strokeWidth={1.5}
          opacity={0.7}
          className="animate-ping"
          style={{ animationDuration: '2s' }}
        />
      )}

      {/* Agent glow for active */}
      {agent.status === 'active' && (
        <circle
          cx={botX}
          cy={botY}
          r={18}
          fill={agent.color}
          opacity={0.06}
          style={{ filter: 'blur(6px)' }}
        />
      )}

      {/* Bot */}
      <foreignObject x={botX - 18} y={botY - 18} width={36} height={36}>
        <div style={{ width: 36, height: 36 }}>
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
            size={32}
          />
        </div>
      </foreignObject>
    </g>
  )
}

// Zone detail panel
function ZonePanel({ zone, agents, selectedAgent, onSelectAgent, onClose }: {
  zone: typeof ZONES[0]
  agents: Agent[]
  selectedAgent: Agent | null
  onSelectAgent: (id: string | null) => void
  onClose: () => void
}) {
  const missions = useAgentsStore((state) => state.missions)

  return (
    <div
      className="absolute slide-in-up"
      style={{
        top: 20,
        right: 20,
        width: 288,
        zIndex: 20,
      }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-panel)',
          border: `1px solid ${zone.color}30`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${zone.color}10`,
        }}
      >
        {/* Zone header */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{
            background: `${zone.color}08`,
            borderBottom: `1px solid ${zone.color}20`,
          }}
        >
          <div style={{ color: zone.color }}>{zone.icon}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">{zone.name}</h4>
            <p className="text-[10px] text-[var(--text-dim)]">{zone.desc}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-dim)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Status bar */}
        <div className="px-4 py-2 flex items-center gap-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: agents.length > 0 ? '#2dd4bf' : '#52525b',
                boxShadow: agents.length > 0 ? '0 0 4px #2dd4bf' : 'none',
              }}
            />
            <span className="text-[11px] text-[var(--text-secondary)]">
              {agents.length} agent{agents.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap size={10} style={{ color: '#fbbf24' }} />
            <span className="text-[11px] text-[var(--text-secondary)]">
              {agents.filter(a => a.status === 'active').length} active
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
                  'px-4 py-3 border-b border-[var(--border)] cursor-pointer transition-all',
                  isSelected ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-hover)]'
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
                    size={32}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text-primary)]">{agent.name}</p>
                    <p className="text-[10px] text-[var(--text-dim)] truncate">{agent.role}</p>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: agent.status === 'active' ? '#2dd4bf' : agent.status === 'paused' ? '#fbbf24' : '#52525b',
                      boxShadow: agent.status === 'active' ? '0 0 4px #2dd4bf' : 'none',
                    }}
                  />
                </div>

                {/* Expanded */}
                {isSelected && (
                  <div className="mt-3 space-y-2">
                    {agent.bio && (
                      <p className="text-[11px] text-[var(--text-secondary)] italic leading-relaxed">
                        "{agent.bio}"
                      </p>
                    )}
                    {agent.currentTask && (
                      <div className="p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border)]">
                        <p className="text-[9px] font-medium text-[var(--text-dim)] uppercase tracking-wider mb-1">Current task</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">{agent.currentTask}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-[var(--text-dim)]">
                      <span>{agentMissions.length} missions</span>
                      <span>·</span>
                      <span>{agent.workload || 0}% load</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {agents.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-[var(--text-dim)]">No agents stationed here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Reference for agents in ZoneSprite
let agents: Agent[] = []

export function OfficeFloor() {
  const storeAgents = useAgentsStore((state) => state.agents)
  const storeMissions = useAgentsStore((state) => state.missions)
  const selectedAgentId = useAgentsStore((state) => state.selectedAgentId)
  const selectAgent = useAgentsStore((state) => state.selectAgent)

  agents = storeAgents

  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [pulseTime, setPulseTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setPulseTime((t) => t + 1), 80)
    return () => clearInterval(interval)
  }, [])

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null

  const agentsByZone = useMemo(
    () =>
      agents.reduce<Record<string, Agent[]>>((acc, agent) => {
        const zoneId = agent.position.room
        if (!acc[zoneId]) acc[zoneId] = []
        acc[zoneId].push(agent)
        return acc
      }, {}),
    [agents]
  )

  const activeCount = agents.filter((a) => a.status === 'active').length
  const idleCount = agents.filter((a) => a.status === 'idle').length
  const pausedCount = agents.filter((a) => a.status === 'paused').length

  const hoveredZoneData = hoveredZone
    ? ZONES.find((z) => z.id === hoveredZone)
    : null

  const selectedZoneData = selectedZone
    ? ZONES.find((z) => z.id === selectedZone)
    : null

  const handleZoneClick = (zoneId: string) => {
    if (selectedZone === zoneId) {
      setSelectedZone(null)
    } else {
      setSelectedZone(zoneId)
      setHoveredZone(null)
    }
  }

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: '#050507',
        border: '1px solid var(--border)',
        minHeight: 560,
        boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)',
      }}
    >
      {/* Dark game-map layers */}
      <GridBackground />
      <ParticleField />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 text-[9px] font-mono text-[var(--text-dim)] tracking-widest uppercase opacity-40">
        Agency HQ · Floor Plan
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-3 text-[10px] font-mono text-[var(--text-dim)] opacity-50">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf]" /> {activeCount}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" /> {idleCount}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#52525b]" /> {pausedCount}
        </span>
      </div>

      {/* SVG Floor plan */}
      <svg
        viewBox={`0 0 ${FLOOR_W} ${FLOOR_H}`}
        className="relative w-full h-auto"
        style={{ display: 'block', minHeight: 560 }}
      >
        {/* Connection lines between zones */}
        <path d="M 480 146 Q 200 146 167 270" stroke="#27272a" strokeWidth={1.5} strokeDasharray="5 5" fill="none" />
        <path d="M 480 146 Q 650 146 790 270" stroke="#27272a" strokeWidth={1.5} strokeDasharray="5 5" fill="none" />
        <path d="M 480 146 L 480 405" stroke="#27272a" strokeWidth={1.5} strokeDasharray="5 5" fill="none" />

        {/* Zones */}
        {ZONES.map((zone) => {
          const pulse = Math.sin(pulseTime * 0.04 + ZONES.indexOf(zone) * 1.1) > 0.75
          const hasActiveAgents = (agentsByZone[zone.id] || []).some((a) => a.status === 'active')

          return (
            <ZoneRoom
              key={zone.id}
              zone={zone}
              isHovered={hoveredZone === zone.id}
              pulse={hasActiveAgents && pulse}
              onHover={setHoveredZone}
              onClick={() => handleZoneClick(zone.id)}
            />
          )
        })}

        {/* Agent sprites */}
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId

          return (
            <AgentSprite
              key={agent.id}
              agent={agent}
              isSelected={isSelected}
              onClick={() => selectAgent(isSelected ? null : agent.id)}
            />
          )
        })}

        {/* Bottom legend */}
        <g transform="translate(16, 528)">
          <text x={0} y={0} fill="#3f3f46" fontSize={8} fontFamily="ui-monospace, monospace" letterSpacing={1}>
            CLICK ROOMS TO EXPLORE · AGENTS MOVE BETWEEN ZONES
          </text>
        </g>
      </svg>

      {/* Hover tooltip */}
      {hoveredZoneData && !selectedZone && !selectedAgent && (
        <div
          className="absolute slide-in-down"
          style={{
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            whiteSpace: 'nowrap',
          }}
        >
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-full"
            style={{
              background: 'var(--bg-panel)',
              border: `1px solid ${hoveredZoneData.color}30`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
            }}
          >
            <div style={{ color: hoveredZoneData.color }}>{hoveredZoneData.icon}</div>
            <div>
              <p className="text-xs font-semibold" style={{ color: hoveredZoneData.color }}>
                {hoveredZoneData.name}
              </p>
              <p className="text-[10px] text-[var(--text-dim)]">
                {(agentsByZone[hoveredZoneData.id] || []).length} agents · Click to explore
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected zone panel */}
      {selectedZoneData && (
        <ZonePanel
          zone={selectedZoneData}
          agents={agentsByZone[selectedZoneData.id] || []}
          selectedAgent={selectedAgent}
          onSelectAgent={(id) => selectAgent(id)}
          onClose={() => setSelectedZone(null)}
        />
      )}
    </div>
  )
}
