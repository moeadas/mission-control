'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ClientShell } from '@/components/ClientShell'
import { useSkillsStore, SkillDefinition } from '@/lib/stores/skills-store'
import { ArrowLeft, Save, Trash2, Plus, X } from 'lucide-react'
import { clsx } from 'clsx'

const CATEGORIES = [
  { id: 'strategy', name: 'Strategy & Planning' },
  { id: 'creative', name: 'Creative & Copy' },
  { id: 'project-management', name: 'Project & Traffic Management' },
  { id: 'media', name: 'Media & Advertising' },
  { id: 'research', name: 'Research & Insights' },
  { id: 'client-services', name: 'Client Services & Account Management' },
  { id: 'operations', name: 'Operations & Productivity' },
]

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const

const DEFAULT_SKILL: Partial<SkillDefinition> = {
  id: '',
  name: '',
  description: '',
  category: 'strategy',
  prompts: { en: '' },
  variables: [],
  inputs: [],
  outputs: [],
  checklist: [],
  metadata: { version: '1.0', difficulty: 'intermediate' },
}

export default function SkillEditPage() {
  const router = useRouter()
  const params = useParams()
  const skillId = params.id as string
  const isNew = skillId === 'new'

  const skillsMap = useSkillsStore(s => s.skillsMap)
  const isLoaded = useSkillsStore(s => s.isLoaded)
  const loadSkills = useSkillsStore(s => s.loadSkills)
  const addSkill = useSkillsStore(s => s.addSkill)
  const updateSkill = useSkillsStore(s => s.updateSkill)
  const deleteSkill = useSkillsStore(s => s.deleteSkill)

  const [form, setForm] = useState<Partial<SkillDefinition>>(DEFAULT_SKILL)
  const [newVariable, setNewVariable] = useState('')
  const [newInput, setNewInput] = useState('')
  const [newOutput, setNewOutput] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadSkills() }, [loadSkills])

  useEffect(() => {
    if (!isNew && isLoaded) {
      const existing = skillsMap[skillId]
      if (existing) setForm(existing)
    }
  }, [isNew, isLoaded, skillId, skillsMap])

  const handleSave = () => {
    if (!form.name?.trim() || !form.id?.trim()) return
    if (isNew) {
      addSkill(form as SkillDefinition)
    } else {
      updateSkill(skillId, form)
    }
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      router.push('/skills')
    }, 800)
  }

  const handleDelete = () => {
    if (confirm('Delete this skill? This cannot be undone.')) {
      deleteSkill(skillId)
      router.push('/skills')
    }
  }

  const addVariable = () => {
    const v = newVariable.trim().replace(/\{\{|\}\}/g, '')
    if (!v) return
    setForm(prev => ({
      ...prev,
      variables: [...(prev.variables || []), v]
    }))
    setNewVariable('')
  }

  const removeVariable = (v: string) => {
    setForm(prev => ({
      ...prev,
      variables: (prev.variables || []).filter(x => x !== v)
    }))
  }

  const addInput = () => {
    const v = newInput.trim()
    if (!v) return
    setForm(prev => ({
      ...prev,
      inputs: [...(prev.inputs || []), v]
    }))
    setNewInput('')
  }

  const addOutput = () => {
    const v = newOutput.trim()
    if (!v) return
    setForm(prev => ({
      ...prev,
      outputs: [...(prev.outputs || []), v]
    }))
    setNewOutput('')
  }

  const addChecklistItem = () => {
    const v = newChecklistItem.trim()
    if (!v) return
    setForm(prev => ({
      ...prev,
      checklist: [...(prev.checklist || []), v]
    }))
    setNewChecklistItem('')
  }

  const generateId = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d38] flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/skills')}
              className="p-2 rounded-lg hover:bg-[#1a1d26] text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">
                {isNew ? 'New Skill' : `Edit: ${form.name || skillId}`}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {isNew ? 'Create a new reusable skill' : `Skill ID: ${skillId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isNew && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
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
              {saved ? 'Saved!' : 'Save Skill'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl space-y-8">
            {/* Basic Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Basic Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Skill Name *</label>
                  <input
                    type="text"
                    value={form.name || ''}
                    onChange={e => {
                      const name = e.target.value
                      setForm(prev => ({
                        ...prev,
                        name,
                        id: prev.id || generateId(name),
                      }))
                    }}
                    placeholder="e.g., Brand Strategy Development"
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Skill ID *</label>
                  <input
                    type="text"
                    value={form.id || ''}
                    onChange={e => setForm(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                    placeholder="e.g., brand-strategy"
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple font-mono"
                  />
                  <p className="text-[10px] text-gray-600 mt-1">Lowercase, hyphenated. Used to reference this skill.</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  value={form.description || ''}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Brief description of what this skill does..."
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                  <select
                    value={form.category || 'strategy'}
                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white outline-none focus:border-accent-purple"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Difficulty</label>
                  <select
                    value={form.metadata?.difficulty || 'intermediate'}
                    onChange={e => setForm(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, difficulty: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white outline-none focus:border-accent-purple"
                  >
                    {DIFFICULTIES.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Prompts */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Execution Prompts</h3>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  English Prompt <span className="text-accent-purple">*</span>
                </label>
                <textarea
                  value={form.prompts?.en || ''}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    prompts: { ...prev.prompts, en: e.target.value }
                  }))}
                  rows={8}
                  placeholder="The main prompt that will be injected and executed when this skill is called. Use {{variable}} placeholders..."
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple resize-none font-mono"
                />
                <p className="text-[10px] text-gray-600 mt-1">
                  Variables: Use {'{{variableName}}'} — these are auto-detected from the prompt text.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Arabic Prompt <span className="text-gray-600">(optional)</span>
                </label>
                <textarea
                  value={form.prompts?.ar || ''}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    prompts: { ...prev.prompts, ar: e.target.value }
                  }))}
                  rows={8}
                  placeholder="المطلب الرئيسي الذي سيتم حقنه وتنفيذه عند استدعاء هذه المهارة..."
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple resize-none font-mono"
                  dir="rtl"
                />
              </div>
            </section>

            {/* Variables */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Variables</h3>
              <div className="flex flex-wrap gap-2">
                {(form.variables || []).map(v => (
                  <span key={v} className="px-3 py-1 bg-accent-purple/10 text-accent-purple rounded-lg text-sm font-mono flex items-center gap-1.5">
                    {`{{${v}}}`}
                    <button onClick={() => removeVariable(v)} className="hover:text-red-400 transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newVariable}
                  onChange={e => setNewVariable(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addVariable()}
                  placeholder="Variable name (e.g., brand_name)"
                  className="flex-1 px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple"
                />
                <button onClick={addVariable} className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm hover:bg-accent-purple/80">
                  <Plus size={16} />
                </button>
              </div>
            </section>

            {/* Inputs & Outputs */}
            <section className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Inputs</h3>
                <div className="space-y-1.5">
                  {(form.inputs || []).map((inp, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d26] rounded text-sm text-white">
                      <span className="flex-1 truncate">{inp}</span>
                      <button onClick={() => setForm(prev => ({ ...prev, inputs: prev.inputs?.filter((_, j) => j !== i) }))} className="text-gray-500 hover:text-red-400">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newInput} onChange={e => setNewInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addInput()} placeholder="Input name..." className="flex-1 px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple" />
                  <button onClick={addInput} className="px-3 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80"><Plus size={16} /></button>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Outputs</h3>
                <div className="space-y-1.5">
                  {(form.outputs || []).map((out, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d26] rounded text-sm text-white">
                      <span className="flex-1 truncate">{out}</span>
                      <button onClick={() => setForm(prev => ({ ...prev, outputs: prev.outputs?.filter((_, j) => j !== i) }))} className="text-gray-500 hover:text-red-400">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newOutput} onChange={e => setNewOutput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOutput()} placeholder="Output name..." className="flex-1 px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple" />
                  <button onClick={addOutput} className="px-3 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80"><Plus size={16} /></button>
                </div>
              </div>
            </section>

            {/* Checklist */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Checklist</h3>
              <p className="text-xs text-gray-600">Step-by-step actions the agent takes when executing this skill.</p>
              <div className="space-y-1.5">
                {(form.checklist || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[#1a1d26] rounded text-sm text-white border border-[#2a2d38]">
                    <span className="w-5 h-5 rounded border border-[#3a3d48] flex items-center justify-center text-[10px] text-gray-500 flex-shrink-0">{i + 1}</span>
                    <span className="flex-1">{item}</span>
                    <button onClick={() => setForm(prev => ({ ...prev, checklist: prev.checklist?.filter((_, j) => j !== i) }))} className="text-gray-500 hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklistItem()} placeholder="Add a checklist step..." className="flex-1 px-3 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-accent-purple" />
                <button onClick={addChecklistItem} className="px-3 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80"><Plus size={16} /></button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
