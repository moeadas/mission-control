'use client'

import React, { useState, useEffect } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { SKILL_CATEGORIES, type Skill } from '@/lib/skill-schema'
import Link from 'next/link'
import { Plus, Search, Filter, ChevronRight, BookOpen, Workflow, ListChecks, Star, Edit, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')

  useEffect(() => {
    fetch('/api/skills')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSkills(data)
        else setSkills([])
      })
      .catch(() => setSkills([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredSkills = skills.filter(skill => {
    const matchesSearch = !search || 
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !category || skill.category === category
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (catId: string) => {
    return SKILL_CATEGORIES.find(c => c.id === catId)?.color || '#666'
  }

  const getCategoryName = (catId: string) => {
    return SKILL_CATEGORIES.find(c => c.id === catId)?.name || catId
  }

  if (loading) {
    return (
      <ClientShell>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin w-8 h-8 border-2 border-[#9b6dff] border-t-transparent rounded-full" />
        </div>
      </ClientShell>
    )
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2d38] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-heading font-bold text-white flex items-center gap-3">
                <BookOpen size={22} className="text-[#9b6dff]" />
                Skills Library
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                {skills.length} skills · Solid, reusable capabilities for your agency agents
              </p>
            </div>
            <Link
              href="/skills/new"
              className="px-4 py-2 bg-[#9b6dff] text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-[#9b6dff]/80 transition-colors"
            >
              <Plus size={16} />
              New Skill
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-[#2a2d38] flex items-center gap-4 flex-shrink-0">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="w-full pl-10 pr-4 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-[#9b6dff]"
            />
          </div>
          <div className="flex items-center gap-2">
            {SKILL_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(category === cat.id ? null : cat.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  category === cat.id
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                )}
                style={{
                  backgroundColor: category === cat.id ? cat.color + '30' : undefined,
                  borderColor: category === cat.id ? cat.color : undefined,
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Skills Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Star size={48} className="text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No skills found</h3>
              <p className="text-sm text-gray-400 mb-4">
                {search ? 'Try a different search term' : 'Create your first skill to get started'}
              </p>
              <Link
                href="/skills/new"
                className="px-4 py-2 bg-[#9b6dff] text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Plus size={16} />
                Create Skill
              </Link>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-3 gap-4">
              {filteredSkills.map(skill => (
                <div
                  key={skill.name}
                  className="bg-[#1a1d26] rounded-xl border border-[#2a2d38] p-5 hover:border-[#4a4d58] transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: getCategoryColor(skill.category) + '20',
                          color: getCategoryColor(skill.category),
                        }}
                      >
                        {getCategoryName(skill.category)}
                      </span>
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-medium',
                        skill.difficulty === 'advanced' ? 'bg-red-500/20 text-red-400' :
                        skill.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      )}>
                        {skill.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/skills/${skill.name}`}
                        className="p-1.5 hover:bg-[#252830] rounded-lg text-gray-400 hover:text-white"
                      >
                        <Edit size={14} />
                      </Link>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-white mb-2 font-mono">
                    {skill.name}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-4">
                    {skill.description}
                  </p>

                  {/* Variables count */}
                  {skill.variables && skill.variables.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2">
                      <span className="font-mono">{skill.variables.length} variables</span>
                    </div>
                  )}

                  {/* Checklist preview */}
                  {skill.checklist && skill.checklist.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <ListChecks size={12} />
                      <span>{skill.checklist.length} checklist items</span>
                    </div>
                  )}

                  {/* Workflow steps */}
                  {skill.workflow?.steps && skill.workflow.steps.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1">
                      <Workflow size={12} />
                      <span>{skill.workflow.steps.length} workflow steps</span>
                    </div>
                  )}

                  <Link
                    href={`/skills/${skill.name}`}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-[#12141a] border border-[#2a2d38] rounded-lg text-xs text-gray-400 hover:text-white hover:border-[#9b6dff] transition-all"
                  >
                    Edit Skill
                    <ChevronRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSkills.map(skill => (
                <Link
                  key={skill.name}
                  href={`/skills/${skill.name}`}
                  className="flex items-center gap-4 p-4 bg-[#1a1d26] rounded-xl border border-[#2a2d38] hover:border-[#4a4d58] transition-all"
                >
                  <div className="w-32">
                    <span className="text-sm font-mono text-white">{skill.name}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{skill.description}</p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: getCategoryColor(skill.category) + '20',
                      color: getCategoryColor(skill.category),
                    }}
                  >
                    {getCategoryName(skill.category)}
                  </span>
                  <ChevronRight size={16} className="text-gray-500" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Best Practices Tip */}
        <div className="px-6 py-3 border-t border-[#2a2d38] bg-[#1a1d26] flex-shrink-0">
          <p className="text-[11px] text-gray-500 flex items-center gap-2">
            <Star size={12} className="text-yellow-500" />
            <strong>Best practice:</strong> Skills should be concise, have clear workflows, and include verification checklists.
            <a href="https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices" target="_blank" className="text-[#9b6dff] hover:underline ml-1">
              Learn more →
            </a>
          </p>
        </div>
      </div>
    </ClientShell>
  )
}
