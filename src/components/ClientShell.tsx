'use client'

import React, { useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { ToastContainer } from '@/components/ui/Toast'
import { IrisChat } from '@/components/agents/IrisChat'
import { useAgentsStore } from '@/lib/agents-store'
import { Sparkles } from 'lucide-react'

export function ClientShell({ children }: { children: React.ReactNode }) {
  const openIris = useAgentsStore((state) => state.openIris)
  const isIrisOpen = useAgentsStore((state) => state.isIrisOpen)
  const themeMode = useAgentsStore((state) => state.agencySettings.themeMode)

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  return (
    <div className="flex flex-col h-screen bg-base overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col relative">
          {children}
        </main>
      </div>

      {/* Floating Iris button */}
      <button
        onClick={openIris}
        className={`
          fixed bottom-6 right-6 z-30
          flex items-center gap-3 px-4 py-3 rounded-2xl
          text-white font-medium text-sm
          shadow-lg transition-all duration-200
          hover:scale-105 hover:shadow-xl active:scale-95
          group
        `}
        style={{
          background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
          boxShadow: '0 0 24px rgba(122,86,239,0.35), 0 4px 20px rgba(0,0,0,0.18)',
        }}
      >
        <Sparkles size={16} className="text-white" />
        <span>Chat with Iris</span>
        {!isIrisOpen && (
          <span className="ml-1 w-2 h-2 rounded-full bg-white/60 animate-pulse" />
        )}
      </button>

      <IrisChat />
      <ToastContainer />
    </div>
  )
}
