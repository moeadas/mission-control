'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
  Shield,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { getSupabaseAccessToken } from '@/lib/supabase/browser'
import { useAgentsStore } from '@/lib/agents-store'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', color: '#60a5fa' },
  { id: 'office', label: 'Virtual Office', icon: Building2, href: '/office', color: '#2dd4bf' },
  { id: 'agents', label: 'Agents', icon: Bot, href: '/agents', color: '#a78bfa' },
  { id: 'clients', label: 'Clients', icon: Users, href: '/clients', color: '#fbbf24' },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, href: '/tasks', color: '#fb923c' },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch, href: '/pipeline', color: '#2dd4bf' },
  { id: 'skills', label: 'Skills', icon: BookOpen, href: '/skills', color: '#fbbf24' },
  { id: 'runner', label: 'Runner', icon: Zap, href: '/pipeline/run', color: '#f472b6' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytics', color: '#a78bfa' },
  { id: 'outputs', label: 'Outputs', icon: FileText, href: '/outputs', color: '#60a5fa' },
  { id: 'users', label: 'Users', icon: Shield, href: '/users', color: '#f472b6' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings', color: '#71717a' },
]

const ADMIN_ONLY_IDS = new Set(['pipeline', 'skills', 'runner', 'users', 'settings'])

interface SidebarProps {
  collapsed?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}

function NavItem({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: (typeof NAV_ITEMS)[0]
  isActive: boolean
  collapsed?: boolean
  onClick?: () => void
}) {
  const Icon = item.icon

  return (
    <Link
      key={item.id}
      href={item.href}
      onClick={onClick}
      className={clsx(
        'group relative flex items-center gap-3 rounded-lg transition-all duration-150 min-h-[40px]',
        isActive
          ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        collapsed ? 'justify-center px-2' : 'px-3'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Active left bar */}
      {isActive && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
          style={{ background: item.color }}
        />
      )}

      <div
        className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0"
        style={{
          background: isActive ? item.color + '18' : 'transparent',
        }}
      >
        <Icon
          size={16}
          style={{ color: isActive ? item.color : 'var(--text-dim)' }}
          className="transition-colors"
        />
      </div>

      {!collapsed && (
        <span
          className="text-[13px] font-medium transition-colors"
          style={isActive ? { color: item.color } : {}}
        >
          {item.label}
        </span>
      )}
    </Link>
  )
}

export function Sidebar({ collapsed = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const currentUser = useAgentsStore((state) => state.currentUser)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    let active = true

    const loadRole = async () => {
      if (currentUser?.role) {
        if (active) setIsSuperAdmin(currentUser.role === 'super_admin')
        return
      }

      const token = await getSupabaseAccessToken()
      if (!token) {
        if (active) setIsSuperAdmin(false)
        return
      }

      const response = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!active) return

      if (!response.ok) {
        setIsSuperAdmin(false)
        return
      }

      const payload = await response.json()
      setIsSuperAdmin(payload?.user?.role === 'super_admin')
    }

    loadRole()

    return () => {
      active = false
    }
  }, [currentUser?.role])

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => isSuperAdmin || !ADMIN_ONLY_IDS.has(item.id)),
    [isSuperAdmin]
  )

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <nav
        className={clsx(
          'fixed left-0 top-0 h-full z-50 flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)] md:hidden',
          'w-64 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-purple)] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">MC</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Mission Control</p>
              <p className="text-[10px] text-[var(--text-dim)]">Agency HQ</p>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNavItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
              onClick={onMobileClose}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-elevated)]">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">MC</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--text-primary)]">Agency Mode</p>
              <p className="text-[10px] text-[var(--text-dim)]">Iris · Online</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#2dd4bf] shadow-[0_0_4px_#2dd4bf] flex-shrink-0 animate-pulse" />
          </div>
        </div>
      </nav>

      {/* Desktop sidebar */}
      <nav
        className={clsx(
          'hidden md:flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)]',
          'flex-shrink-0 transition-all duration-200',
          collapsed ? 'w-16' : 'w-56'
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center border-b border-[var(--border)] flex-shrink-0',
          collapsed ? 'h-14 justify-center' : 'h-14 px-4'
        )}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">MC</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">Mission Control</p>
                <p className="text-[10px] text-[var(--text-dim)]">Agency HQ</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNavItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Footer */}
        <div className={clsx(
          'border-t border-[var(--border)] flex-shrink-0',
          collapsed ? 'p-2' : 'p-3'
        )}>
          <div className={clsx(
            'flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--bg-elevated)]',
            collapsed ? 'justify-center' : ''
          )}>
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">MC</span>
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">Agency Mode</p>
                  <p className="text-[10px] text-[var(--text-dim)]">Iris · Online</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#2dd4bf] shadow-[0_0_4px_#2dd4bf] flex-shrink-0 animate-pulse" />
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
