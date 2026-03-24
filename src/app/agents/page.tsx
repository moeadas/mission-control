'use client'

import React, { useState } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { AgentCard } from '@/components/agents/AgentCard'
import { AgentEditor } from '@/components/agents/AgentEditor'
import { useAgentsStore } from '@/lib/agents-store'
import { Plus, Search, Bot } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function AgentsPage() {
  const agents = useAgentsStore((state) => state.agents)
  const isEditorOpen = useAgentsStore((state) => state.isEditorOpen)
  const editingAgentId = useAgentsStore((state) => state.editingAgentId)
  const closeEditor = useAgentsStore((state) => state.closeEditor)
  const openEditor = useAgentsStore((state) => state.openEditor)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const filtered = agents.filter((a) => {
    const matchSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || a.specialty === filter || a.status === filter || a.division === filter
    return matchSearch && matchFilter
  })

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'idle', label: 'Idle' },
    { value: 'paused', label: 'Paused' },
    { value: 'creative', label: 'Creative' },
    { value: 'client-services', label: 'Client Services' },
    { value: 'media', label: 'Media' },
    { value: 'research', label: 'Research' },
    { value: 'strategy', label: 'Strategy' },
    { value: 'copy', label: 'Copy' },
    { value: 'design', label: 'Design' },
  ]

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
              <Bot size={20} className="text-accent-purple" />
              Agent Roster
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {agents.length} agents — click any agent to edit
            </p>
          </div>
          <Button variant="primary" onClick={() => openEditor(null)}>
            <Plus size={14} />
            New Agent
          </Button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-border flex items-center gap-4 flex-shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-base border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-blue transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                  filter === f.value
                    ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                    : 'bg-base border border-border text-text-secondary hover:text-text-primary hover:border-border-glow'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-6xl">
              {filtered.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={() => openEditor(agent.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <Bot size={48} className="text-text-dim mb-4" />
              <p className="text-text-secondary">No agents found</p>
              <p className="text-xs text-text-dim mt-1">
                {search ? 'Try a different search term' : 'Add your first agent to get started'}
              </p>
            </div>
          )}
        </div>
      </div>

      <AgentEditor agentId={editingAgentId} isOpen={isEditorOpen} onClose={closeEditor} />
    </ClientShell>
  )
}
