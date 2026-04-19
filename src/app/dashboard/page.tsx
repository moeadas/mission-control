'use client'

import React from 'react'
import { ClientShell } from '@/components/ClientShell'
import { MetricsCards, QuickActions, AgentStrip, MissionQueue, CommandQuestDeck } from '@/components/dashboard/MetricsCards'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { useAgentsStore } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { useRouter } from 'next/navigation'
import { buildAgentLeaderboard } from '@/lib/live-ops'
import { AgentLeaderboardPanel } from '@/components/analytics/AgentLeaderboardPanel'

export default function DashboardPage() {
  const agents = useAgentsStore((state) => state.agents)
  const missions = useAgentsStore((state) => state.missions)
  const clients = useAgentsStore((state) => state.clients)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const router = useRouter()
  const activeTasks = missions.filter((task) => !['completed', 'cancelled'].includes(task.status))
  const leaderboard = buildAgentLeaderboard({ agents, missions, artifacts })

  const statusColors: Record<string, string> = {
    queued: '#fbbf24',
    in_progress: '#2dd4bf',
    blocked: '#fb923c',
    review: '#a78bfa',
    completed: '#60a5fa',
    paused: '#52525b',
    cancelled: '#52525b',
  }

  return (
    <ClientShell>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5 p-6">
          
          {/* Hero Header — clean, minimal */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Command Center
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {agents.filter(a => a.status === 'active').length} agents active
                  <span className="mx-2 text-[var(--text-dim)]">·</span>
                  {clients.length} clients
                  <span className="mx-2 text-[var(--text-dim)]">·</span>
                  {activeTasks.length} tasks running
                </p>
              </div>
              
              {/* Live agent avatars */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {agents.slice(0, 6).map((agent) => (
                    <div 
                      key={agent.id} 
                      className="ring-2 ring-[var(--bg-card)] rounded-full transition-all hover:ring-[var(--accent-blue)] hover:scale-105 hover:z-10"
                      title={`${agent.name} — ${agent.status}`}
                    >
                      <AgentBot
                        name={agent.name}
                        avatar={agent.avatar}
                        color={agent.color}
                        photoUrl={agent.photoUrl}
                        status={agent.status}
                        size={36}
                      />
                    </div>
                  ))}
                </div>
                <div className="h-8 w-px bg-[var(--border)]" />
                <button 
                  onClick={() => router.push('/agents')}
                  className="text-xs text-[var(--accent-blue)] hover:opacity-80 transition-opacity"
                >
                  All agents →
                </button>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <MetricsCards />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <AgentStrip />
              <ActivityFeed />
            </div>
            <div className="space-y-5">
              <CommandQuestDeck />
              <QuickActions />
              <MissionQueue />
              <AgentLeaderboardPanel
                entries={leaderboard}
                compact
                title="Leaderboard"
                subtitle="Top performers this week across lead work and support contributions."
              />

              {/* Active Tasks Preview */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    In Progress
                  </h3>
                  <button
                    onClick={() => router.push('/tasks')}
                    className="text-[11px] text-[var(--accent-blue)] hover:opacity-80 transition-opacity"
                  >
                    View all →
                  </button>
                </div>
                <div className="space-y-2">
                  {activeTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-glow)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: statusColors[task.status] || '#60a5fa' }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{task.title}</p>
                          <p className="text-[10px] text-[var(--text-dim)]">
                            {clients.find((client) => client.id === task.clientId)?.name || 'General Ops'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)] ml-2 tabular-nums">
                        {task.progress}%
                      </span>
                    </div>
                  ))}
                  {activeTasks.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-xs text-[var(--text-dim)]">All quiet — no active tasks</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
