'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, ExternalLink, FileText, Sheet, Target, Trash2 } from 'lucide-react'

import { ClientShell } from '@/components/ClientShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getSupportedExportFormats } from '@/lib/artifacts'
import { DELIVERABLE_LABELS } from '@/lib/bot-animations'
import { useAgentsStore } from '@/lib/agents-store'
import { Artifact, ArtifactExport } from '@/lib/types'
import { ArtifactOutputView } from '@/components/outputs/ArtifactOutputView'

const STATUS_COLORS: Record<string, string> = {
  queued: '#ffd166',
  in_progress: '#00d4aa',
  blocked: '#ff7c42',
  review: '#9b6dff',
  paused: '#8b92a8',
  cancelled: '#555b73',
  completed: '#4f8ef7',
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const missions = useAgentsStore((state) => state.missions)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const clients = useAgentsStore((state) => state.clients)
  const agents = useAgentsStore((state) => state.agents)
  const appStateReady = useAgentsStore((state) => state.appStateReady)
  const updateArtifact = useAgentsStore((state) => state.updateArtifact)
  const updateMission = useAgentsStore((state) => state.updateMission)
  const deleteMission = useAgentsStore((state) => state.deleteMission)

  const [exportingKey, setExportingKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const mission = missions.find((item) => item.id === params.id)
  const missionArtifacts = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.missionId === params.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [artifacts, params.id]
  )

  if (!appStateReady && !mission) {
    return (
      <ClientShell>
        <div className="p-6">
          <Card>
            <p className="text-sm text-text-primary">Loading task…</p>
          </Card>
        </div>
      </ClientShell>
    )
  }

  if (!mission) {
    return (
      <ClientShell>
        <div className="p-6">
          <Card>
            <p className="text-sm text-text-primary">Task not found.</p>
            <Link href="/tasks" className="inline-flex items-center gap-2 text-sm text-accent-blue mt-3">
              <ArrowLeft size={14} />
              Back to tasks
            </Link>
          </Card>
        </div>
      </ClientShell>
    )
  }

  const client = clients.find((item) => item.id === mission.clientId)
  const assignedAgentIds = Array.isArray(mission.assignedAgentIds) ? mission.assignedAgentIds : []
  const assignedAgents = agents.filter((agent) => assignedAgentIds.includes(agent.id))

  async function handleExport(artifact: Artifact, format: ArtifactExport['format']) {
    const exportKey = `${artifact.id}:${format}`
    const leadAgent = agents.find((item) => item.id === artifact.agentId)

    setExportingKey(exportKey)
    setFeedback(null)

    try {
      const response = await fetch('/api/artifacts/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifact,
          format,
          clientName: client?.name,
          missionTitle: mission?.title,
          agentName: leadAgent?.name,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to generate export.')
      }

      const exportRecord = data.exportRecord as ArtifactExport
      updateArtifact(artifact.id, {
        exports: [exportRecord, ...(artifact.exports || [])],
        status: artifact.status === 'draft' ? 'ready' : artifact.status,
        path: exportRecord.path,
      })

      setFeedback(`${artifact.title} exported as ${format.toUpperCase()}.`)
      window.open(exportRecord.publicUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to generate export.')
    } finally {
      setExportingKey(null)
    }
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            <Link href="/tasks" className="inline-flex items-center gap-2 text-[11px] text-accent-blue mb-2">
              <ArrowLeft size={12} />
              Back to tasks
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-heading font-bold text-text-primary">{mission.title}</h1>
              <Badge color={STATUS_COLORS[mission.status]} size="sm">
                {mission.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {client?.name || 'General Ops'} · {DELIVERABLE_LABELS[mission.deliverableType] || mission.deliverableType}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="ghost" onClick={() => updateMission(mission.id, { status: mission.status === 'paused' ? 'in_progress' : 'paused' })}>
              {mission.status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => updateMission(mission.id, { status: 'cancelled', progress: 0 })}>
              Cancel
            </Button>
            <Button size="sm" variant="ghost" onClick={() => updateMission(mission.id, { status: 'completed', progress: 100 })}>
              Complete
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (confirm(`Delete "${mission.title}"? This also removes its saved outputs.`)) {
                  deleteMission(mission.id)
                  router.replace('/tasks')
                }
              }}
            >
              <Trash2 size={14} />
              Delete
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="text-accent-orange" />
                  <h2 className="text-sm font-heading font-semibold text-text-primary">Task Request</h2>
                </div>
                <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{mission.summary}</p>
              </Card>

              {missionArtifacts.length ? (
                missionArtifacts.map((artifact) => (
                  <Card key={artifact.id} className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-heading font-semibold text-text-primary">{artifact.title}</h2>
                        <p className="text-[11px] text-text-secondary mt-1">
                          {DELIVERABLE_LABELS[artifact.deliverableType] || artifact.deliverableType} · {(artifact.format || 'html').toUpperCase()}
                        </p>
                      </div>
                      <Badge color={artifact.status === 'delivered' ? '#00d4aa' : artifact.status === 'ready' ? '#4f8ef7' : '#ffd166'} size="sm">
                        {artifact.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {getSupportedExportFormats(artifact).map((format) => (
                        <Button
                          key={format}
                          size="sm"
                          variant="secondary"
                          disabled={exportingKey === `${artifact.id}:${format}`}
                          onClick={() => handleExport(artifact, format)}
                        >
                          {format === 'xlsx' ? <Sheet size={14} /> : <Download size={14} />}
                          {exportingKey === `${artifact.id}:${format}` ? `Generating ${format.toUpperCase()}...` : `Generate ${format.toUpperCase()}`}
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => updateArtifact(artifact.id, { status: 'ready' })}>
                        Mark Ready
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateArtifact(artifact.id, { status: 'delivered' })}>
                        Mark Delivered
                      </Button>
                    </div>

                    {artifact.content ? (
                      <div className="p-4 rounded-xl border border-border bg-base/60">
                        <ArtifactOutputView artifact={artifact} />
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-border bg-base/40">
                        <p className="text-[12px] text-text-secondary">No output saved yet for this task.</p>
                      </div>
                    )}

                    {artifact.sourcePrompt ? (
                      <div className="p-4 rounded-xl border border-border bg-base/40">
                        <p className="text-[10px] font-mono uppercase text-text-dim mb-2">Task Brief</p>
                        <p className="text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed">{artifact.sourcePrompt}</p>
                      </div>
                    ) : null}

                    {artifact.exports?.length ? (
                      <div className="p-4 rounded-xl border border-border bg-base/30">
                        <p className="text-[10px] font-mono uppercase text-text-dim mb-3">Exports</p>
                        <div className="space-y-2">
                          {artifact.exports.map((record) => (
                            <a
                              key={record.id}
                              href={record.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-border-glow"
                            >
                              <div>
                                <p className="text-sm text-text-primary">{record.fileName}</p>
                                <p className="text-[11px] text-text-dim">{new Date(record.createdAt).toLocaleString()}</p>
                              </div>
                              <ExternalLink size={14} className="text-accent-blue" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {artifact.executionSteps?.length ? (
                      <div className="p-4 rounded-xl border border-border bg-base/30">
                        <p className="text-[10px] font-mono uppercase text-text-dim mb-3">Autonomous Execution</p>
                        <div className="space-y-2">
                          {artifact.executionSteps.map((step) => (
                            <div key={step.id} className="p-3 rounded-lg border border-border bg-base/40">
                              <p className="text-sm text-text-primary">{step.agentName} · {step.title}</p>
                              <p className="text-[11px] text-text-secondary mt-1">{step.summary}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </Card>
                ))
              ) : (
                <Card>
                  <p className="text-sm text-text-primary">No output yet.</p>
                  <p className="text-[11px] text-text-dim mt-1">When Iris drafts the deliverable, it will appear here automatically.</p>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <h3 className="text-xs font-mono text-text-dim uppercase mb-3">Task Summary</h3>
                <div className="space-y-2 text-sm text-text-secondary">
                  <p><span className="text-text-primary">Client:</span> {client?.name || 'General Ops'}</p>
                  <p><span className="text-text-primary">Type:</span> {DELIVERABLE_LABELS[mission.deliverableType] || mission.deliverableType}</p>
                  <p><span className="text-text-primary">Lead:</span> {agents.find((item) => item.id === mission.leadAgentId)?.name || 'Iris'}</p>
                  {mission.pipelineName ? <p><span className="text-text-primary">Pipeline:</span> {mission.pipelineName}</p> : null}
                  <p><span className="text-text-primary">Progress:</span> {mission.progress}%</p>
                  <p><span className="text-text-primary">Created:</span> {new Date(mission.createdAt).toLocaleString()}</p>
                  <p><span className="text-text-primary">Updated:</span> {new Date(mission.updatedAt).toLocaleString()}</p>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={14} className="text-accent-blue" />
                  <h3 className="text-xs font-mono text-text-dim uppercase">Assigned Team</h3>
                </div>
                <div className="space-y-2">
                  {assignedAgents.length ? (
                    assignedAgents.map((agent) => (
                      <div key={agent.id} className="p-3 rounded-lg border border-border bg-base/40">
                        <p className="text-sm text-text-primary">{agent.name}</p>
                        <p className="text-[11px] text-text-secondary">{agent.role}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-text-dim">No specialist assigned yet.</p>
                  )}
                </div>
              </Card>

              {(mission.qualityChecklist?.length || mission.handoffNotes) ? (
                <Card>
                  <h3 className="text-xs font-mono text-text-dim uppercase mb-3">Execution Plan</h3>
                  {mission.handoffNotes ? (
                    <p className="text-sm text-text-secondary leading-relaxed mb-3">{mission.handoffNotes}</p>
                  ) : null}
                  {mission.qualityChecklist?.length ? (
                    <div className="space-y-2">
                      {mission.qualityChecklist.map((step, index) => (
                        <div key={`${mission.id}-qc-${index}`} className="p-3 rounded-lg border border-border bg-base/40">
                          <p className="text-sm text-text-primary">{step}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ) : null}

              {feedback ? (
                <Card>
                  <p className="text-sm text-text-primary">{feedback}</p>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
