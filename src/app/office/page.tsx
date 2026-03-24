'use client'

import React from 'react'
import { ClientShell } from '@/components/ClientShell'
import { OfficeFloor } from '@/components/office/OfficeFloor'
import { useAgentsStore } from '@/lib/agents-store'
import { Bot, Users, Zap } from 'lucide-react'

export default function OfficePage() {
  const agents = useAgentsStore((state) => state.agents)
  const activeCount = agents.filter((a) => a.status === 'active').length

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
              <Bot size={20} className="text-accent-cyan" />
              Virtual Office
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Live view — {activeCount} agent{activeCount !== 1 ? 's' : ''} active
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
              <Zap size={12} className="text-accent-yellow" />
              <span>{activeCount} active</span>
              <span className="text-border">|</span>
              <Users size={12} />
              <span>{agents.length} total</span>
            </div>
          </div>
        </div>

        {/* Office floor */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full bg-panel rounded-card border border-border p-4 overflow-hidden">
            <OfficeFloor />
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
