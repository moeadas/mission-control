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

  const statusColors = {
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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-heading font-bold text-text-primary">
                Command Center
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Welcome back — your agency is running at full speed.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {agents.slice(0, 5).map((agent) => (
                  <div key={agent.id} className="ring-2 ring-base rounded-full">
                    <AgentBot
                      name={agent.name}
                      avatar={agent.avatar}
                      color={agent.color}
                      status={agent.status}
                      size={32}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Metrics */}
          <MetricsCards />

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <AgentStrip />
              <ActivityFeed />
            </div>
            <div className="space-y-6">
              <QuickActions />
              <MissionQueue />

              {/* Tasks preview */}
              <div className="bg-card border border-border rounded-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                    Active Tasks
                  </h3>
                  <button
                    onClick={() => router.push('/tasks')}
                    className="text-[11px] font-mono text-accent-blue hover:underline"
                  >
                    View all →
                  </button>
                </div>
                <div className="space-y-3">
                  {activeTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-base border border-border hover:border-border-glow transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: statusColors[task.status as keyof typeof statusColors] || '#4f8ef7' }}
                        />
                        <div>
                          <p className="text-xs font-medium text-text-primary">{task.title}</p>
                          <p className="text-[10px] text-text-dim">
                            {clients.find((client) => client.id === task.clientId)?.name || task.clientId || 'General Ops'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-text-secondary">
                        {task.progress}%
                      </span>
                    </div>
                  ))}
                  {activeTasks.length === 0 && (
                    <p className="text-xs text-text-dim py-4 text-center">No active tasks</p>
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
