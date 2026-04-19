'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { ListTodo, ArrowRight, Clock3, Trash2 } from 'lucide-react'

import { ClientShell } from '@/components/ClientShell'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useAgentsStore } from '@/lib/agents-store'
import { DELIVERABLE_LABELS } from '@/lib/bot-animations'

const STATUS_COLORS: Record<string, string> = {
  queued: '#ffd166',
  in_progress: '#00d4aa',
  blocked: '#ff7c42',
  review: '#9b6dff',
  paused: '#8b92a8',
  cancelled: '#555b73',
  completed: '#4f8ef7',
}

export default function TasksPage() {
  const missions = useAgentsStore((state) => state.missions)
  const clients = useAgentsStore((state) => state.clients)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const deleteMission = useAgentsStore((state) => state.deleteMission)
  const appStateReady = useAgentsStore((state) => state.appStateReady)

  const sortedTasks = useMemo(
    () => [...missions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [missions]
  )

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
              <ListTodo size={20} className="text-accent-orange" />
              Tasks
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Every request becomes a tracked task with its brief, live output, and exports
            </p>
          </div>
          <div className="text-[11px] font-mono text-text-dim">{missions.length} tracked tasks</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-4">
            {!appStateReady ? (
              <Card>
                <p className="text-sm text-text-primary">Loading tasks…</p>
              </Card>
            ) : sortedTasks.length ? (
              sortedTasks.map((mission) => {
                const client = clients.find((item) => item.id === mission.clientId)
                const missionArtifacts = artifacts.filter((artifact) => artifact.missionId === mission.id)
                const latestArtifact = missionArtifacts[0]

                return (
                  <Card key={mission.id} hover className="h-full space-y-4">
                    <Link href={`/tasks/${mission.id}`} className="block space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-heading font-semibold text-text-primary">{mission.title}</h3>
                          <p className="text-[11px] text-text-secondary mt-1">
                            {client?.name || 'General Ops'} · {DELIVERABLE_LABELS[mission.deliverableType] || mission.deliverableType}
                          </p>
                        </div>
                        <Badge color={STATUS_COLORS[mission.status]} size="sm">
                          {mission.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <p className="text-sm text-text-secondary line-clamp-3">{mission.summary}</p>

                      {latestArtifact?.content ? (
                        <div className="p-3 rounded-xl border border-border bg-base/50">
                          <p className="text-[10px] font-mono uppercase text-text-dim mb-2">Latest Output</p>
                          <p className="text-[12px] text-text-primary line-clamp-6 whitespace-pre-wrap">{latestArtifact.content}</p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl border border-border bg-base/40">
                          <p className="text-[12px] text-text-secondary">
                            Task created. Output will appear here as soon as Iris drafts it.
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-[11px] text-text-dim">
                          <Clock3 size={12} />
                          Updated {new Date(mission.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              if (confirm(`Delete "${mission.title}"? This also removes its saved outputs.`)) {
                                deleteMission(mission.id)
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            aria-label={`Delete ${mission.title}`}
                          >
                            <Trash2 size={11} />
                            <span>Delete</span>
                          </button>
                          <span className="inline-flex items-center gap-1 text-[11px] text-accent-blue">
                            Open task <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </Card>
                )
              })
            ) : (
              <Card>
                <p className="text-sm text-text-primary">No tasks yet.</p>
                <p className="text-[11px] text-text-dim mt-1">
                  Ask Iris for a post, strategy, calendar, media plan, audit, or brief and it will appear here.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
