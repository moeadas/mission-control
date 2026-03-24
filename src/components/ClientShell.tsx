'use client'

import React, { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { ToastContainer } from '@/components/ui/Toast'
import { IrisChat } from '@/components/agents/IrisChat'
import { useAgentsStore } from '@/lib/agents-store'
import { MessageCircle } from 'lucide-react'

export function ClientShell({ children }: { children: React.ReactNode }) {
  const openIris = useAgentsStore((state) => state.openIris)
  const isIrisOpen = useAgentsStore((state) => state.isIrisOpen)
  const themeMode = useAgentsStore((state) => state.agencySettings.themeMode)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {/* Iris Chat FAB */}
      <button
        onClick={openIris}
        className={`
          fixed bottom-6 right-6 z-40
          flex items-center justify-center w-14 h-14 rounded-full
          bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)]
          text-white shadow-lg
          transition-all duration-200
          hover:scale-105 hover:shadow-xl
          active:scale-95
        `}
        aria-label={isIrisOpen ? 'Close Iris chat' : 'Open Iris chat'}
      >
        <MessageCircle size={24} />
      </button>

      <IrisChat />
      <ToastContainer />
    </div>
  )
}
