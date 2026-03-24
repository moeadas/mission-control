'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Bot,
  ListTodo,
  FileText,
  Users,
  Settings,
  GitBranch,
  Zap,
  BarChart3,
  BookOpen,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', color: '#4f8ef7' },
  { id: 'office', label: 'Virtual Office', icon: Building2, href: '/office', color: '#00d4aa' },
  { id: 'agents', label: 'Agents', icon: Bot, href: '/agents', color: '#9b6dff' },
  { id: 'clients', label: 'Clients', icon: Users, href: '/clients', color: '#ffd166' },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, href: '/tasks', color: '#ff7c42' },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch, href: '/pipeline', color: '#00d4aa' },
  { id: 'skills', label: 'Skills', icon: BookOpen, href: '/skills', color: '#f59e0b' },
  { id: 'runner', label: 'Runner', icon: Zap, href: '/pipeline/run', color: '#ff5fa0' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytics', color: '#9b6dff' },
  { id: 'outputs', label: 'Outputs', icon: FileText, href: '/outputs', color: '#38bdf8' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings', color: '#8b92a8' },
]

interface SidebarProps {
  collapsed?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ collapsed = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      {mobileOpen && (
        <nav
          className="fixed left-0 top-0 h-full w-[280px] z-50 flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)] md:hidden"
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--border)]">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Menu</span>
            <button
              onClick={onMobileClose}
              className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)] min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onMobileClose}
                  className={clsx(
                    'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl min-h-[44px]',
                    'transition-all duration-150',
                    isActive
                      ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
          <div className="p-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">MC</span>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">Agency Mode</p>
                <p className="text-[11px] text-[var(--text-dim)]">Iris Orchestration</p>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Desktop sidebar */}
      <nav
        className={clsx(
          'hidden md:flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)]',
          'w-64 flex-shrink-0',
          collapsed && 'w-16'
        )}
        aria-label="Main navigation"
      >
        <div className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.id}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl min-h-[44px]',
                  'transition-all duration-150',
                  isActive
                    ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </div>
        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">MC</span>
            </div>
            {!collapsed && (
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">Agency Mode</p>
                <p className="text-[11px] text-[var(--text-dim)]">Iris Orchestration</p>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
