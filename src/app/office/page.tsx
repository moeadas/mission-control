'use client'

import React from 'react'
import { ClientShell } from '@/components/ClientShell'
import { OfficeFloor } from '@/components/office/OfficeFloor'
import { useAgentsStore } from '@/lib/agents-store'
import { Building2, Users } from 'lucide-react'

export default function OfficePage() {
  const agents = useAgentsStore((state) => state.agents)
  const activeCount = agents.filter((a) => a.status === 'active').length
  const idleCount = agents.filter((a) => a.status === 'idle').length

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0 border-b border-border bg-base/30">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card">
                <Building2 size={17} className="text-accent-blue" />
              </span>
              Virtual Office
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Live mission floor with seated specialists, task bubbles, and a running trophy board.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-text-secondary">
              <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
              {activeCount} active
            </div>
            <div className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-text-secondary">
              <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
              {idleCount} idle
            </div>
            <div className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-text-secondary flex items-center gap-2">
              <Users size={12} />
              {agents.length} total
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="h-full rounded-[2rem] overflow-hidden border border-border bg-card shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <OfficeFloor />
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
