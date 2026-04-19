'use client'

import React, { useMemo, useState } from 'react'
import { Building2, Clock3, MapPin, Users } from 'lucide-react'
import { clsx } from 'clsx'

import { AgentBot } from '@/components/agents/AgentBot'
import { useAgentsStore } from '@/lib/agents-store'
import { Agent } from '@/lib/types'

const ROOMS = [
  {
    id: 'client-services',
    name: 'Client Services',
    accent: '#5b8def',
    frame: { left: '7%', top: '13%', width: '23%', height: '21%' },
    seats: [
      { left: '28%', top: '69%' },
      { left: '50%', top: '69%' },
      { left: '72%', top: '69%' },
    ],
  },
  {
    id: 'orchestration',
    name: 'Mission Control',
    accent: '#8b6af7',
    frame: { left: '40%', top: '9%', width: '17%', height: '17%' },
    seats: [
      { left: '36%', top: '67%' },
      { left: '64%', top: '67%' },
    ],
  },
  {
    id: 'creative',
    name: 'Creative Studio',
    accent: '#16c7aa',
    frame: { left: '65%', top: '13%', width: '23%', height: '21%' },
    seats: [
      { left: '26%', top: '69%' },
      { left: '50%', top: '69%' },
      { left: '74%', top: '69%' },
    ],
  },
  {
    id: 'research',
    name: 'Research Lab',
    accent: '#42b6f5',
    frame: { left: '10%', top: '58%', width: '23%', height: '20%' },
    seats: [{ left: '50%', top: '71%' }],
  },
  {
    id: 'media',
    name: 'Media Planning',
    accent: '#ff8a6a',
    frame: { left: '65%', top: '58%', width: '23%', height: '20%' },
    seats: [
      { left: '38%', top: '71%' },
      { left: '62%', top: '71%' },
    ],
  },
] as const

const ROAM_PATHS = [
  { left: '48%', top: '31%', animation: 'office-route-a 18s ease-in-out infinite' },
  { left: '48%', top: '45%', animation: 'office-route-b 22s ease-in-out infinite' },
  { left: '48%', top: '59%', animation: 'office-route-c 20s ease-in-out infinite' },
  { left: '37%', top: '45%', animation: 'office-route-d 21s ease-in-out infinite' },
] as const

function Plant({ className }: { className: string }) {
  return (
    <div className={clsx('absolute', className)}>
      <div className="relative mx-auto h-5 w-5">
        <div className="absolute inset-x-[30%] top-0 h-3 rounded-full bg-[#78c7a0]" />
        <div className="absolute left-0 top-[24%] h-3 w-3 rounded-full bg-[#68b68f]" />
        <div className="absolute right-0 top-[24%] h-3 w-3 rounded-full bg-[#5da97f]" />
      </div>
      <div className="mx-auto h-2 w-1.5 rounded-b bg-[#846049]" />
      <div className="mx-auto h-2.5 w-5 rounded-[6px] bg-[#5d6471]" />
    </div>
  )
}

function Desk({ className }: { className: string }) {
  return (
    <div
      className={clsx(
        'absolute rounded-[10px] border border-[#b99373] bg-[linear-gradient(180deg,#c99a6e,#b7865e)] shadow-[0_8px_14px_rgba(15,23,42,0.08)]',
        className
      )}
    />
  )
}

function Chair({ className }: { className: string }) {
  return <div className={clsx('absolute rounded-[6px] border border-[#b8c2cd] bg-[#dbe2ea]', className)} />
}

function RoomFixtures({ roomId }: { roomId: string }) {
  if (roomId === 'creative') {
    return (
      <>
        <Desk className="left-[12%] top-[28%] h-10 w-[24%]" />
        <Desk className="left-[38%] top-[28%] h-10 w-[24%]" />
        <Desk className="right-[12%] top-[28%] h-10 w-[24%]" />
        <Chair className="left-[22%] top-[54%] h-5 w-5" />
        <Chair className="left-[48%] top-[54%] h-5 w-5" />
        <Chair className="right-[22%] top-[54%] h-5 w-5" />
      </>
    )
  }

  if (roomId === 'client-services') {
    return (
      <>
        <Desk className="left-[12%] top-[27%] h-10 w-[28%]" />
        <Desk className="right-[12%] top-[27%] h-10 w-[24%]" />
        <Desk className="left-[28%] top-[50%] h-11 w-[42%]" />
        <Chair className="left-[18%] top-[54%] h-5 w-5" />
        <Chair className="right-[18%] top-[54%] h-5 w-5" />
      </>
    )
  }

  if (roomId === 'orchestration') {
    return (
      <>
        <Desk className="left-[25%] top-[31%] h-10 w-[50%]" />
        <Chair className="left-[32%] top-[54%] h-5 w-5" />
        <Chair className="right-[32%] top-[54%] h-5 w-5" />
      </>
    )
  }

  if (roomId === 'research') {
    return (
      <>
        <Desk className="left-[14%] top-[30%] h-10 w-[30%]" />
        <Desk className="right-[12%] top-[30%] h-10 w-[28%]" />
      </>
    )
  }

  return (
    <>
      <Desk className="left-[18%] top-[30%] h-10 w-[26%]" />
      <Desk className="right-[14%] top-[30%] h-10 w-[24%]" />
      <Desk className="left-[30%] top-[54%] h-11 w-[40%]" />
      <Chair className="left-[28%] top-[61%] h-5 w-5" />
      <Chair className="right-[28%] top-[61%] h-5 w-5" />
    </>
  )
}

function RoomBlock({
  room,
  agents,
  isSelected,
  onSelect,
}: {
  room: (typeof ROOMS)[number]
  agents: Agent[]
  isSelected: boolean
  onSelect: () => void
}) {
  const seatedAgents = agents.filter((agent) => agent.status !== 'idle')

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'absolute rounded-[22px] border-[2px] bg-[#fdfdfb] text-left transition-all duration-200',
        isSelected && 'shadow-[0_18px_34px_rgba(15,23,42,0.12)]'
      )}
      style={{
        ...room.frame,
        borderColor: isSelected ? `${room.accent}99` : '#dde3ea',
        boxShadow: isSelected
          ? `0 18px 34px rgba(15,23,42,0.12), 0 0 0 3px ${room.accent}22`
          : '0 12px 28px rgba(15,23,42,0.08)',
      }}
    >
      <div className="absolute inset-[10px] rounded-[16px] border border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafb_100%)]" />
      <div className="absolute inset-[10px] rounded-[16px] bg-[linear-gradient(rgba(174,180,188,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(174,180,188,0.12)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="relative h-full w-full p-4">
        <div className="flex items-start justify-between">
          <div
            className="rounded-[14px] px-3.5 py-2.5 shadow-[0_10px_22px_rgba(15,23,42,0.08)] relative z-10"
            style={{
              border: `1px solid ${room.accent}66`,
              background: `linear-gradient(180deg, color-mix(in srgb, ${room.accent} 12%, white 88%), color-mix(in srgb, ${room.accent} 6%, white 94%))`,
              boxShadow: `0 10px 22px rgba(15,23,42,0.08), 0 0 0 1px ${room.accent}18`,
            }}
          >
            <p
              className="font-mono text-[12px] font-black uppercase tracking-[0.12em] whitespace-nowrap"
              style={{
                color: room.accent,
                textShadow: `0 0 10px ${room.accent}33, 0 0 18px ${room.accent}22`,
              }}
            >
              {room.name}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e6e9ee] bg-[#fbfaf6] px-2.5 py-1.5 text-[11px] font-medium text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.04)] relative z-10">
            {agents.length}
          </div>
        </div>

        <div className="absolute inset-x-[8%] top-[20%] h-[10%] rounded-[14px] bg-[linear-gradient(180deg,rgba(246,247,248,0.92),rgba(237,241,244,0.82))] opacity-90" />
        <RoomFixtures roomId={room.id} />
        <Plant className="bottom-[10%] right-[9%]" />

        {room.seats.map((seat, index) => {
          const agent = seatedAgents[index]
          return (
            <div
              key={`${room.id}-seat-${index}`}
              className="absolute"
              style={{ left: seat.left, top: seat.top, transform: 'translate(-50%, -50%)' }}
            >
              <div className="absolute left-1/2 top-[84%] h-3 w-12 -translate-x-1/2 rounded-full bg-black/10 blur-[3px]" />
              {agent ? (
                <AgentBot
                  name={agent.name}
                  avatar={agent.avatar}
                  photoUrl={agent.photoUrl}
                  color={agent.color}
                  variant="office"
                  status={agent.status}
                  animation={agent.status === 'active' ? 'working' : 'resting'}
                  size={66}
                />
              ) : (
                <div className="h-10 w-10 rounded-md border border-dashed border-black/12 bg-slate-100/70" />
              )}
            </div>
          )
        })}
      </div>
    </button>
  )
}

function Rover({
  agent,
  index,
  onSelect,
}: {
  agent: Agent
  index: number
  onSelect: () => void
}) {
  const path = ROAM_PATHS[index % ROAM_PATHS.length]

  return (
    <button
      type="button"
      onClick={onSelect}
      className="absolute z-20"
      style={{ left: path.left, top: path.top, animation: path.animation, transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative">
        <div className="absolute left-1/2 top-[84%] h-3 w-12 -translate-x-1/2 rounded-full bg-black/10 blur-[3px]" />
        <AgentBot
          name={agent.name}
          avatar={agent.avatar}
          photoUrl={agent.photoUrl}
          color={agent.color}
          variant="office"
          status={agent.status}
          animation="idle"
          size={64}
        />
      </div>
    </button>
  )
}

function DetailRail({
  room,
  selectedAgent,
  roomAgents,
  onSelectAgent,
}: {
  room: (typeof ROOMS)[number] | null
  selectedAgent: Agent | null
  roomAgents: Agent[]
  onSelectAgent: (agent: Agent) => void
}) {
  if (!room) return null

  return (
    <aside className="absolute right-5 top-5 bottom-5 z-30 w-[290px] overflow-y-auto rounded-[24px] border border-[#d7dce5] bg-white/92 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: room.accent }}>
            {room.name}
          </p>
          <p className="mt-1 text-xs text-slate-500">{roomAgents.length} assigned agents</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">live room</div>
      </div>

      {selectedAgent ? (
        <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <AgentBot
              name={selectedAgent.name}
              avatar={selectedAgent.avatar}
              photoUrl={selectedAgent.photoUrl}
              color={selectedAgent.color}
              variant="office"
              status={selectedAgent.status}
              animation={selectedAgent.status === 'active' ? 'working' : 'idle'}
              size={54}
            />
            <div>
              <h3 className="text-base font-semibold text-slate-900">{selectedAgent.name}</h3>
              <p className="text-sm text-slate-500">{selectedAgent.role}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white px-3 py-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400">Status</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{selectedAgent.status}</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400">Workload</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{selectedAgent.workload || 0}%</p>
            </div>
          </div>

          {selectedAgent.currentTask ? (
            <p className="mt-4 rounded-2xl bg-white px-3 py-3 text-sm leading-relaxed text-slate-600">
              {selectedAgent.currentTask}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5">
        <p className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400">Roster</p>
        <div className="space-y-2">
          {roomAgents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelectAgent(agent)}
              className={clsx(
                'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors',
                selectedAgent?.id === agent.id
                  ? 'border-slate-300 bg-slate-50'
                  : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
              )}
            >
              <AgentBot
                name={agent.name}
                avatar={agent.avatar}
                photoUrl={agent.photoUrl}
                color={agent.color}
                variant="office"
                status={agent.status}
                animation={agent.status === 'active' ? 'working' : 'idle'}
                size={34}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{agent.name}</p>
                <p className="truncate text-xs text-slate-500">{agent.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

export function OfficeFloor() {
  const agents = useAgentsStore((state) => state.agents)
  const selectedAgentId = useAgentsStore((state) => state.selectedAgentId)
  const selectAgent = useAgentsStore((state) => state.selectAgent)

  const [selectedRoomId, setSelectedRoomId] = useState<string>('creative')

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) || null
  const idleAgents = useMemo(() => agents.filter((agent) => agent.status === 'idle'), [agents])
  const roomAgents = useMemo(
    () =>
      ROOMS.reduce<Record<string, Agent[]>>((acc, room) => {
        acc[room.id] = agents.filter((agent) => agent.position.room === room.id)
        return acc
      }, {}),
    [agents]
  )

  const selectedRoom = ROOMS.find((room) => room.id === (selectedAgent?.position.room || selectedRoomId)) || ROOMS[0]
  const selectedRoomAgents = roomAgents[selectedRoom.id] || []

  return (
    <div className="relative h-full min-h-[780px] overflow-hidden rounded-[32px] border border-[#dadfe8] bg-[linear-gradient(180deg,#eef1f3_0%,#e6eaee_100%)] shadow-[0_24px_54px_rgba(15,23,42,0.12)]">
      <style>{`
        @keyframes office-route-a {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0px, 0px, 0); }
          24% { transform: translate(-50%, -50%) translate3d(76px, 0px, 0); }
          52% { transform: translate(-50%, -50%) translate3d(76px, 68px, 0); }
          76% { transform: translate(-50%, -50%) translate3d(-22px, 68px, 0); }
        }
        @keyframes office-route-b {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0px, 0px, 0); }
          22% { transform: translate(-50%, -50%) translate3d(-82px, 0px, 0); }
          48% { transform: translate(-50%, -50%) translate3d(-82px, -76px, 0); }
          76% { transform: translate(-50%, -50%) translate3d(18px, -76px, 0); }
        }
        @keyframes office-route-c {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0px, 0px, 0); }
          25% { transform: translate(-50%, -50%) translate3d(84px, 0px, 0); }
          50% { transform: translate(-50%, -50%) translate3d(84px, -70px, 0); }
          78% { transform: translate(-50%, -50%) translate3d(-16px, -70px, 0); }
        }
        @keyframes office-route-d {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0px, 0px, 0); }
          25% { transform: translate(-50%, -50%) translate3d(110px, 0px, 0); }
          50% { transform: translate(-50%, -50%) translate3d(110px, 44px, 0); }
          76% { transform: translate(-50%, -50%) translate3d(0px, 44px, 0); }
        }
      `}</style>

      <div className="absolute left-5 top-5 z-20 flex items-center gap-3 rounded-full border border-white/70 bg-white/85 px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
        <Building2 size={16} className="text-slate-500" />
        <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Virtual Office</span>
      </div>

      <div className="absolute left-5 bottom-5 z-20 flex items-center gap-4 rounded-full border border-white/70 bg-white/85 px-5 py-3 text-slate-500 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span>{agents.filter((agent) => agent.status === 'active').length} seated</span>
        </div>
        <div className="h-4 w-px bg-slate-300" />
        <div className="flex items-center gap-2 text-xs">
          <Clock3 size={13} />
          <span>{idleAgents.length} roaming</span>
        </div>
        <div className="h-4 w-px bg-slate-300" />
        <div className="flex items-center gap-2 text-xs">
          <Users size={13} />
          <span>{agents.length} total</span>
        </div>
      </div>

      <div className="absolute right-5 bottom-5 z-20 flex items-center gap-2 rounded-full border border-white/70 bg-white/85 px-4 py-3 text-xs text-slate-500 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
        <MapPin size={13} />
        <span>Idle agents move through corridors while active agents stay at desks</span>
      </div>

      <div className="absolute inset-y-0 left-0 right-[310px] overflow-hidden">
        <div className="absolute left-[3.5%] top-[6%] h-[86%] w-[92%] rounded-[34px] border border-white/70 bg-[#f7f7f2] shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
          <div className="absolute inset-[1.1%] rounded-[28px] border border-[#e6e9ed] bg-[linear-gradient(180deg,#fbfbf8,#f1f3ef)]" />

          <div className="absolute inset-[1.1%] rounded-[28px] bg-[linear-gradient(rgba(184,188,193,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(184,188,193,0.12)_1px,transparent_1px)] bg-[size:22px_22px] pointer-events-none" />

          <div className="absolute left-[39%] top-[66.5%] h-[8.5%] w-[9%] rounded-[18px] border border-white/90 bg-[linear-gradient(180deg,#ffffff,#f1f4f6)] shadow-[0_10px_22px_rgba(15,23,42,0.06)]" />
          <div className="absolute right-[39%] top-[66.5%] h-[8.5%] w-[9%] rounded-[18px] border border-white/90 bg-[linear-gradient(180deg,#ffffff,#f1f4f6)] shadow-[0_10px_22px_rgba(15,23,42,0.06)]" />
          <Plant className="left-[43%] top-[68.5%]" />
          <Plant className="left-[53%] top-[68.5%]" />

          <div className="absolute left-[17.5%] top-[46%] h-[7%] w-[10%] rounded-[18px] border border-white/90 bg-[linear-gradient(180deg,#f4f7fb,#e7eef6)] shadow-[0_10px_22px_rgba(15,23,42,0.05)]" />
          <div className="absolute right-[17.5%] top-[46%] h-[7%] w-[10%] rounded-[18px] border border-white/90 bg-[linear-gradient(180deg,#f4f7fb,#e7eef6)] shadow-[0_10px_22px_rgba(15,23,42,0.05)]" />

          {ROOMS.map((room) => (
            <RoomBlock
              key={room.id}
              room={room}
              agents={roomAgents[room.id] || []}
              isSelected={selectedRoom.id === room.id}
              onSelect={() => {
                setSelectedRoomId(room.id)
                if (!selectedAgent || selectedAgent.position.room !== room.id) {
                  selectAgent(null)
                }
              }}
            />
          ))}

          {idleAgents.map((agent, index) => (
            <Rover
              key={agent.id}
              agent={agent}
              index={index}
              onSelect={() => {
                selectAgent(agent.id)
                setSelectedRoomId(agent.position.room)
              }}
            />
          ))}
        </div>
      </div>

      <DetailRail
        room={selectedRoom}
        selectedAgent={selectedAgent}
        roomAgents={selectedRoomAgents}
        onSelectAgent={(agent) => {
          selectAgent(agent.id)
          setSelectedRoomId(agent.position.room)
        }}
      />
    </div>
  )
}
