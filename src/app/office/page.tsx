'use client'

import React from 'react'
import { ClientShell } from '@/components/ClientShell'
import { OfficeFloor } from '@/components/office/OfficeFloor'
import { useAgentsStore } from '@/lib/agents-store'
import { Bot, Users, Zap } from 'lucide-react'

export default function OfficePage() {
  const agents = useAgentsStore((state) => state.agents)
  const activeCount = agents.filter((a) => a.status === 'active').length
  const idleCount = agents.filter((a) => a.status === 'idle').length

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Sleek header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-heading font-bold text-[var(--text-primary)] flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #9b6dff20, #4f8ef720)',
                    border: '1px solid #9b6dff40',
                  }}
                >
                  <Bot size={16} style={{ color: '#00d4aa' }} />
                </div>
                Virtual Office
              </h1>
              <p className="text-xs text-[var(--text-dim)] mt-0.5 font-mono">
                Click any zone to explore the team
              </p>
            </div>
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)' }}>
              <div className="w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse" style={{ boxShadow: '0 0 6px #00d4aa' }} />
              <span className="text-[11px] font-mono text-[#00d4aa]">{activeCount} active</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,209,102,0.1)', border: '1px solid rgba(255,209,102,0.2)' }}>
              <div className="w-2 h-2 rounded-full bg-[#ffd166]" />
              <span className="text-[11px] font-mono text-[#ffd166]">{idleCount} idle</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <Users size={12} className="text-[var(--text-dim)]" />
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">{agents.length} total</span>
            </div>
          </div>
        </div>

        {/* Office floor */}
        <div className="flex-1 overflow-hidden p-4 md:p-6">
          <div
            className="h-full rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <OfficeFloor />
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
