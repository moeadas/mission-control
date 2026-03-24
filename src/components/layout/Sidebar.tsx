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
  ChevronRight,
  GitBranch,
  UserCircle,
  Code,
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    color: '#4f8ef7',
    description: 'Agency overview',
  },
  {
    id: 'office',
    label: 'Virtual Office',
    icon: Building2,
    href: '/office',
    color: '#00d4aa',
    description: 'Bot workstations',
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: Bot,
    href: '/agents',
    color: '#9b6dff',
    description: 'Manage your team',
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    href: '/clients',
    color: '#ffd166',
    description: 'Client profiles',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: ListTodo,
    href: '/tasks',
    color: '#ff7c42',
    description: 'Requested work',
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: GitBranch,
    href: '/pipeline',
    color: '#00d4aa',
    description: 'Workflow production',
  },
  {
    id: 'outputs',
    label: 'Outputs',
    icon: FileText,
    href: '/outputs',
    color: '#38bdf8',
    description: 'Saved deliverables',
  },
  {
    id: 'config',
    label: 'Config Editor',
    icon: Code,
    href: '/config',
    color: '#ff5fa0',
    description: 'Edit JSON configs',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    color: '#8b92a8',
    description: 'Configuration',
  },
]

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname()

  return (
    <nav className={`flex flex-col bg-panel border-r border-border h-full flex-shrink-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
      <div className="flex-1 py-4 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              className={clsx(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 hover:bg-card',
                isActive && 'bg-card'
              )}
            >
              <div
                className={clsx('absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full transition-all', isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')}
                style={{ backgroundColor: item.color }}
              />
              <div
                className={clsx('flex items-center justify-center w-8 h-8 rounded-md transition-all', isActive ? 'scale-110' : 'group-hover:scale-105')}
                style={{ backgroundColor: isActive ? `${item.color}20` : 'transparent', color: isActive ? item.color : '#8b92a8' }}
              >
                <Icon size={18} />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className={clsx('text-sm font-medium transition-colors', isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary')}>{item.label}</span>
                  <span className="text-[10px] text-text-dim truncate">{item.description}</span>
                </div>
              )}
              {!collapsed && isActive && <ChevronRight size={14} className="ml-auto" style={{ color: item.color }} />}
            </Link>
          )
        })}
      </div>
      {!collapsed && (
      <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">MC</span>
            </div>
            <div>
              <p className="text-[10px] font-mono text-text-dim">AGENCY MODE</p>
              <p className="text-xs font-heading font-semibold text-text-secondary">Iris Orchestration</p>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
