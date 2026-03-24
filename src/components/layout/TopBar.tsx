'use client'

import React, { useState, useEffect } from 'react'
import { Activity, Moon, SunMedium, Target, Wifi } from 'lucide-react'
import { useAgentsStore } from '@/lib/agents-store'

export function TopBar() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const themeMode = useAgentsStore((state) => state.agencySettings.themeMode)
  const setThemeMode = useAgentsStore((state) => state.setThemeMode)
  const missions = useAgentsStore((state) => state.missions)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
      setDate(now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="h-14 bg-panel/90 backdrop-blur-md border-b border-border flex items-center justify-between px-5 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-purple/20 border border-accent-purple/30 flex items-center justify-center">
          <Activity size={16} className="text-accent-purple" />
        </div>
        <div>
          <h1 className="text-sm font-heading font-bold text-text-primary tracking-wide">
            Moe's Mission Control
          </h1>
          <p className="text-[10px] font-mono text-text-dim">Virtual creative and digital media agency</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-base/70 border border-border">
          <Target size={12} className="text-accent-orange" />
          <span className="text-[10px] font-mono text-text-secondary">
            {missions.filter((mission) => mission.status !== 'completed').length} live missions
          </span>
        </div>
        <div className="relative flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan" />
          </span>
          <span className="text-xs font-mono text-accent-cyan">SYSTEMS ONLINE</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-base/70 text-text-secondary hover:text-text-primary hover:border-border-glow transition-all"
          title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? <SunMedium size={14} /> : <Moon size={14} />}
          <span className="hidden md:inline text-[10px] font-mono uppercase tracking-wide">
            {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
          </span>
        </button>
        <div className="text-right">
          <p className="text-xs font-mono text-text-primary">{time}</p>
          <p className="text-[10px] font-mono text-text-dim">{date}</p>
        </div>
        <div className="flex items-center gap-1.5 text-accent-cyan">
          <Wifi size={14} />
        </div>
      </div>
    </header>
  )
}
