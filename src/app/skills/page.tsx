'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClientShell } from '@/components/ClientShell'
import { useSkillsStore } from '@/lib/stores/skills-store'
import { Plus, Search, ChevronDown, ChevronUp, Pencil, BookOpen, ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'

const CATEGORY_COLORS: Record<string, string> = {
  strategy: '#4f8ef7',
  creative: '#00d4aa',
  'project-management': '#ffd166',
  media: '#ff5fa0',
  research: '#38bdf8',
  'client-services': '#a78bfa',
  operations: '#f97316',
}

const CATEGORY_ICONS: Record<string, string> = {
  strategy: '🎯',
  creative: '🎨',
  'project-management': '📋',
  media: '📺',
  research: '🔬',
  'client-services': '🤝',
  operations: '⚙️',
}

export default function SkillsPage() {
  const router = useRouter()
  const categories = useSkillsStore(s => s.categories)
  const skillsMap = useSkillsStore(s => s.skillsMap)
  const isLoaded = useSkillsStore(s => s.isLoaded)
  const loadSkills = useSkillsStore(s => s.loadSkills)
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showAllCategories, setShowAllCategories] = useState(false)

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  // Filter skills by search
  const filteredCategories = categories.map(cat => ({
    ...cat,
    skills: cat.skills.filter(s =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.skills.length > 0)

  const displayedCategories = showAllCategories ? filteredCategories : filteredCategories.slice(0, 4)

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d38] flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/config')}
              className="p-2 rounded-lg hover:bg-[#1a1d26] text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen size={20} className="text-accent-purple" />
                Skills Library
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {Object.keys(skillsMap).length} skills across {categories.length} categories
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/skills/new')}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/80 transition-colors"
          >
            <Plus size={16} />
            New Skill
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-[#2a2d38] bg-[#12141a]/50">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills by name or description..."
              className="w-full pl-10 pr-4 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-accent-purple"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!isLoaded ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayedCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BookOpen size={48} className="text-gray-600 mb-4" />
              <p className="text-gray-400">No skills found</p>
              <button
                onClick={() => router.push('/skills/new')}
                className="mt-4 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm"
              >
                Create your first skill
              </button>
            </div>
          ) : (
            displayedCategories.map(cat => {
              const color = CATEGORY_COLORS[cat.id] || '#9b6dff'
              const icon = CATEGORY_ICONS[cat.id] || '📋'
              const isExpanded = expandedCategories.has(cat.id)
              return (
                <div key={cat.id} className="border border-[#2a2d38] rounded-xl overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full px-5 py-4 flex items-center justify-between bg-[#1a1d26] hover:bg-[#1f2230] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div className="text-left">
                        <h2 className="text-sm font-semibold text-white">{cat.name}</h2>
                        <p className="text-xs text-gray-500">{cat.skills.length} skills</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-1.5 bg-[#2a2d38] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: color }} />
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-500" />
                      )}
                    </div>
                  </button>

                  {/* Skills Grid */}
                  {isExpanded && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {cat.skills.map(skill => (
                        <button
                          key={skill.id}
                          onClick={() => router.push(`/skills/${skill.id}`)}
                          className="p-4 bg-[#12141a] rounded-lg border border-[#2a2d38] hover:border-[#3a3d48] text-left transition-all group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-white group-hover:text-accent-purple transition-colors truncate">
                                {skill.name}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                {skill.description}
                              </p>
                              {skill.variables && skill.variables.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {skill.variables.slice(0, 3).map(v => (
                                    <span key={v} className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[10px] font-mono">
                                      {`{{${v}}}`}
                                    </span>
                                  ))}
                                  {skill.variables.length > 3 && (
                                    <span className="text-[10px] text-gray-500">+{skill.variables.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <Pencil size={14} className="text-gray-600 group-hover:text-accent-purple ml-2 flex-shrink-0 mt-1 transition-colors" />
                          </div>
                          {skill.metadata?.difficulty && (
                            <div className="flex items-center gap-2 mt-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: color + '20', color }}>
                                {skill.metadata.difficulty}
                              </span>
                              {skill.prompts?.ar && (
                                <span className="text-[10px] text-gray-500">🇬🇧 🇸🇦</span>
                              )}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {!showAllCategories && filteredCategories.length > 4 && (
            <button
              onClick={() => setShowAllCategories(true)}
              className="w-full py-3 text-sm text-gray-400 hover:text-white border border-dashed border-[#2a2d38] rounded-lg hover:border-gray-500 transition-colors"
            >
              Show {filteredCategories.length - 4} more categories
            </button>
          )}
        </div>
      </div>
    </ClientShell>
  )
}
