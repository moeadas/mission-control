'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { Agent, AgentSpecialty, AgentModel, AgencyDivision, DeliverableType } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Slider } from '@/components/ui/Slider'
import { AgentBot } from './AgentBot'
import { toast } from '@/components/ui/Toast'
import { AGENT_TEMPLATES } from '@/lib/agent-templates'
import { DELIVERABLE_LABELS, DIVISION_LABELS, SPECIALTY_LABELS, TOOL_OPTIONS } from '@/lib/bot-animations'
import { useAgentsStore } from '@/lib/agents-store'
import { getProviderModels, PROVIDER_OPTIONS } from '@/lib/providers'

const AVATARS = [
  { id: 'bot-purple', color: '#9b6dff' },
  { id: 'bot-cyan', color: '#00d4aa' },
  { id: 'bot-orange', color: '#ff7c42' },
  { id: 'bot-pink', color: '#ff5fa0' },
  { id: 'bot-yellow', color: '#ffd166' },
  { id: 'bot-blue', color: '#4f8ef7' },
]

const SPECIALTY_OPTIONS = Object.entries(SPECIALTY_LABELS).map(([v, l]) => ({ value: v, label: l }))
const DIVISION_OPTIONS = Object.entries(DIVISION_LABELS)
  .filter(([value]) => value !== 'orchestration')
  .map(([value, label]) => ({ value, label }))
const OUTPUT_OPTIONS = Object.entries(DELIVERABLE_LABELS).map(([value, label]) => ({ value, label }))

const SPECIALTY_AVATAR_MAP: Record<AgentSpecialty, typeof AVATARS[number]> = {
  strategy: AVATARS[0],
  creative: AVATARS[1],
  design: AVATARS[2],
  copy: AVATARS[4],
  'project-management': AVATARS[4],
  'client-services': AVATARS[5],
  client: AVATARS[5],
  'media-planning': AVATARS[3],
  performance: AVATARS[5],
  seo: AVATARS[5],
  research: AVATARS[5],
}

const EMPTY_AGENT = {
  name: '',
  role: '',
  division: 'creative' as AgencyDivision,
  specialty: 'creative' as AgentSpecialty,
  unit: 'creative' as AgencyDivision,
  color: '#9b6dff',
  accentColor: 'purple',
  avatar: 'bot-purple',
  systemPrompt: '',
  provider: 'ollama' as const,
  model: 'llama3.2:latest' as AgentModel,
  temperature: 0.7,
  maxTokens: 1024,
  tools: [] as string[],
  skills: [] as string[],
  responsibilities: [] as string[],
  primaryOutputs: ['campaign-copy'] as DeliverableType[],
  status: 'active' as const,
  currentTask: '',
  lastActive: undefined as string | undefined,
  workload: 40,
  position: { x: 300, y: 300, room: 'creative' },
  bio: '',
}

interface AgentEditorProps {
  agentId?: string | null
  isOpen: boolean
  onClose: () => void
}

export function AgentEditor({ agentId, isOpen, onClose }: AgentEditorProps) {
  const agents = useAgentsStore((state) => state.agents)
  const createAgent = useAgentsStore((state) => state.createAgent)
  const updateAgent = useAgentsStore((state) => state.updateAgent)
  const existing = agents.find((a) => a.id === agentId)

  const [form, setForm] = useState<Omit<Agent, 'id'>>(EMPTY_AGENT)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (existing) {
      setForm({
        ...EMPTY_AGENT,
        ...existing,
        tools: Array.isArray(existing.tools) ? existing.tools : [],
        skills: Array.isArray(existing.skills) ? existing.skills : [],
        responsibilities: Array.isArray(existing.responsibilities) ? existing.responsibilities : [],
        primaryOutputs: Array.isArray(existing.primaryOutputs) && existing.primaryOutputs.length
          ? existing.primaryOutputs
          : EMPTY_AGENT.primaryOutputs,
      })
    } else {
      setForm({ ...EMPTY_AGENT })
    }
    setErrors({})
  }, [existing, agentId])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.role.trim()) errs.role = 'Role is required'
    if (!form.systemPrompt.trim() || form.systemPrompt.length < 50)
      errs.systemPrompt = 'Prompt must be at least 50 characters'
    return errs
  }

  const handleSave = () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    if (existing) {
      updateAgent(existing.id, form)
      toast.success(`${form.name} updated`)
    } else {
      createAgent({ ...form, lastActive: new Date().toISOString() })
      toast.success(`${form.name} joined the agency!`)
    }
    onClose()
  }

  const applyTemplate = (templateId: string) => {
    const tpl = AGENT_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    setForm((f) => ({
      ...f,
      role: tpl.role,
      division: tpl.division,
      specialty: tpl.specialty,
      unit: tpl.unit,
      color: tpl.color,
      accentColor: tpl.accentColor,
      avatar: tpl.avatar,
      systemPrompt: tpl.systemPrompt,
      provider: tpl.provider,
      model: tpl.model,
      temperature: tpl.temperature,
      maxTokens: tpl.maxTokens,
      tools: tpl.tools,
      skills: tpl.skills,
      responsibilities: tpl.responsibilities,
      primaryOutputs: tpl.primaryOutputs,
      bio: tpl.bio,
    }))
    toast.info('Template applied')
  }

  const toggleTool = (tool: string) => {
    setForm((f) => ({
      ...f,
      tools: f.tools.includes(tool)
        ? f.tools.filter((t) => t !== tool)
        : [...f.tools, tool],
    }))
  }

  const modelOptions = getProviderModels(form.provider).map((option) => ({ value: option.id, label: option.label }))

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-panel border-l border-border z-50 flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <AgentBot
              name={form.name || 'Preview'}
              avatar={form.avatar}
              color={form.color}
              status={form.status}
              size={40}
            />
            <div>
              <h2 className="text-base font-heading font-semibold text-text-primary">
                {existing ? `Edit ${existing.name}` : 'New Agent'}
              </h2>
              <p className="text-xs text-text-dim font-mono">
                {existing ? 'Update configuration' : 'Create a new team member'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity */}
          <section>
            <h3 className="text-xs font-mono text-text-dim uppercase tracking-wider mb-4">
              Identity
            </h3>
            <div className="space-y-4">
              <Input
                label="Name"
                placeholder="e.g. Nova"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                error={errors.name}
              />
              <Input
                label="Role / Title"
                placeholder="e.g. Media Planning Director"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                error={errors.role}
              />
              <Input
                label="Bio"
                placeholder="Short description of the agent's expertise"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
              <Select
                label="Division"
                options={DIVISION_OPTIONS}
                value={form.division}
                onChange={(e) => {
                  const division = e.target.value as AgencyDivision
                  setForm((f) => ({
                    ...f,
                    division,
                    unit: division,
                    position: { ...f.position, room: division },
                  }))
                }}
              />
              <Select
                label="Specialty"
                options={SPECIALTY_OPTIONS}
                value={form.specialty}
                onChange={(e) => {
                  const sp = e.target.value as AgentSpecialty
                  const av = SPECIALTY_AVATAR_MAP[sp] || AVATARS[0]
                  setForm((f) => ({
                    ...f,
                    specialty: sp,
                    unit: f.division,
                    avatar: av.id,
                    color: av.color,
                    position: { ...f.position, room: f.division },
                  }))
                }}
              />
              <Input
                label="Skills"
                placeholder="e.g. content strategy, UGC, campaign reports"
                value={form.skills.join(', ')}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    skills: e.target.value
                      .split(',')
                      .map((skill) => skill.trim())
                      .filter(Boolean),
                  }))
                }
              />
              <Input
                label="Responsibilities"
                placeholder="e.g. run strategy workshops, shape campaign architecture"
                value={form.responsibilities.join(', ')}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    responsibilities: e.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>
          </section>

          {/* Avatar picker */}
          <section>
            <h3 className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">
              Avatar
            </h3>
            <div className="flex gap-3">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  onClick={() =>
                    setForm((f) => ({ ...f, avatar: av.id, color: av.color }))
                  }
                  className={`p-1 rounded-lg border-2 transition-all ${
                    form.avatar === av.id
                      ? 'border-current scale-110'
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                  style={{ color: av.color }}
                >
                  <AgentBot name="" avatar={av.id} color={av.color} size={40} />
                </button>
              ))}
            </div>
          </section>

          {/* Prompt template */}
          <section>
            <h3 className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">
              Prompt Template
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {AGENT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-mono border border-border hover:border-border-glow text-text-secondary hover:text-text-primary transition-all"
                  style={{ borderColor: 'rgba(42,47,61,0.5)' }}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </section>

          {/* System prompt */}
          <section>
            <h3 className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">
              System Prompt
            </h3>
            <Textarea
              label=""
              placeholder="Describe the agent's role, expertise, and behavior..."
              value={form.systemPrompt}
              onChange={(e) =>
                setForm((f) => ({ ...f, systemPrompt: e.target.value }))
              }
              error={errors.systemPrompt}
              className="min-h-[200px] text-xs leading-relaxed"
            />
            <p className="text-[10px] text-text-dim mt-1">
              {form.systemPrompt.length} chars · Use variables like {'{{agency_name}}'}, {'{{client}}'}
            </p>
          </section>

          {/* Model config */}
          <section>
            <h3 className="text-xs font-mono text-text-dim uppercase tracking-wider mb-4">
              Model & Parameters
            </h3>
            <div className="space-y-4">
              <Select
                label="Provider"
                options={PROVIDER_OPTIONS}
                value={form.provider}
                onChange={(e) => {
                  const provider = e.target.value as Agent['provider']
                  const nextModel = getProviderModels(provider)[0]?.id || form.model
                  setForm((f) => ({ ...f, provider, model: nextModel }))
                }}
              />
              <Select
                label="Model"
                options={modelOptions}
                value={form.model}
                onChange={(e) =>
                  setForm((f) => ({ ...f, model: e.target.value as AgentModel }))
                }
              />
              <Slider
                label="Temperature"
                value={form.temperature}
                onChange={(v) => setForm((f) => ({ ...f, temperature: v }))}
                min={0}
                max={2}
                step={0.1}
              />
              <Slider
                label="Max Tokens"
                value={form.maxTokens}
                onChange={(v) => setForm((f) => ({ ...f, maxTokens: Math.round(v) }))}
                min={256}
                max={4096}
                step={256}
                showValue
              />
            </div>
          </section>

          {/* Tools */}
          <section>
            <h3 className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">
              Enabled Tools
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {TOOL_OPTIONS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    form.tools.includes(tool.id)
                      ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                      : 'border-border text-text-secondary hover:border-border-glow hover:text-text-primary'
                  }`}
                >
                  <span className="w-4 h-4 rounded border flex items-center justify-center">
                    {form.tools.includes(tool.id) && (
                      <span className="w-2 h-2 rounded-sm bg-accent-blue" />
                    )}
                  </span>
                  {tool.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {form.skills.map((skill) => (
                <span key={skill} className="px-2.5 py-1 rounded-full bg-base border border-border text-[11px] font-mono text-text-secondary">
                  {skill}
                </span>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">
                Primary Outputs
              </p>
              <div className="grid grid-cols-2 gap-2">
                {OUTPUT_OPTIONS.map((output) => {
                  const selected = form.primaryOutputs.includes(output.value as DeliverableType)
                  return (
                    <button
                      key={output.value}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          primaryOutputs: selected
                            ? f.primaryOutputs.filter((item) => item !== output.value)
                            : [...f.primaryOutputs, output.value as DeliverableType],
                        }))
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        selected
                          ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
                          : 'border-border text-text-secondary hover:border-border-glow hover:text-text-primary'
                      }`}
                    >
                      <span className="w-4 h-4 rounded border flex items-center justify-center">
                        {selected && <span className="w-2 h-2 rounded-sm bg-accent-cyan" />}
                      </span>
                      {output.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Status */}
          <section>
            <h3 className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">
              Status
            </h3>
            <div className="flex gap-2">
              {(['active', 'idle', 'paused'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                    form.status === s
                      ? s === 'active'
                        ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
                        : s === 'idle'
                        ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                        : 'border-text-dim bg-text-dim/10 text-text-dim'
                      : 'border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-panel">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            <Plus size={14} />
            {existing ? 'Save Changes' : 'Create Agent'}
          </Button>
        </div>
      </div>
    </>
  )
}
