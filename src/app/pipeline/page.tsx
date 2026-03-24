'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClientShell } from '@/components/ClientShell'
import { usePipelinesStore } from '@/lib/stores/pipelines-store'
import { Plus, Search, ArrowLeft, Play, Pencil, Clock, Layers } from 'lucide-react'
import { clsx } from 'clsx'

export default function PipelinesPage() {
  const router = useRouter()
  const pipelines = usePipelinesStore(s => s.pipelines)
  const isLoaded = usePipelinesStore(s => s.isLoaded)
  const loadPipelines = usePipelinesStore(s => s.loadPipelines)
  const [search, setSearch] = useState('')

  useEffect(() => { loadPipelines() }, [loadPipelines])

  const filtered = pipelines.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  )

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
                <Layers size={20} className="text-accent-purple" />
                Pipeline Library
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {pipelines.length} pipelines — each a multi-phase workflow
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/pipeline/new')}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/80 transition-colors"
          >
            <Plus size={16} />
            New Pipeline
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
              placeholder="Search pipelines..."
              className="w-full pl-10 pr-4 py-2 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-accent-purple"
            />
          </div>
        </div>

        {/* Pipeline Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isLoaded ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Layers size={48} className="text-gray-600 mb-4" />
              <p className="text-gray-400">No pipelines found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(pipeline => (
                <div
                  key={pipeline.id}
                  className="bg-[#1a1d26] rounded-xl border border-[#2a2d38] hover:border-[#3a3d48] transition-all group"
                >
                  {/* Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white group-hover:text-accent-purple transition-colors">
                          {pipeline.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-gray-500">v{pipeline.version}</span>
                          {pipeline.isDefault && (
                            <span className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[10px]">default</span>
                          )}
                        </div>
                      </div>
                      <Pencil
                        size={14}
                        className="text-gray-600 group-hover:text-accent-purple transition-colors cursor-pointer flex-shrink-0"
                        onClick={() => router.push(`/pipeline/${pipeline.id}`)}
                      />
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {pipeline.description}
                    </p>
                  </div>

                  {/* Phase Preview */}
                  <div className="px-5 pb-4">
                    <div className="flex gap-1 mb-3">
                      {pipeline.phases.slice(0, 6).map((phase, i) => (
                        <div
                          key={phase.id}
                          className="h-1.5 flex-1 rounded-full"
                          style={{ backgroundColor: phase.color + '60' }}
                          title={phase.name}
                        />
                      ))}
                      {pipeline.phases.length > 6 && (
                        <div className="h-1.5 w-4 rounded-full bg-[#2a2d38]" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {pipeline.phases.slice(0, 4).map(phase => (
                        <span
                          key={phase.id}
                          className="px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{ backgroundColor: phase.color + '15', color: phase.color }}
                        >
                          {phase.name}
                        </span>
                      ))}
                      {pipeline.phases.length > 4 && (
                        <span className="px-2 py-0.5 rounded text-[10px] text-gray-500">
                          +{pipeline.phases.length - 4}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-[#2a2d38] flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Clock size={11} />
                      <span>{pipeline.estimatedDuration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">
                        {pipeline.phases.length} phases · {pipeline.phases.reduce((sum, p) => sum + p.activities.length, 0)} activities
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClientShell>
  )
}
