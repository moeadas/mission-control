'use client'

import React from 'react'
import { useAgentsStore } from '@/lib/agents-store'
import { Card } from '@/components/ui/Card'
import { AgentBot } from '@/components/agents/AgentBot'
import { SPECIALTY_LABELS, formatTimestamp } from '@/lib/bot-animations'
import { Clock, CheckCircle2, AlertCircle, Loader } from 'lucide-react'

const ACTION_ICONS = {
  started: <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />,
  completed: <CheckCircle2 size={12} className="text-accent-cyan" />,
  thinking: <Loader size={12} className="text-accent-purple animate-spin" />,
  error: <AlertCircle size={12} className="text-red-400" />,
  idle: <div className="w-1.5 h-1.5 rounded-full bg-text-dim" />,
}

export function ActivityFeed() {
  const activities = useAgentsStore((state) => state.activities)

  if (activities.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center py-8">
          <Clock size={32} className="text-text-dim mx-auto mb-3" />
          <p className="text-sm text-text-secondary">No activity yet</p>
          <p className="text-xs text-text-dim mt-1">Agent actions will appear here</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex-shrink-0">
        <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider">
          Live Activity
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activities.map((entry, i) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 px-5 py-3 border-b border-border/50 hover:bg-card/50 transition-colors"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <AgentBot
              name={entry.agentName}
              avatar="bot-blue"
              color={entry.agentColor}
              status="active"
              size={28}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary">{entry.agentName}</span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: entry.agentColor }}
                >
                  {entry.action}
                </span>
              </div>
              {entry.detail && (
                <p className="text-[11px] text-text-secondary mt-0.5 truncate">{entry.detail}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {ACTION_ICONS[entry.type]}
              <span className="text-[10px] font-mono text-text-dim">
                {formatTimestamp(entry.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
