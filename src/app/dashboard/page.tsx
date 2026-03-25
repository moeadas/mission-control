'use client'

import React from 'react'
import { ClientShell } from '@/components/ClientShell'
import { MetricsCards, QuickActions, AgentStrip, MissionQueue } from '@/components/dashboard/MetricsCards'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { useAgentsStore } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const agents = useAgentsStore((state) => state.agents)
  const missions = useAgentsStore((state) => state.missions)
  const clients = useAgentsStore((state) => state.clients)
  const router = useRouter()
  const activeTasks = missions.filter((task) => !['completed', 'cancelled'].includes(task.status))

  const statusColors: Record<string, string> = {
    queued: '#ffd166',
    in_progress: '#00d4aa',
    blocked: '#ff7c42',
    review: '#9b6dff',
    completed: '#4f8ef7',
    paused: '#555b73',
    cancelled: '#555b73',
  }

  return (
    <ClientShell>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6 p-6">
          
          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-panel)] to-[var(--bg-card)] border border-[var(--border)]">
            {/* Ambient glow blobs */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-[var(--accent-purple)] opacity-5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[var(--accent-blue)] opacity-5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-heading font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
                  Command Center
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Your agency is running — {agents.filter(a => a.status === 'active').length} agents active across {clients.length} clients.
                </p>
              </div>
              
              {/* Live agent avatars */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {agents.slice(0, 6).map((agent) => (
                    <div 
                      key={agent.id} 
                      className="ring-2 ring-[var(--bg-card)] rounded-full hover:ring-[var(--accent-blue)] transition-all hover:scale-110 hover:z-10"
                      title={`${agent.name} — ${agent.status}`}
                    >
                      <AgentBot
                        name={agent.name}
                        avatar={agent.avatar}
                        color={agent.color}
                        status={agent.status}
                        size={36}
                      />
                    </div>
                  ))}
                </div>
                <div className="h-8 w-px bg-[var(--border)]" />
                <button 
                  onClick={() => router.push('/agents')}
                  className="text-xs font-mono text-[var(--accent-blue)] hover:text-[var(--accent-purple)] transition-colors"
                >
                  All agents →
                </button>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <MetricsCards />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <AgentStrip />
              <ActivityFeed />
            </div>
            <div className="space-y-6">
              <QuickActions />
              <MissionQueue />

              {/* Active Tasks Preview */}
              <div className="card-surface p-5 border-top-accent overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                    In Progress
                  </h3>
                  <button
                    onClick={() => router.push('/tasks')}
                    className="text-[11px] font-mono text-[var(--accent-blue)] hover:underline"
                  >
                    View all →
                  </button>
                </div>
                <div className="space-y-3">
                  {activeTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-glow)] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: statusColors[task.status] || '#4f8ef7' }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{task.title}</p>
                          <p className="text-[10px] text-[var(--text-dim)]">
                            {clients.find((client) => client.id === task.clientId)?.name || 'General Ops'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--text-secondary)] ml-2">
                        {task.progress}%
                      </span>
                    </div>
                  ))}
                  {activeTasks.length === 0 && (
                    <div className="text-center py-6">
                      <div className="text-3xl mb-2">🎯</div>
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
