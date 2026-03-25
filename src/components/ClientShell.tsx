'use client'

import React, { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { ToastContainer } from '@/components/ui/Toast'
import { IrisChat } from '@/components/agents/IrisChat'
import { useAgentsStore } from '@/lib/agents-store'
import { MessageCircle, LayoutDashboard, Building2, Bot, ListTodo, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MOBILE_NAV = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'office', label: 'Office', icon: Building2, href: '/office' },
  { id: 'agents', label: 'Agents', icon: Bot, href: '/agents' },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, href: '/tasks' },
]

export function ClientShell({ children }: { children: React.ReactNode }) {
  const openIris = useAgentsStore((state) => state.openIris)
  const isIrisOpen = useAgentsStore((state) => state.isIrisOpen)
  const themeMode = useAgentsStore((state) => state.agencySettings.themeMode)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-base)] overflow-hidden">
      <TopBar onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto pb-20 md:pb-0"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="mobile-bottom-nav md:hidden"
        aria-label="Mobile navigation"
      >
        {MOBILE_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{item.label}</span>
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'var(--accent-blue)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Iris Chat FAB */}
      <button
        onClick={openIris}
        className={`
          fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40
          flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full
          bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)]
          text-white shadow-lg
          transition-all duration-200
          hover:scale-110 hover:shadow-xl
          active:scale-95
        `}
        aria-label={isIrisOpen ? 'Close Iris chat' : 'Open Iris chat'}
        style={{ boxShadow: '0 4px 20px rgba(155, 109, 255, 0.4)' }}
      >
        {isIrisOpen ? <X size={20} /> : <MessageCircle size={22} />}
      </button>

      <IrisChat />
      <ToastContainer />
    </div>
  )
}
