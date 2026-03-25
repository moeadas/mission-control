'use client'

import React, { useMemo, useState } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Download, KeyRound, RefreshCcw, Settings, Sparkles, SunMedium, Upload } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { useAgentsStore } from '@/lib/agents-store'
import { getProviderModels, MODEL_OPTIONS, PROVIDER_OPTIONS } from '@/lib/providers'
import { ThemeMode } from '@/lib/types'

export default function SettingsPage() {
  const agents = useAgentsStore((state) => state.agents)
  const campaigns = useAgentsStore((state) => state.campaigns)
  const clients = useAgentsStore((state) => state.clients)
  const missions = useAgentsStore((state) => state.missions)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const agencySettings = useAgentsStore((state) => state.agencySettings)
  const providerSettings = useAgentsStore((state) => state.providerSettings)
  const agentMemories = useAgentsStore((state) => state.agentMemories)
  const updateAgencySettings = useAgentsStore((state) => state.updateAgencySettings)
  const updateProviderSettings = useAgentsStore((state) => state.updateProviderSettings)
  const saveGeminiKey = useAgentsStore((state) => state.saveGeminiKey)
  const hydrateAppState = useAgentsStore((state) => state.hydrateAppState)

  const [geminiKeyInput, setGeminiKeyInput] = useState('')
  const [isVerifyingGemini, setIsVerifyingGemini] = useState(false)
  const [isVerifyingOllama, setIsVerifyingOllama] = useState(false)

  const modelOptions = useMemo(
    () => getProviderModels(agencySettings.defaultProvider).map((option) => ({ value: option.id, label: option.label })),
    [agencySettings.defaultProvider]
  )

  const verifyOllama = async () => {
    setIsVerifyingOllama(true)
    try {
      const response = await fetch('/api/providers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'ollama', baseUrl: providerSettings.ollama.baseUrl }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Verification failed')
      updateProviderSettings('ollama', { verified: true, verifiedAt: new Date().toISOString(), enabled: true, availableModels: data.models || [] })
      toast.success(`Ollama connected${data.models?.length ? ` · ${data.models.length} model(s)` : ''}`)
    } catch (error: any) {
      updateProviderSettings('ollama', { verified: false })
      toast.error(error.message || 'Could not verify Ollama')
    } finally {
      setIsVerifyingOllama(false)
    }
  }

  const verifyGemini = async () => {
    if (!geminiKeyInput.trim()) {
      toast.error('Paste a Gemini API key first')
      return
    }
    setIsVerifyingGemini(true)
    try {
      const response = await fetch('/api/providers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemini', apiKey: geminiKeyInput.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Verification failed')
      saveGeminiKey(geminiKeyInput.trim())
      updateProviderSettings('gemini', {
        enabled: true,
        verified: true,
        verifiedAt: new Date().toISOString(),
        availableModels: data.models || [],
      })
      setGeminiKeyInput('')
      toast.success('Gemini verified and saved locally')
    } catch (error: any) {
      updateProviderSettings('gemini', { verified: false })
      toast.error(error.message || 'Could not verify Gemini')
    } finally {
      setIsVerifyingGemini(false)
    }
  }

  const handleExport = () => {
    const data = {
      version: '2.0',
      exported: new Date().toISOString(),
      agents,
      campaigns,
      clients,
      missions,
      artifacts,
      agencySettings,
      providerSettings,
      agentMemories,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mission-control-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Configuration exported')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        hydrateAppState(data)
        toast.success(`Imported ${data.agents?.length || 0} agents and ${data.missions?.length || 0} missions`)
      } catch {
        toast.error('Invalid config file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
              <Settings size={20} className="text-text-secondary" />
              Settings
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">Agency defaults, providers, and presentation mode</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl space-y-6">
            <Card>
              <h2 className="text-sm font-heading font-semibold text-text-primary mb-4">Agency Profile</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Agency Name"
                  value={agencySettings.agencyName}
                  onChange={(e) => updateAgencySettings({ agencyName: e.target.value })}
                />
                <Select
                  label="Theme Mode"
                  options={[
                    { value: 'dark', label: 'Dark Command Center' },
                    { value: 'light', label: 'Light Studio Mode' },
                  ]}
                  value={agencySettings.themeMode}
                  onChange={(e) => updateAgencySettings({ themeMode: e.target.value as ThemeMode })}
                />
                <Select
                  label="Default Provider"
                  options={PROVIDER_OPTIONS}
                  value={agencySettings.defaultProvider}
                  onChange={(e) =>
                    updateAgencySettings({
                      defaultProvider: e.target.value as typeof agencySettings.defaultProvider,
                      defaultModel: getProviderModels(e.target.value as typeof agencySettings.defaultProvider)[0]?.id || agencySettings.defaultModel,
                    })
                  }
                />
                <Select
                  label="Default Model"
                  options={modelOptions}
                  value={agencySettings.defaultModel}
                  onChange={(e) => updateAgencySettings({ defaultModel: e.target.value as typeof agencySettings.defaultModel })}
                />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-heading font-semibold text-text-primary">Provider Connections</h2>
                  <p className="text-xs text-text-secondary mt-1">Verify local Ollama or add Gemini with a valid API key.</p>
                </div>
                <span className="text-[11px] font-mono text-text-dim">
                  {Object.values(providerSettings).filter((setting) => setting.verified).length} verified
                </span>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-border bg-base/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">Ollama</h3>
                      <p className="text-xs text-text-secondary">Local-first models for mission control on this machine.</p>
                    </div>
                    <span className={`text-[11px] font-mono ${providerSettings.ollama.verified ? 'text-accent-cyan' : 'text-text-dim'}`}>
                      {providerSettings.ollama.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <Input
                    label="Base URL"
                    value={providerSettings.ollama.baseUrl}
                    onChange={(e) => updateProviderSettings('ollama', { baseUrl: e.target.value })}
                  />
                  <Button variant="secondary" onClick={verifyOllama} disabled={isVerifyingOllama}>
                    <RefreshCcw size={14} />
                    {isVerifyingOllama ? 'Checking...' : 'Verify Ollama'}
                  </Button>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-base/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">Gemini</h3>
                      <p className="text-xs text-text-secondary">Cloud model option for higher-end strategic and creative tasks.</p>
                    </div>
                    <span className={`text-[11px] font-mono ${providerSettings.gemini.verified ? 'text-accent-cyan' : 'text-text-dim'}`}>
                      {providerSettings.gemini.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <Input
                    label="Gemini API Key"
                    type="password"
                    placeholder={providerSettings.gemini.maskedKey || 'Paste API key'}
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                  />
                  {providerSettings.gemini.maskedKey && (
                    <p className="text-[11px] font-mono text-text-dim flex items-center gap-1.5">
                      <KeyRound size={12} />
                      Saved locally as {providerSettings.gemini.maskedKey}
                    </p>
                  )}
                  <Button variant="secondary" onClick={verifyGemini} disabled={isVerifyingGemini}>
                    <Sparkles size={14} />
                    {isVerifyingGemini ? 'Checking...' : 'Verify Gemini'}
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-heading font-semibold text-text-primary mb-4">Agency System Defaults</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Agents', value: agents.length },
                  { label: 'Programs', value: campaigns.length },
                  { label: 'Clients', value: clients.length },
                  { label: 'Missions', value: missions.length },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-4 rounded-xl bg-base border border-border">
                    <p className="text-2xl font-heading font-bold text-text-primary">{stat.value}</p>
                    <p className="text-xs text-text-dim mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-base p-4">
                  <p className="text-xs font-mono text-text-dim uppercase mb-1">Theme posture</p>
                  <p className="text-sm text-text-primary flex items-center gap-2">
                    <SunMedium size={14} className="text-accent-yellow" />
                    {agencySettings.themeMode === 'dark' ? 'Dark command center' : 'Light studio mode'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-base p-4">
                  <p className="text-xs font-mono text-text-dim uppercase mb-1">Model registry</p>
                  <p className="text-sm text-text-primary">
                    {MODEL_OPTIONS.length} configured model options across Ollama and Gemini
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-heading font-semibold text-text-primary mb-4">Import / Export</h2>
              <p className="text-xs text-text-secondary mb-4">Export or hydrate the full agency state, including tasks, clients, outputs, optional programs, and provider settings.</p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleExport}>
                  <Download size={14} />
                  Export Config
                </Button>
                <label>
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-base border border-border text-sm text-text-secondary hover:border-border-glow hover:text-text-primary transition-all cursor-pointer">
                    <Upload size={14} />
                    Import Config
                  </span>
                </label>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-heading font-semibold text-text-primary mb-4">Integrations</h2>
              <p className="text-xs text-text-secondary mb-4">Connect your external accounts to enable seamless data sync and reporting.</p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Google</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Google Docs', service: 'google-docs' },
                      { label: 'Google Sheets', service: 'google-sheets' },
                      { label: 'Google Ads', service: 'google-ads' },
                    ].map(({ label, service }) => (
                      <div key={service} className="flex items-center justify-between py-2 px-3 rounded-lg bg-base/60 border border-border">
                        <span className="text-sm text-text-primary">{label}</span>
                        <div className="flex items-center gap-3">
                          <Badge color="#6b7280" variant="outline">Disconnected</Badge>
                          <Button
                            variant="secondary"
                            onClick={() => window.location.href = `/api/auth/google?service=${service}`}
                          >
                            Connect
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Meta</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-base/60 border border-border">
                      <span className="text-sm text-text-primary">Meta Ads</span>
                      <div className="flex items-center gap-3">
                        <Badge color="#6b7280" variant="outline">Disconnected</Badge>
                        <Button
                          variant="secondary"
                          onClick={() => window.location.href = '/api/auth/meta'}
                        >
                          Connect
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
