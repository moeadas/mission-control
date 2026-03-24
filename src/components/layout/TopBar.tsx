'use client'

import React, { useState, useEffect } from 'react'
import { Activity, Menu, Sun, Moon } from 'lucide-react'
import { useAgentsStore } from '@/lib/agents-store'
import { clsx } from 'clsx'

interface TopBarProps {
  onMobileMenuToggle?: () => void
}

export function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const [time, setTime] = useState('')
  const themeMode = useAgentsStore((state) => state.agencySettings.themeMode)
  const setThemeMode = useAgentsStore((state) => state.setThemeMode)
  const missions = useAgentsStore((state) => state.missions)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const activeMissionCount = missions.filter((mission) => mission.status !== 'completed').length

  return (
    <header className="h-14 bg-[var(--bg-panel)] border-b border-[var(--border)] flex items-center justify-between px-4 md:px-5 flex-shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            console.log('🍔 Hamburger clicked!')
            onMobileMenuToggle?.()
          }}
          className="flex md:hidden p-2 -ml-2 rounded-xl hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] flex items-center justify-center shadow-sm">
            <Activity size={18} className="text-white" />
          </div>
          <div className="hidden xs:block">
            <h1 className="text-base font-semibold text-[var(--text-primary)] leading-tight">
              Mission Control
            </h1>
            <p className="text-xs text-[var(--text-dim)]">
              {activeMissionCount} active mission{activeMissionCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          className={clsx(
            'flex items-center justify-center w-10 h-10 rounded-xl',
            'transition-colors duration-200',
            'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]',
            'focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-panel)]'
          )}
          aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Time */}
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">{time}</p>
        </div>
      </div>
    </header>
  )
}
