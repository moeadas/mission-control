'use client'

import React, { useMemo, useState } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { Client, KnowledgeAsset } from '@/lib/client-data'
import { useAgentsStore } from '@/lib/agents-store'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import {
  BookOpen,
  ExternalLink,
  FileText,
  Globe,
  LibraryBig,
  MessageSquareQuote,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Users,
} from 'lucide-react'

const INDUSTRY_COLORS: Record<string, string> = {
  Genomics: '#38bdf8',
  Biotechnology: '#38bdf8',
  Equine: '#9b6dff',
  default: '#ffd166',
}

function getIndustryColor(industry: string) {
  for (const key of Object.keys(INDUSTRY_COLORS)) {
    if (industry.toLowerCase().includes(key.toLowerCase())) return INDUSTRY_COLORS[key]
  }
  return INDUSTRY_COLORS.default
}

const EMPTY_ASSET: KnowledgeAsset = {
  id: '',
  title: '',
  type: 'doc',
  path: '',
  summary: '',
  extractedInsights: '',
  status: 'reference',
}

const EMPTY_CLIENT = {
  name: '',
  industry: '',
  website: '',
  description: '',
  missionStatement: '',
  brandPromise: '',
  targetAudiences: '',
  productsAndServices: '',
  usp: '',
  competitiveLandscape: '',
  keyMessages: '',
  toneOfVoice: '',
  operationalDetails: '',
  objectionHandling: '',
  brandIdentityNotes: '',
  strategicPriorities: '',
  competitors: [] as string[],
  knowledgeAssets: [] as KnowledgeAsset[],
  notes: '',
}

const ASSET_TYPE_OPTIONS = [
  { value: 'doc', label: 'Doc / Markdown' },
  { value: 'pdf', label: 'PDF' },
  { value: 'sheet', label: 'Spreadsheet' },
  { value: 'link', label: 'Link' },
  { value: 'note', label: 'Internal Note' },
]

const ASSET_STATUS_OPTIONS = [
  { value: 'reference', label: 'Reference' },
  { value: 'needs-review', label: 'Needs Review' },
  { value: 'synced', label: 'Synced' },
]

export default function ClientsPage() {
  const clients = useAgentsStore((state) => state.clients)
  const addClient = useAgentsStore((state) => state.addClient)
  const updateClient = useAgentsStore((state) => state.updateClient)
  const deleteClient = useAgentsStore((state) => state.deleteClient)
  const campaigns = useAgentsStore((state) => state.campaigns)
  const agents = useAgentsStore((state) => state.agents)
  const artifacts = useAgentsStore((state) => state.artifacts)

  const [selectedId, setSelectedId] = useState<string | null>(clients[0]?.id || null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<typeof EMPTY_CLIENT | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [competitorInput, setCompetitorInput] = useState('')
  const [assetDraft, setAssetDraft] = useState<KnowledgeAsset>(EMPTY_ASSET)

  const selectedClient = clients.find((client) => client.id === selectedId) || null

  const openNew = () => {
    setEditingClient({ ...EMPTY_CLIENT, knowledgeAssets: [] })
    setAssetDraft(EMPTY_ASSET)
    setIsEditorOpen(true)
  }

  const openEdit = (client: Client) => {
    setEditingClient({
      name: client.name,
      industry: client.industry,
      website: client.website || '',
      description: client.description,
      missionStatement: client.missionStatement,
      brandPromise: client.brandPromise,
      targetAudiences: client.targetAudiences,
      productsAndServices: client.productsAndServices,
      usp: client.usp,
      competitiveLandscape: client.competitiveLandscape,
      keyMessages: client.keyMessages,
      toneOfVoice: client.toneOfVoice,
      operationalDetails: client.operationalDetails,
      objectionHandling: client.objectionHandling,
      brandIdentityNotes: client.brandIdentityNotes,
      strategicPriorities: client.strategicPriorities,
      competitors: [...client.competitors],
      knowledgeAssets: [...client.knowledgeAssets],
      notes: client.notes,
    })
    setAssetDraft(EMPTY_ASSET)
    setIsEditorOpen(true)
  }

  const clientCampaigns = (clientId: string) => campaigns.filter((campaign) => campaign.clientId === clientId)
  const clientAgents = (clientId: string) => {
    const agentIds = clientCampaigns(clientId).flatMap((campaign) => campaign.agents)
    return agents.filter((agent) => agentIds.includes(agent.id))
  }

  const activeClientAgents = useMemo(() => {
    if (!selectedClient) return []
    return clientAgents(selectedClient.id)
  }, [selectedClient, campaigns, agents])

  const clientArtifacts = useMemo(() => {
    if (!selectedClient) return []
    return artifacts.filter((artifact) => artifact.clientId === selectedClient.id)
  }, [selectedClient, artifacts])

  const handleSave = () => {
    if (!editingClient) return
    if (!editingClient.name.trim()) {
      toast.error('Client name is required')
      return
    }
    if (!editingClient.industry.trim()) {
      toast.error('Industry is required')
      return
    }
    if (!editingClient.missionStatement.trim()) {
      toast.error('Mission statement is required')
      return
    }

    if (selectedClient && selectedId) {
      updateClient(selectedClient.id, editingClient)
      toast.success(`${editingClient.name} updated`)
    } else {
      addClient(editingClient)
      toast.success(`${editingClient.name} added`)
    }
    setIsEditorOpen(false)
    setEditingClient(null)
  }

  const handleDelete = (id: string) => {
    const client = clients.find((item) => item.id === id)
    deleteClient(id)
    if (selectedId === id) setSelectedId(null)
    toast.success(`${client?.name || 'Client'} removed`)
    setConfirmDelete(null)
  }

  const addCompetitor = () => {
    if (!competitorInput.trim() || !editingClient) return
    if (!editingClient.competitors.includes(competitorInput.trim())) {
      setEditingClient({ ...editingClient, competitors: [...editingClient.competitors, competitorInput.trim()] })
    }
    setCompetitorInput('')
  }

  const removeCompetitor = (competitor: string) => {
    if (!editingClient) return
    setEditingClient({ ...editingClient, competitors: editingClient.competitors.filter((item) => item !== competitor) })
  }

  const addKnowledgeAsset = () => {
    if (!editingClient) return
    if (!assetDraft.title.trim()) {
      toast.error('Knowledge asset title is required')
      return
    }
    const asset: KnowledgeAsset = {
      ...assetDraft,
      id: `${assetDraft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      lastReviewedAt: new Date().toISOString(),
    }
    setEditingClient({ ...editingClient, knowledgeAssets: [...editingClient.knowledgeAssets, asset] })
    setAssetDraft(EMPTY_ASSET)
  }

  const removeKnowledgeAsset = (id: string) => {
    if (!editingClient) return
    setEditingClient({ ...editingClient, knowledgeAssets: editingClient.knowledgeAssets.filter((asset) => asset.id !== id) })
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
              <Users size={20} className="text-accent-yellow" />
              Clients
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Strategic client briefs and knowledge hubs for the agency
            </p>
          </div>
          <Button variant="primary" onClick={openNew}>
            <Plus size={14} /> New Client
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r border-border overflow-y-auto flex-shrink-0 p-4 space-y-2">
            {clients.map((client) => {
              const industryColor = getIndustryColor(client.industry)
              const isSelected = selectedId === client.id
              const activeCampaignCount = clientCampaigns(client.id).filter((campaign) => campaign.status === 'active').length
              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedId(client.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? 'border-border-glow bg-card' : 'border-border bg-panel hover:border-border-glow'
                  }`}
                  style={isSelected ? { boxShadow: `0 0 0 1px ${industryColor}40` } : {}}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-heading font-semibold text-text-primary">{client.name}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">{client.industry}</p>
                    </div>
                    {activeCampaignCount > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: `${industryColor}20`, color: industryColor }}>
                        {activeCampaignCount} active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-dim mt-2 line-clamp-3">{client.brandPromise || client.description}</p>
                </div>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!selectedClient ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent-yellow/10 flex items-center justify-center mb-4">
                  <Users size={28} className="text-accent-yellow" />
                </div>
                <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">Select a client</h3>
                <p className="text-xs text-text-secondary max-w-[280px]">Choose a client to see the strategic brief, messaging backbone, and knowledge assets.</p>
              </div>
            ) : (
              <div className="max-w-5xl space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-heading font-bold text-text-primary">{selectedClient.name}</h2>
                      <Badge color={getIndustryColor(selectedClient.industry)} size="md">{selectedClient.industry}</Badge>
                    </div>
                    {selectedClient.website && (
                      <a href={selectedClient.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline mt-1">
                        <Globe size={11} /> {selectedClient.website.replace(/https?:\/\//, '')}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(selectedClient)}>Edit Brief</Button>
                    <Button variant="danger" size="sm" onClick={() => setConfirmDelete(selectedClient.id)}>
                      <Trash2 size={12} /> Remove
                    </Button>
                  </div>
                </div>

                <Card>
                  <h3 className="text-xs font-mono text-text-dim uppercase mb-2">Company Overview</h3>
                  <p className="text-sm text-text-primary leading-relaxed">{selectedClient.description}</p>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-accent-purple" />
                      <h3 className="text-xs font-mono text-text-dim uppercase">Mission & Philosophy</h3>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed">{selectedClient.missionStatement}</p>
                  </Card>
                  <Card>
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck size={14} className="text-accent-cyan" />
                      <h3 className="text-xs font-mono text-text-dim uppercase">Brand Promise</h3>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed">{selectedClient.brandPromise}</p>
                  </Card>
                  <Card>
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={14} className="text-accent-pink" />
                      <h3 className="text-xs font-mono text-text-dim uppercase">Target Audiences</h3>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed">{selectedClient.targetAudiences}</p>
                  </Card>
                  <Card>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen size={14} className="text-accent-cyan" />
                      <h3 className="text-xs font-mono text-text-dim uppercase">Tone of Voice</h3>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed">{selectedClient.toneOfVoice}</p>
                  </Card>
                </div>

                <Card>
                  <h3 className="text-xs font-mono text-text-dim uppercase mb-2">Products & Services</h3>
                  <p className="text-sm text-text-primary leading-relaxed">{selectedClient.productsAndServices}</p>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <h3 className="text-xs font-mono text-text-dim uppercase mb-2">Unique Selling Proposition</h3>
                    <p className="text-sm text-text-primary leading-relaxed">{selectedClient.usp}</p>
                  </Card>
                  <Card>
                    <h3 className="text-xs font-mono text-text-dim uppercase mb-2">Competitive Landscape</h3>
                    <p className="text-sm text-text-primary leading-relaxed">{selectedClient.competitiveLandscape}</p>
                  </Card>
                </div>

                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquareQuote size={14} className="text-accent-orange" />
                    <h3 className="text-xs font-mono text-text-dim uppercase">Key Messages</h3>
                  </div>
                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{selectedClient.keyMessages}</p>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <h3 className="text-xs font-mono text-text-dim uppercase mb-2">Operational Details</h3>
                    <p className="text-sm text-text-primary leading-relaxed">{selectedClient.operationalDetails}</p>
                  </Card>
                  <Card>
                    <h3 className="text-xs font-mono text-text-dim uppercase mb-2">Objection Handling</h3>
                    <p className="text-sm text-text-primary leading-relaxed">{selectedClient.objectionHandling}</p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <h3 className="text-xs font-mono text-text-dim uppercase mb-2">Brand Identity Notes</h3>
                    <p className="text-sm text-text-primary leading-relaxed">{selectedClient.brandIdentityNotes}</p>
                  </Card>
                  <Card>
                    <h3 className="text-xs font-mono text-text-dim uppercase mb-2">Strategic Priorities</h3>
                    <p className="text-sm text-text-primary leading-relaxed">{selectedClient.strategicPriorities}</p>
                  </Card>
                </div>

                <Card>
                  <h3 className="text-xs font-mono text-text-dim uppercase mb-2">Competitors</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedClient.competitors.map((competitor) => (
                      <span key={competitor} className="text-xs font-mono px-2.5 py-1 rounded-lg bg-base border border-border text-text-secondary">
                        {competitor}
                      </span>
                    ))}
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={14} className="text-accent-orange" />
                    <h3 className="text-xs font-mono text-text-dim uppercase">Outputs & Deliverables</h3>
                  </div>
                  <p className="text-xs text-text-secondary mb-4">
                    This is the real output registry for the client. Iris should only reference work that exists here.
                  </p>
                  <div className="space-y-3">
                    {clientArtifacts.length > 0 ? (
                      clientArtifacts.map((artifact) => (
                        <div key={artifact.id} className="p-4 rounded-xl border border-border bg-base/60">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-text-primary">{artifact.title}</p>
                              <p className="text-[11px] text-text-secondary mt-1">
                                {artifact.deliverableType} · {artifact.format.toUpperCase()}
                              </p>
                              {artifact.path && (
                                <p className="text-[11px] font-mono text-text-dim mt-2 break-all">{artifact.path}</p>
                              )}
                              {artifact.link && (
                                <a href={artifact.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-accent-blue hover:underline mt-2">
                                  Open link <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                            <span className="text-[10px] font-mono uppercase px-2 py-1 rounded-full bg-panel border border-border text-text-secondary">
                              {artifact.status}
                            </span>
                          </div>
                          {artifact.content && (
                            <p className="text-[12px] text-text-primary mt-3 leading-relaxed whitespace-pre-wrap">
                              {artifact.content}
                            </p>
                          )}
                          {artifact.sourcePrompt && (
                            <div className="mt-3 p-3 rounded-lg bg-panel border border-border">
                              <p className="text-[10px] font-mono uppercase text-text-dim mb-2">Execution Prompt</p>
                              <p className="text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed">{artifact.sourcePrompt}</p>
                            </div>
                          )}
                          {artifact.notes && (
                            <p className="text-[11px] text-text-dim mt-3">{artifact.notes}</p>
                          )}
                          {artifact.exports?.length ? (
                            <div className="mt-3 pt-3 border-t border-border space-y-2">
                              <p className="text-[10px] font-mono uppercase text-text-dim">Generated Files</p>
                              {artifact.exports.map((record) => (
                                <a
                                  key={record.id}
                                  href={record.publicUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-accent-blue hover:underline mr-3"
                                >
                                  {record.fileName} <ExternalLink size={10} />
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-xl border border-border bg-base/50">
                        <p className="text-sm text-text-primary">No saved outputs yet.</p>
                        <p className="text-[11px] text-text-dim mt-1">
                          When Iris creates a real in-app draft, it will appear here with its mission and client context.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <LibraryBig size={14} className="text-accent-blue" />
                    <h3 className="text-xs font-mono text-text-dim uppercase">Knowledge Hub</h3>
                  </div>
                  <p className="text-xs text-text-secondary mb-4">
                    This is the right direction. A knowledge hub should become the source-of-truth layer for each client, with docs and PDFs feeding the client brief over time.
                    In this pass, I’m adding structured asset records. The next step would be automated ingestion and extraction.
                  </p>
                  <div className="space-y-3">
                    {selectedClient.knowledgeAssets.map((asset) => (
                      <div key={asset.id} className="p-4 rounded-xl border border-border bg-base/60">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-text-primary">{asset.title}</p>
                            <p className="text-[11px] text-text-secondary mt-1">{asset.summary}</p>
                            {asset.path && (
                              <p className="text-[11px] font-mono text-text-dim mt-2 break-all">{asset.path}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-mono uppercase text-accent-blue">{asset.status}</span>
                        </div>
                        {asset.extractedInsights && (
                          <p className="text-[12px] text-text-primary mt-3 leading-relaxed">{asset.extractedInsights}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                {selectedClient.notes && (
                  <Card>
                    <h3 className="text-xs font-mono text-text-dim uppercase mb-2">Internal Notes</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{selectedClient.notes}</p>
                  </Card>
                )}

                {(clientCampaigns(selectedClient.id).length > 0 || activeClientAgents.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clientCampaigns(selectedClient.id).length > 0 && (
                      <Card>
                        <h3 className="text-xs font-mono text-text-dim uppercase mb-3">Linked Campaigns</h3>
                        <div className="space-y-3">
                          {clientCampaigns(selectedClient.id).map((campaign) => (
                            <div key={campaign.id} className="p-3 rounded-lg bg-base border border-border">
                              <p className="text-sm font-medium text-text-primary">{campaign.name}</p>
                              <p className="text-[11px] text-text-dim mt-1">{campaign.progress}% complete</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                    {activeClientAgents.length > 0 && (
                      <Card>
                        <h3 className="text-xs font-mono text-text-dim uppercase mb-3">Assigned Agency Team</h3>
                        <div className="space-y-2">
                          {activeClientAgents.map((agent) => (
                            <div key={agent.id} className="p-3 rounded-lg bg-base border border-border">
                              <p className="text-sm font-medium text-text-primary">{agent.name}</p>
                              <p className="text-[11px] text-text-secondary">{agent.role}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setEditingClient(null) }}
        title={editingClient && selectedClient ? `Edit ${editingClient.name}` : 'New Client Brief'}
        size="lg"
      >
        {editingClient && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Client Name *" value={editingClient.name} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} />
              <Input label="Industry *" value={editingClient.industry} onChange={(e) => setEditingClient({ ...editingClient, industry: e.target.value })} />
            </div>
            <Input label="Website" value={editingClient.website} onChange={(e) => setEditingClient({ ...editingClient, website: e.target.value })} />
            <Textarea label="Company Overview" value={editingClient.description} onChange={(e) => setEditingClient({ ...editingClient, description: e.target.value })} className="min-h-[90px]" />
            <Textarea label="Mission & Brand Philosophy *" value={editingClient.missionStatement} onChange={(e) => setEditingClient({ ...editingClient, missionStatement: e.target.value })} className="min-h-[90px]" />
            <Textarea label="Brand Promise" value={editingClient.brandPromise} onChange={(e) => setEditingClient({ ...editingClient, brandPromise: e.target.value })} className="min-h-[80px]" />
            <Textarea label="Target Audiences" value={editingClient.targetAudiences} onChange={(e) => setEditingClient({ ...editingClient, targetAudiences: e.target.value })} className="min-h-[80px]" />
            <Textarea label="Products & Services" value={editingClient.productsAndServices} onChange={(e) => setEditingClient({ ...editingClient, productsAndServices: e.target.value })} className="min-h-[100px]" />
            <Textarea label="Unique Selling Proposition" value={editingClient.usp} onChange={(e) => setEditingClient({ ...editingClient, usp: e.target.value })} className="min-h-[90px]" />
            <Textarea label="Competitive Landscape" value={editingClient.competitiveLandscape} onChange={(e) => setEditingClient({ ...editingClient, competitiveLandscape: e.target.value })} className="min-h-[110px]" />
            <Textarea label="Key Messages" value={editingClient.keyMessages} onChange={(e) => setEditingClient({ ...editingClient, keyMessages: e.target.value })} className="min-h-[100px]" />
            <Textarea label="Tone of Voice" value={editingClient.toneOfVoice} onChange={(e) => setEditingClient({ ...editingClient, toneOfVoice: e.target.value })} className="min-h-[90px]" />
            <Textarea label="Operational Details" value={editingClient.operationalDetails} onChange={(e) => setEditingClient({ ...editingClient, operationalDetails: e.target.value })} className="min-h-[90px]" />
            <Textarea label="Objection Handling" value={editingClient.objectionHandling} onChange={(e) => setEditingClient({ ...editingClient, objectionHandling: e.target.value })} className="min-h-[90px]" />
            <Textarea label="Brand Identity Notes" value={editingClient.brandIdentityNotes} onChange={(e) => setEditingClient({ ...editingClient, brandIdentityNotes: e.target.value })} className="min-h-[80px]" />
            <Textarea label="Strategic Priorities" value={editingClient.strategicPriorities} onChange={(e) => setEditingClient({ ...editingClient, strategicPriorities: e.target.value })} className="min-h-[80px]" />

            <div>
              <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Competitors</label>
              <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                {editingClient.competitors.map((competitor) => (
                  <span key={competitor} className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full bg-base border border-border text-text-secondary">
                    {competitor}
                    <button onClick={() => removeCompetitor(competitor)} className="text-text-dim hover:text-red-400 ml-1">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetitor())}
                  placeholder="Add competitor..."
                  className="flex-1 bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-blue"
                />
                <Button variant="secondary" size="sm" onClick={addCompetitor}>Add</Button>
              </div>
            </div>

            <div className="border border-border rounded-2xl p-4 bg-base/50">
              <div className="flex items-center gap-2 mb-3">
                <LibraryBig size={14} className="text-accent-blue" />
                <p className="text-xs font-mono text-text-dim uppercase">Knowledge Hub Assets</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Asset Title" value={assetDraft.title} onChange={(e) => setAssetDraft({ ...assetDraft, title: e.target.value })} />
                <Select label="Type" options={ASSET_TYPE_OPTIONS} value={assetDraft.type} onChange={(e) => setAssetDraft({ ...assetDraft, type: e.target.value as KnowledgeAsset['type'] })} />
              </div>
              <Input label="Path / URL" value={assetDraft.path || ''} onChange={(e) => setAssetDraft({ ...assetDraft, path: e.target.value })} className="mt-3" />
              <Textarea label="Summary" value={assetDraft.summary} onChange={(e) => setAssetDraft({ ...assetDraft, summary: e.target.value })} className="min-h-[70px] mt-3" />
              <Textarea label="Extracted Insights" value={assetDraft.extractedInsights || ''} onChange={(e) => setAssetDraft({ ...assetDraft, extractedInsights: e.target.value })} className="min-h-[70px] mt-3" />
              <Select label="Status" options={ASSET_STATUS_OPTIONS} value={assetDraft.status} onChange={(e) => setAssetDraft({ ...assetDraft, status: e.target.value as KnowledgeAsset['status'] })} />
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={addKnowledgeAsset}>
                  <Plus size={12} /> Add Asset
                </Button>
              </div>
              <div className="space-y-2 mt-4">
                {editingClient.knowledgeAssets.map((asset) => (
                  <div key={asset.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-panel">
                    <div>
                      <p className="text-sm text-text-primary">{asset.title}</p>
                      <p className="text-[11px] text-text-secondary">{asset.summary}</p>
                    </div>
                    <button onClick={() => removeKnowledgeAsset(asset.id)} className="text-text-dim hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Textarea label="Internal Notes" value={editingClient.notes} onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })} className="min-h-[80px]" />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => { setIsEditorOpen(false); setEditingClient(null) }}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>Save Client Brief</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove Client?" size="sm">
        <p className="text-sm text-text-secondary mb-4">This will remove the client profile and unlink it from all campaigns. This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Remove Client</Button>
        </div>
      </Modal>
    </ClientShell>
  )
}
