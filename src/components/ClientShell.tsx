'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { ToastContainer } from '@/components/ui/Toast'
import { IrisChat } from '@/components/agents/IrisChat'
import { GlobalTaskTracker } from '@/components/tasks/GlobalTaskTracker'
import { createAppPersistenceSnapshot, useAgentsStore } from '@/lib/agents-store'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { MessageCircle, LayoutDashboard, Building2, Bot, ListTodo, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MOBILE_NAV = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'office', label: 'Office', icon: Building2, href: '/office' },
  { id: 'agents', label: 'Agents', icon: Bot, href: '/agents' },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, href: '/tasks' },
]

const PERSISTED_STATE_KEYS = [
  'activities',
  'campaigns',
  'agencySettings',
  'providerSettings',
  'agentMemories',
] as const

const ENTITY_COLLECTION_KEYS = ['agents', 'clients', 'missions', 'artifacts'] as const
const IRIS_PANEL_VISIBILITY_KEY = 'mission-control:iris-panel-visible'

export function ClientShell({ children }: { children: React.ReactNode }) {
  const openIris = useAgentsStore((state) => state.openIris)
  const closeIris = useAgentsStore((state) => state.closeIris)
  const isIrisOpen = useAgentsStore((state) => state.isIrisOpen)
  const themeMode = useAgentsStore((state) => state.agencySettings.themeMode)
  const hydrateAgentPhotos = useAgentsStore((state) => state.hydrateAgentPhotos)
  const hydrateAppState = useAgentsStore((state) => state.hydrateAppState)
  const setAppStateReady = useAgentsStore((state) => state.setAppStateReady)
  const setAuthenticatedUser = useAgentsStore((state) => state.setAuthenticatedUser)
  const appStateReady = useAgentsStore((state) => state.appStateReady)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [irisPanelVisible, setIrisPanelVisible] = useState(false)
  const pathname = usePathname()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  useEffect(() => {
    let isMounted = true

    let latestPhotos: Record<string, string> | null = null

    fetch('/api/agent-photos')
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        latestPhotos = payload?.photos || null
        if (isMounted && latestPhotos) {
          hydrateAgentPhotos(latestPhotos)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [hydrateAgentPhotos])

  useEffect(() => {
    let isMounted = true
    let saveTimer: ReturnType<typeof setTimeout> | null = null
    let canSync = false
    let authHeaders: HeadersInit = {}
    let latestUpdatedAt: string | null = null
    let lastSyncedSnapshot = ''
    let lastSyncedSections: Record<string, string> = {}
    let lastSyncedEntities: Record<string, Record<string, string>> = Object.fromEntries(
      ENTITY_COLLECTION_KEYS.map((key) => [key, {}])
    )

    let latestPhotos: Record<string, string> | null = null

    const photosPromise = fetch('/api/agent-photos')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        latestPhotos = payload?.photos || null
        return latestPhotos
      })
      .catch(() => null)

    Promise.resolve()
      .then(async () => {
        if (!useAgentsStore.persist.hasHydrated()) {
          await useAgentsStore.persist.rehydrate()
        }
        return supabase.auth.getSession()
      })
      .then(({ data }) => {
        const accessToken = data.session?.access_token
        authHeaders = accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {}

        if (!accessToken) {
          canSync = false
          if (isMounted) {
            setAuthenticatedUser(null)
            setAppStateReady(true)
          }
          return null
        }

        fetch('/api/auth/session', { headers: authHeaders })
          .then((response) => (response.ok ? response.json() : null))
          .then((payload) => {
            if (payload?.authenticated && isMounted) {
              setAuthenticatedUser(payload.user)
            }
          })
          .catch(() => {})

        return fetch('/api/state', { cache: 'no-store', headers: authHeaders })
      })
      .then((response) => (response?.ok ? response.json() : null))
      .then(async (payload) => {
        if (!isMounted) return
        if (payload?.state) {
          hydrateAppState(payload.state)
        }
        latestUpdatedAt = payload?.updatedAt || null
        const photoMap = latestPhotos || (await photosPromise)
        if (photoMap && isMounted) {
          hydrateAgentPhotos(photoMap)
        }
        canSync = payload?.connected === true
        if (payload?.connected === true && payload?.state) {
          lastSyncedSections = Object.fromEntries(
            PERSISTED_STATE_KEYS.map((key) => [key, JSON.stringify((payload.state as any)[key])])
          )
          lastSyncedEntities = Object.fromEntries(
            ENTITY_COLLECTION_KEYS.map((key) => [
              key,
              Object.fromEntries((((payload.state as any)[key] || []) as Array<{ id: string }>).map((item) => [item.id, JSON.stringify(item)])),
            ])
          )
          lastSyncedSnapshot = JSON.stringify(payload.state)
        }
        setAppStateReady(true)
      })
      .catch(() => {
        if (isMounted) {
          setAuthenticatedUser(null)
          setAppStateReady(true)
        }
      })

    const unsubscribe = useAgentsStore.subscribe((state) => {
      if (!canSync) return

      if (saveTimer) clearTimeout(saveTimer)

      saveTimer = setTimeout(async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) {
          canSync = false
          return
        }
        const snapshot = createAppPersistenceSnapshot(state)
        const serializedSnapshot = JSON.stringify(snapshot)
        if (serializedSnapshot === lastSyncedSnapshot) {
          return
        }
        const entityEntries = ENTITY_COLLECTION_KEYS.map((key) => {
            const nextItems = ((snapshot as any)[key] || []) as Array<{ id: string }>
            const previousMap = lastSyncedEntities[key] || {}
            const nextMap = Object.fromEntries(nextItems.map((item) => [item.id, JSON.stringify(item)]))
            const upserts = nextItems.filter((item) => previousMap[item.id] !== nextMap[item.id])
            const deletes = Object.keys(previousMap).filter((id) => !nextMap[id])
            return [key, { upserts, deletes }]
          }) as Array<[string, { upserts: Array<{ id: string }>; deletes: string[] }]>
        const entityPatch = Object.fromEntries(
          entityEntries.filter(([, delta]) => delta.upserts.length || delta.deletes.length)
        )
        const statePatch = Object.fromEntries(
          PERSISTED_STATE_KEYS.filter((key) => JSON.stringify((snapshot as any)[key]) !== lastSyncedSections[key]).map((key) => [
            key,
            (snapshot as any)[key],
          ])
        )
        if (!Object.keys(statePatch).length && !Object.keys(entityPatch).length) {
          lastSyncedSnapshot = serializedSnapshot
          return
        }
        fetch('/api/state', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ statePatch, entityPatch, updatedAt: latestUpdatedAt }),
        })
          .then(async (response) => {
            if (response.status === 409) {
              const latestResponse = await fetch('/api/state', {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                cache: 'no-store',
              }).catch(() => null)

              const latestPayload = latestResponse?.ok ? await latestResponse.json().catch(() => null) : null
              if (latestPayload?.state) {
                hydrateAppState(latestPayload.state)
                latestUpdatedAt = latestPayload.updatedAt || null
                lastSyncedSnapshot = JSON.stringify(latestPayload.state)
                lastSyncedSections = Object.fromEntries(
                  PERSISTED_STATE_KEYS.map((key) => [key, JSON.stringify((latestPayload.state as any)[key])])
                )
                lastSyncedEntities = Object.fromEntries(
                  ENTITY_COLLECTION_KEYS.map((key) => [
                    key,
                    Object.fromEntries(
                      ((((latestPayload.state as any)[key] || []) as Array<{ id: string }>)).map((item) => [item.id, JSON.stringify(item)])
                    ),
                  ])
                )
              }
              return
            }

            if (!response.ok) return
            const payload = await response.json().catch(() => null)
            if (payload?.updatedAt) {
              latestUpdatedAt = payload.updatedAt
              lastSyncedSnapshot = serializedSnapshot
              for (const key of Object.keys(statePatch)) {
                lastSyncedSections[key] = JSON.stringify((statePatch as any)[key])
              }
              for (const key of ENTITY_COLLECTION_KEYS) {
                lastSyncedEntities[key] = Object.fromEntries(
                  ((((snapshot as any)[key] || []) as Array<{ id: string }>)).map((item) => [item.id, JSON.stringify(item)])
                )
              }
            }
          })
          .catch(() => {})
      }, 700)
    })

    return () => {
      isMounted = false
      if (saveTimer) clearTimeout(saveTimer)
      unsubscribe()
    }
  }, [hydrateAgentPhotos, hydrateAppState, setAppStateReady, setAuthenticatedUser, supabase])

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (window.sessionStorage.getItem(IRIS_PANEL_VISIBILITY_KEY) === '1') {
        setIrisPanelVisible(true)
      }
    } catch {
      // Ignore session storage issues.
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (irisPanelVisible) {
        window.sessionStorage.setItem(IRIS_PANEL_VISIBILITY_KEY, '1')
      } else {
        window.sessionStorage.removeItem(IRIS_PANEL_VISIBILITY_KEY)
      }
    } catch {
      // Ignore session storage issues.
    }
  }, [irisPanelVisible])

  useEffect(() => {
    if (isIrisOpen) {
      setIrisPanelVisible(true)
    }
  }, [isIrisOpen])

  const handleOpenIris = () => {
    setIrisPanelVisible(true)
    openIris()
  }

  const handleCloseIris = () => {
    setIrisPanelVisible(false)
    closeIris()
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-base)] overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--accent-purple)] focus:text-white focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>
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
        onClick={
          appStateReady
            ? irisPanelVisible
              ? handleCloseIris
              : handleOpenIris
            : undefined
        }
        disabled={!appStateReady}
        className={`
          fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40
          flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full
          bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)]
          text-white shadow-lg
          transition-all duration-200
          hover:scale-110 hover:shadow-xl
          active:scale-95
          disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100
        `}
        aria-label={irisPanelVisible ? 'Close Iris chat' : 'Open Iris chat'}
        style={{ boxShadow: '0 4px 20px rgba(155, 109, 255, 0.4)' }}
      >
        {irisPanelVisible ? <X size={20} /> : <MessageCircle size={22} />}
      </button>

      <IrisChat forcedOpen={irisPanelVisible} onRequestClose={handleCloseIris} />
      <GlobalTaskTracker />
      <ToastContainer />
    </div>
  )
}
