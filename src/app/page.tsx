'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-base text-text-primary flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-heading font-semibold">Loading Mission Control…</p>
        <p className="text-xs text-text-dim mt-2">Opening your workspace</p>
      </div>
    </div>
  )
}
