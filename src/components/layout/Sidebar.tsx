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
  ChevronLeft,
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
        'group relative flex items-center gap-3 rounded-xl transition-all duration-200 min-h-[44px]',
        isActive
          ? 'bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-card)] border border-[var(--border-glow)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] border border-transparent',
        collapsed ? 'justify-center px-2' : 'px-3'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Active indicator */}
      {isActive && (
        <>
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
            style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
          />
          <div
            className="absolute inset-0 rounded-xl opacity-10"
            style={{ background: `radial-gradient(ellipse at left, ${item.color}40, transparent 70%)` }}
          />
        </>
      )}

      <div
        className={clsx(
          'flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-all',
          isActive ? '' : 'group-hover:scale-105'
        )}
        style={{
          background: isActive ? item.color + '20' : 'transparent',
        }}
      >
        <Icon
          size={18}
          style={{ color: isActive ? item.color : 'var(--text-dim)' }}
          className="transition-colors"
        />
      </div>

      {!collapsed && (
        <span
          className={clsx(
            'text-sm font-medium transition-colors',
            isActive ? 'text-[var(--text-primary)]' : ''
          )}
          style={isActive ? { color: item.color } : {}}
        >
          {item.label}
        </span>
      )}

      {/* Hover glow effect */}
      {!isActive && (
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"
          style={{ background: item.color }}
        />
      )}
    </Link>
  )
}

export function Sidebar({ collapsed = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <nav
        className={clsx(
          'fixed left-0 top-0 h-full z-50 flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)] md:hidden',
          'w-72 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">MC</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Mission Control</p>
              <p className="text-[10px] text-[var(--text-dim)] font-mono">Agency HQ</p>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
              onClick={onMobileClose}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--bg-elevated)]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">MC</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">Agency Mode</p>
              <p className="text-[10px] text-[var(--text-dim)] font-mono truncate">Iris · Online</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-[#00d4aa] shadow-[0_0_6px_#00d4aa] flex-shrink-0 animate-pulse" />
          </div>
        </div>
      </nav>

      {/* Desktop sidebar */}
      <nav
        className={clsx(
          'hidden md:flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)]',
          'flex-shrink-0 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center border-b border-[var(--border)] flex-shrink-0',
          collapsed ? 'h-16 justify-center px-2' : 'h-16 px-4'
        )}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(155,109,255,0.3)]">
              <span className="text-[11px] font-bold text-white">MC</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">Mission Control</p>
                <p className="text-[10px] text-[var(--text-dim)] font-mono">Agency HQ</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => (
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
          collapsed ? 'p-2' : 'p-4'
        )}>
          <div className={clsx(
            'flex items-center gap-3 p-2 rounded-xl bg-[var(--bg-elevated)]',
            collapsed ? 'justify-center' : ''
          )}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">MC</span>
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">Agency Mode</p>
                  <p className="text-[10px] text-[var(--text-dim)] font-mono truncate">Iris · Online</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#00d4aa] shadow-[0_0_6px_#00d4aa] flex-shrink-0 animate-pulse" />
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
