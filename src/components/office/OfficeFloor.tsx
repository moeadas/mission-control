'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useAgentsStore } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { X } from 'lucide-react'
import { OFFICE_ROOMS } from '@/lib/agent-templates'
import { DELIVERABLE_LABELS, DIVISION_LABELS, formatTimestamp } from '@/lib/bot-animations'
import { getModelLabel, getProviderLabel } from '@/lib/providers'
import { Agent } from '@/lib/types'

const FLOOR_W = 960
const FLOOR_H = 520

export function OfficeFloor() {
  const agents = useAgentsStore((state) => state.agents)
  const missions = useAgentsStore((state) => state.missions)
  const selectedAgentId = useAgentsStore((state) => state.selectedAgentId)
  const selectAgent = useAgentsStore((state) => state.selectAgent)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setPulse((p) => !p), 3000)
    return () => clearInterval(interval)
  }, [])

  const selectedAgent = agents.find((a) => a.id === selectedAgentId)
  const agentsByRoom = useMemo(
    () =>
      agents.reduce<Record<string, Agent[]>>((acc, agent) => {
        acc[agent.position.room] = [...(acc[agent.position.room] || []), agent]
        return acc
      }, {}),
    [agents]
  )

  return (
    <div className="relative w-full bg-base rounded-card border border-border overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(42,47,61,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(42,47,61,0.6) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floor plan SVG */}
      <svg
        viewBox={`0 0 ${FLOOR_W} ${FLOOR_H}`}
        className="relative w-full h-auto"
        style={{ display: 'block' }}
      >
        {/* Floor label */}
        <text x={20} y={28} fill="#555b73" fontSize={11} fontFamily="monospace">
          AGENCY HQ — FLOOR PLAN
        </text>

        {/* Rooms — draw FIRST so agents render on top */}
        {OFFICE_ROOMS.map((room) => (
          <g key={room.id}>
            {/* Room fill */}
            <rect
              x={room.x}
              y={room.y}
              width={room.w}
              height={room.h}
              rx={10}
              fill={`${room.color}0a`}
              stroke={room.color}
              strokeWidth={1}
              strokeOpacity={0.5}
              strokeDasharray="4 3"
            />
            {/* Room label */}
            <text
              x={room.x + room.w / 2}
              y={room.y + room.h + 16}
              textAnchor="middle"
              fill={room.color}
              fontSize={9}
              fontFamily="monospace"
              fontWeight={600}
              opacity={0.85}
            >
              {room.name.toUpperCase()}
            </text>
            {/* Corner dot */}
            <circle cx={room.x + 10} cy={room.y + 10} r={3} fill={room.color} opacity={0.7} />
          </g>
        ))}

        {/* Decorative connection lines */}
        <path d="M 160 200 Q 220 160 330 200" stroke="#2a2f3d" strokeWidth={1} strokeDasharray="4 4" fill="none" />
        <path d="M 360 200 Q 420 160 540 200" stroke="#2a2f3d" strokeWidth={1} strokeDasharray="4 4" fill="none" />
        <path d="M 560 200 Q 620 160 780 200" stroke="#2a2f3d" strokeWidth={1} strokeDasharray="4 4" fill="none" />
        <path d="M 160 360 Q 220 320 330 360" stroke="#2a2f3d" strokeWidth={1} strokeDasharray="4 4" fill="none" />
        <path d="M 400 360 Q 460 320 560 360" stroke="#2a2f3d" strokeWidth={1} strokeDasharray="4 4" fill="none" />
        <path d="M 600 360 Q 660 320 780 340" stroke="#2a2f3d" strokeWidth={1} strokeDasharray="4 4" fill="none" />

        {/* Agent bots */}
        {agents.map((agent) => {
          const room = OFFICE_ROOMS.find((r) => r.id === agent.position.room)
          const isSelected = agent.id === selectedAgentId
          const agentsInRoom = agentsByRoom[agent.position.room] || []
          const idxInRoom = agentsInRoom.indexOf(agent)
          const countInRoom = agentsInRoom.length

          // Get room anchor position
          const anchor = room
            ? { x: room.x + room.w / 2 - 20, y: room.y + room.h / 2 - 20 }
            : { x: agent.position.x, y: agent.position.y }

          // Stack agents side by side within their room
          const spacing = 46
          const totalWidth = countInRoom * spacing
          const startX = anchor.x - totalWidth / 2 + spacing / 2

          const botX = startX + idxInRoom * spacing
          const botY = Math.max(anchor.y, room ? room.y + 24 : 0)
          const maxY = room ? room.y + room.h - 52 : FLOOR_H
          const safeY = Math.min(botY, maxY)

          return (
            <g
              key={agent.id}
              style={{ cursor: 'pointer' }}
              onClick={() => selectAgent(isSelected ? null : agent.id)}
            >
              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={botX + 20}
                  cy={safeY + 20}
                  r={30}
                  fill="none"
                  stroke={room?.color || agent.color}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  opacity={pulse ? 0.25 : 0.7}
                  style={{ transition: 'opacity 1.5s' }}
                />
              )}

              {/* Bot container */}
              <foreignObject x={botX} y={safeY} width={40} height={44}>
                <div style={{ width: 40, height: 44 }}>
                  <AgentBot
                    name={agent.name}
                    avatar={agent.avatar}
                    color={agent.color}
                    status={agent.status}
                    animation={
                      agent.status === 'active' && agent.currentTask
                        ? 'working'
                        : agent.status === 'idle'
                        ? 'idle'
                        : agent.status === 'paused'
                        ? 'resting'
                        : 'idle'
                    }
                    size={40}
                  />
                </div>
              </foreignObject>

              {/* Name label */}
              <text
                x={botX + 20}
                y={safeY + 52}
                textAnchor="middle"
                fill="#8b92a8"
                fontSize={8}
                fontFamily="monospace"
                fontWeight={500}
              >
                {agent.name}
              </text>
            </g>
          )
        })}

        {/* Coffee station */}
        <g transform="translate(840, 410)">
          <rect x={0} y={0} width={70} height={44} rx={8} fill="#1a1e2a" stroke="#2a2f3d" strokeWidth={1} />
          <text x={35} y={16} textAnchor="middle" fill="#555b73" fontSize={7} fontFamily="monospace">☕ BREAK</text>
          <circle cx={16} cy={30} r={4} fill="#ff7c42" opacity={0.5} />
          <circle cx={35} cy={30} r={4} fill="#ffd166" opacity={0.5} />
          <circle cx={54} cy={30} r={4} fill="#00d4aa" opacity={0.5} />
        </g>

        {/* Legend */}
        <g transform="translate(20, 468)">
          <circle cx={6} cy={6} r={4} fill="#00d4aa" />
          <text x={16} y={9} fill="#8b92a8" fontSize={8} fontFamily="monospace">Active</text>
          <circle cx={76} cy={6} r={4} fill="#ffd166" />
          <text x={86} y={9} fill="#8b92a8" fontSize={8} fontFamily="monospace">Idle</text>
          <circle cx={126} cy={6} r={4} fill="#555b73" />
          <text x={136} y={9} fill="#8b92a8" fontSize={8} fontFamily="monospace">Paused</text>
          <text x={196} y={9} fill="#3d4459" fontSize={8} fontFamily="monospace">{agents.length} agents online</text>
        </g>
      </svg>

      {/* Selected agent panel */}
      {selectedAgent && (
        <div className="absolute top-4 right-4 w-64 slide-in-up">
          <Card
            className="border"
            style={{
              boxShadow: `0 0 0 1px ${selectedAgent.color}40, 0 0 24px ${selectedAgent.color}15`,
              borderColor: `${selectedAgent.color}30 !important`,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <AgentBot
                  name={selectedAgent.name}
                  avatar={selectedAgent.avatar}
                  color={selectedAgent.color}
                  status={selectedAgent.status}
                  animation={selectedAgent.status === 'active' && selectedAgent.currentTask ? 'working' : 'idle'}
                  size={52}
                />
                <div>
                  <h4 className="text-sm font-heading font-semibold text-text-primary">{selectedAgent.name}</h4>
                  <p className="text-xs text-text-secondary">{selectedAgent.role}</p>
                  <Badge color={selectedAgent.color} size="sm" className="mt-1">
                    {DIVISION_LABELS[selectedAgent.division] || selectedAgent.division}
                  </Badge>
                </div>
              </div>
              <button onClick={() => selectAgent(null)} className="text-text-dim hover:text-text-primary">
                <X size={14} />
              </button>
            </div>
            {selectedAgent.bio && (
              <p className="text-xs text-text-secondary mt-2 italic">{selectedAgent.bio}</p>
            )}
            {selectedAgent.currentTask && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] font-mono text-text-dim uppercase mb-1">Current Task</p>
                <p className="text-xs text-text-primary italic">{selectedAgent.currentTask}</p>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              <p className="text-[10px] font-mono text-text-dim uppercase">Runtime</p>
              <p className="text-xs text-text-secondary">
                {getProviderLabel(selectedAgent.provider)} · {getModelLabel(selectedAgent.model)}
              </p>
              <p className="text-xs text-text-secondary">
                Workload {selectedAgent.workload || 0}% · {missions.filter((mission) => mission.assignedAgentIds.includes(selectedAgent.id)).length} missions
              </p>
              <p className="text-xs text-text-secondary">
                Outputs {selectedAgent.primaryOutputs.map((item) => DELIVERABLE_LABELS[item] || item).join(', ')}
              </p>
            </div>
            {selectedAgent.lastActive && (
              <p className="text-[10px] font-mono text-text-dim mt-2">
                Last active {formatTimestamp(selectedAgent.lastActive)}
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Room legend — bottom left */}
      <div className="absolute bottom-16 left-4 flex flex-col gap-1">
        {OFFICE_ROOMS.map((room) => {
          const count = (agentsByRoom[room.id] || []).length
          return (
            <div key={room.id} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: room.color, opacity: 0.7 }} />
              <span className="text-[9px] font-mono text-text-dim">{room.name}</span>
              {count > 0 && (
                <span className="text-[9px] font-mono" style={{ color: room.color }}>·{count}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
