'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ClientShell } from '@/components/ClientShell'
import { usePipelinesStore, Pipeline, Phase, Activity, ClientProfileField } from '@/lib/stores/pipelines-store'
import { ArrowLeft, Save, Plus, Trash2, X, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { clsx } from 'clsx'

const ROLE_OPTIONS = [
  'client-services', 'brand-strategist', 'creative-director', 'copy', 'visual-producer',
  'media-planner', 'performance', 'content-strategist', 'traffic-manager', 'seo-specialist', 'research'
]

const FIELD_TYPES = ['text', 'textarea', 'select', 'multiselect', 'checkbox', 'json'] as const
const DEFAULT_ACTIVITY: Partial<Activity> = {
  id: '',
  name: '',
  description: '',
  assignedRole: 'copy',
  inputs: [],
  outputs: [],
  checklist: [],
  prompts: { en: '' },
}

const DEFAULT_PHASE: Partial<Phase> = {
  id: '',
  name: '',
  color: '#9b6dff',
  activities: [],
}

const PHASE_COLORS = ['#4f8ef7', '#9b6dff', '#00d4aa', '#ffd166', '#ff5fa0', '#38bdf8', '#a78bfa', '#f97316', '#22c55e']

export default function PipelineEditPage() {
  const router = useRouter()
  const params = useParams()
  const pipelineId = params.id as string
  const isNew = pipelineId === 'new'

  const pipelines = usePipelinesStore(s => s.pipelines)
  const isLoaded = usePipelinesStore(s => s.isLoaded)
  const loadPipelines = usePipelinesStore(s => s.loadPipelines)
  const addPipeline = usePipelinesStore(s => s.addPipeline)
  const updatePipeline = usePipelinesStore(s => s.updatePipeline)

  const [form, setForm] = useState<Partial<Pipeline>>({
    id: '',
    name: '',
    description: '',
    version: '1.0',
    isDefault: true,
    estimatedDuration: '7 days',
    clientProfileFields: [],
    phases: [],
  })
  const [saved, setSaved] = useState(false)
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0]))
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set())

  useEffect(() => { loadPipelines() }, [loadPipelines])

  useEffect(() => {
    if (!isNew && isLoaded) {
      const existing = pipelines.find(p => p.id === pipelineId)
      if (existing) setForm(existing)
    }
  }, [isNew, isLoaded, pipelineId, pipelines])

  const handleSave = () => {
    if (!form.name?.trim() || !form.id?.trim()) return
    if (isNew) {
      addPipeline(form as Pipeline)
    } else {
      updatePipeline(pipelineId, form)
    }
    setSaved(true)
    setTimeout(() => { setSaved(false); router.push('/pipeline') }, 800)
  }

  const generateId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const togglePhase = (i: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const addPhase = () => {
    const phases = [...(form.phases || [])]
    const newPhase: Phase = {
      id: generateId(`phase-${phases.length + 1}`),
      name: `Phase ${phases.length + 1}`,
      color: PHASE_COLORS[phases.length % PHASE_COLORS.length],
      activities: [],
    }
    setForm(prev => ({ ...prev, phases: [...phases, newPhase] }))
    setExpandedPhases(prev => { const next = new Set(prev); next.add(phases.length); return next })
  }

  const updatePhase = (i: number, updates: Partial<Phase>) => {
    setForm(prev => ({
      ...prev,
      phases: prev.phases?.map((p, idx) => idx === i ? { ...p, ...updates } : p)
    }))
  }

  const removePhase = (i: number) => {
    setForm(prev => ({
      ...prev,
      phases: prev.phases?.filter((_, idx) => idx !== i)
    }))
  }

  const addActivity = (phaseIdx: number) => {
    const phases = [...(form.phases || [])]
    const newActivity: Activity = {
      id: generateId(`activity-${Date.now()}`),
      name: 'New Activity',
      description: '',
      assignedRole: 'copy',
      inputs: [],
      outputs: [],
      checklist: [],
      prompts: { en: '' },
    }
    phases[phaseIdx].activities.push(newActivity)
    setForm(prev => ({ ...prev, phases }))
    setExpandedActivities(prev => { const next = new Set(prev); next.add(newActivity.id); return next })
  }

  const updateActivity = (phaseIdx: number, actIdx: number, updates: Partial<Activity>) => {
    setForm(prev => ({
      ...prev,
      phases: prev.phases?.map((p, pi) =>
        pi === phaseIdx
          ? { ...p, activities: p.activities.map((a, ai) => ai === actIdx ? { ...a, ...updates } : a) }
          : p
      )
    }))
  }

  const removeActivity = (phaseIdx: number, actIdx: number) => {
    setForm(prev => ({
      ...prev,
      phases: prev.phases?.map((p, pi) =>
        pi === phaseIdx
          ? { ...p, activities: p.activities.filter((_, ai) => ai !== actIdx) }
          : p
      )
    }))
  }

  const addClientProfileField = () => {
    setForm(prev => ({
      ...prev,
      clientProfileFields: [...(prev.clientProfileFields || []), {
        id: generateId(`field-${Date.now()}`),
        label: 'New Field',
        type: 'text',
        required: false,
      }]
    }))
  }

  const updateClientProfileField = (i: number, updates: Partial<ClientProfileField>) => {
    setForm(prev => ({
      ...prev,
      clientProfileFields: prev.clientProfileFields?.map((f, idx) => idx === i ? { ...f, ...updates } : f)
    }))
  }

  const removeClientProfileField = (i: number) => {
    setForm(prev => ({
      ...prev,
      clientProfileFields: prev.clientProfileFields?.filter((_, idx) => idx !== i)
    }))
  }

  const activityCount = (form.phases || []).reduce((sum, p) => sum + p.activities.length, 0)

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/pipeline')} className="p-2 rounded-lg border border-[var(--border)] hover:border-[var(--border-glow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {isNew ? 'New Pipeline' : `Edit: ${form.name || pipelineId}`}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                {isNew ? 'Create a new multi-phase workflow pipeline' : `Pipeline · ${activityCount} activities across ${(form.phases || []).length} phases`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!form.name?.trim() || !form.id?.trim()}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all',
                form.name?.trim() && form.id?.trim()
                  ? 'bg-accent-purple text-white hover:bg-accent-purple/80'
                  : 'bg-[#1a1d26] text-gray-500 cursor-not-allowed'
              )}
            >
              <Save size={16} />
              {saved ? 'Saved!' : 'Save Pipeline'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl space-y-8">
            {/* Basic Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Basic Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Pipeline Name *</label>
                  <input type="text" value={form.name || ''} onChange={e => {
                    const name = e.target.value
                    setForm(prev => ({ ...prev, name, id: prev.id || generateId(name) }))
                  }} placeholder="e.g., Content Calendar Pipeline" className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Pipeline ID *</label>
                  <input type="text" value={form.id || ''} onChange={e => setForm(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="e.g., content-calendar" className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                <textarea value={form.description || ''} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={2} placeholder="Describe what this pipeline does..." className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Version</label>
                  <input type="text" value={form.version || '1.0'} onChange={e => setForm(prev => ({ ...prev, version: e.target.value }))} className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white outline-none focus:border-accent-purple font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Estimated Duration</label>
                  <input type="text" value={form.estimatedDuration || ''} onChange={e => setForm(prev => ({ ...prev, estimatedDuration: e.target.value }))} placeholder="e.g., 7-10 days" className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-400 mt-7">
                    <input type="checkbox" checked={form.isDefault || false} onChange={e => setForm(prev => ({ ...prev, isDefault: e.target.checked }))} className="rounded" />
                    Default Pipeline
                  </label>
                </div>
              </div>
            </section>

            {/* Client Profile Fields */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Client Profile Fields</h3>
                  <p className="text-xs text-gray-600 mt-1">Fields to collect from the client before running the pipeline</p>
                </div>
                <button onClick={addClientProfileField} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple/10 text-accent-purple rounded-lg text-xs hover:bg-accent-purple/20 transition-colors">
                  <Plus size={14} /> Add Field
                </button>
              </div>
              <div className="space-y-2">
                {(form.clientProfileFields || []).map((field, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#1a1d26] rounded-lg border border-[#2a2d38]">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <input type="text" value={field.label} onChange={e => updateClientProfileField(i, { label: e.target.value, id: field.id || generateId(e.target.value) })} placeholder="Field label" className="px-2 py-1.5 bg-[#12141a] border border-[#2a2d38] rounded text-xs text-white outline-none focus:border-accent-purple" />
                      <select value={field.type} onChange={e => updateClientProfileField(i, { type: e.target.value as any })} className="px-2 py-1.5 bg-[#12141a] border border-[#2a2d38] rounded text-xs text-white outline-none">
                        {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input type="text" value={field.options?.join(', ') || ''} onChange={e => updateClientProfileField(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Options (comma-sep)" className="px-2 py-1.5 bg-[#12141a] border border-[#2a2d38] rounded text-xs text-white outline-none focus:border-accent-purple" />
                      <label className="flex items-center gap-1.5 text-xs text-gray-400">
                        <input type="checkbox" checked={field.required} onChange={e => updateClientProfileField(i, { required: e.target.checked })} className="rounded" />
                        Required
                      </label>
                    </div>
                    <button onClick={() => removeClientProfileField(i)} className="text-gray-500 hover:text-red-400 transition-colors"><X size={14} /></button>
                  </div>
                ))}
                {(form.clientProfileFields || []).length === 0 && (
                  <p className="text-xs text-gray-600 italic py-2">No client profile fields defined. Click "Add Field" to collect client data.</p>
                )}
              </div>
            </section>

            {/* Phases */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Pipeline Phases</h3>
                  <p className="text-xs text-gray-600 mt-1">{activityCount} activities across {(form.phases || []).length} phases</p>
                </div>
                <button onClick={addPhase} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple/10 text-accent-purple rounded-lg text-xs hover:bg-accent-purple/20 transition-colors">
                  <Plus size={14} /> Add Phase
                </button>
              </div>
              <div className="space-y-4">
                {(form.phases || []).map((phase, pi) => {
                  const isExpanded = expandedPhases.has(pi)
                  return (
                    <div key={pi} className="border border-[#2a2d38] rounded-xl overflow-hidden">
                      {/* Phase Header */}
                      <div
                        className="px-5 py-4 bg-[#1a1d26] flex items-center gap-3 cursor-pointer hover:bg-[#1f2230] transition-colors"
                        onClick={() => togglePhase(pi)}
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: phase.color }} />
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={phase.name}
                            onChange={e => { e.stopPropagation(); updatePhase(pi, { name: e.target.value, id: phase.id || generateId(e.target.value) }) }}
                            onClick={e => e.stopPropagation()}
                            placeholder="Phase name"
                            className="px-2 py-1.5 bg-[#12141a] border border-[#2a2d38] rounded text-sm text-white outline-none focus:border-accent-purple"
                          />
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500">Color:</label>
                            <input
                              type="color"
                              value={phase.color}
                              onChange={e => { e.stopPropagation(); updatePhase(pi, { color: e.target.value }) }}
                              onClick={e => e.stopPropagation()}
                              className="w-8 h-8 rounded cursor-pointer border-0"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{phase.activities.length} activities</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); addActivity(pi) }}
                            className="p-1.5 rounded hover:bg-[#2a2d38] text-gray-500 hover:text-white transition-colors"
                            title="Add activity"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); removePhase(pi) }}
                            className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                            title="Remove phase"
                          >
                            <Trash2 size={14} />
                          </button>
                          {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                        </div>
                      </div>

                      {/* Activities */}
                      {isExpanded && (
                        <div className="divide-y divide-[#2a2d38]">
                          {phase.activities.length === 0 && (
                            <div className="px-5 py-6 text-center text-xs text-gray-600">
                              No activities yet. Click + to add one.
                            </div>
                          )}
                          {phase.activities.map((activity, ai) => (
                            <ActivityEditor
                              key={ai}
                              activity={activity}
                              phaseColor={phase.color}
                              onUpdate={updates => updateActivity(pi, ai, updates)}
                              onRemove={() => removeActivity(pi, ai)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {(form.phases || []).length === 0 && (
                  <div className="border border-dashed border-[#2a2d38] rounded-xl p-8 text-center">
                    <p className="text-gray-500 text-sm">No phases yet</p>
                    <button onClick={addPhase} className="mt-3 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm hover:bg-accent-purple/80">
                      Add First Phase
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}

function ActivityEditor({ activity, phaseColor, onUpdate, onRemove }: {
  activity: Activity
  phaseColor: string
  onUpdate: (updates: Partial<Activity>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const addChecklist = () => {
    onUpdate({ checklist: [...(activity.checklist || []), 'New step'] })
  }

  return (
    <div className="bg-[#12141a]">
      <div className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#1a1d26] transition-colors" onClick={() => setExpanded(!expanded)}>
        <GripVertical size={14} className="text-gray-600 flex-shrink-0" />
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: phaseColor }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{activity.name}</p>
          <p className="text-xs text-gray-500 truncate">{activity.description || 'No description'}</p>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: phaseColor + '20', color: phaseColor }}>
          {activity.assignedRole}
        </span>
        {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </div>

      {expanded && (
        <div className="px-5 py-4 space-y-4 border-t border-[#2a2d38]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Activity Name</label>
              <input type="text" value={activity.name} onChange={e => onUpdate({ name: e.target.value, id: activity.id || generateId(e.target.value) })} className="w-full px-2 py-1.5 bg-[#1a1d26] border border-[#2a2d38] rounded text-xs text-white outline-none focus:border-accent-purple" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Assigned Role</label>
              <select value={activity.assignedRole} onChange={e => onUpdate({ assignedRole: e.target.value })} className="w-full px-2 py-1.5 bg-[#1a1d26] border border-[#2a2d38] rounded text-xs text-white outline-none">
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <input type="text" value={activity.description} onChange={e => onUpdate({ description: e.target.value })} className="w-full px-2 py-1.5 bg-[#1a1d26] border border-[#2a2d38] rounded text-xs text-white outline-none focus:border-accent-purple" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Inputs (comma-sep)</label>
              <input type="text" value={(activity.inputs || []).join(', ')} onChange={e => onUpdate({ inputs: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full px-2 py-1.5 bg-[#1a1d26] border border-[#2a2d38] rounded text-xs text-white outline-none focus:border-accent-purple" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Outputs (comma-sep)</label>
              <input type="text" value={(activity.outputs || []).join(', ')} onChange={e => onUpdate({ outputs: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full px-2 py-1.5 bg-[#1a1d26] border border-[#2a2d38] rounded text-xs text-white outline-none focus:border-accent-purple" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">English Prompt</label>
            <textarea value={activity.prompts?.en || ''} onChange={e => onUpdate({ prompts: { en: e.target.value, ar: activity.prompts?.ar } })} rows={4} placeholder="Use {{variable}} for client data injection..." className="w-full px-2 py-1.5 bg-[#1a1d26] border border-[#2a2d38] rounded text-xs text-white outline-none focus:border-accent-purple resize-none font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Arabic Prompt (optional)</label>
            <textarea value={activity.prompts?.ar || ''} onChange={e => onUpdate({ prompts: { en: activity.prompts?.en || '', ar: e.target.value } })} rows={4} dir="rtl" className="w-full px-2 py-1.5 bg-[#1a1d26] border border-[#2a2d38] rounded text-xs text-white outline-none focus:border-accent-purple resize-none font-mono" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-400">Checklist</label>
              <button onClick={addChecklist} className="text-xs text-accent-purple hover:text-accent-purple/80">+ Add Step</button>
            </div>
            <div className="space-y-1">
              {(activity.checklist || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded border border-[#2a2d38] flex items-center justify-center text-[9px] text-gray-600 flex-shrink-0">{i + 1}</span>
                  <input type="text" value={item} onChange={e => {
                    const checklist = [...(activity.checklist || [])]
                    checklist[i] = e.target.value
                    onUpdate({ checklist })
                  }} className="flex-1 px-2 py-1 bg-[#1a1d26] border border-[#2a2d38] rounded text-xs text-white outline-none focus:border-accent-purple" />
                  <button onClick={() => onUpdate({ checklist: activity.checklist?.filter((_, j) => j !== i) })} className="text-gray-600 hover:text-red-400"><X size={12} /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={onRemove} className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-xs transition-colors">
              <Trash2 size={12} /> Remove Activity
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function generateId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
