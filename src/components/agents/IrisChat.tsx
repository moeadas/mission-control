'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, Send, Sparkles, Target, Trash2, X } from 'lucide-react'
import { useAgentsStore, ChatMessage } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { clsx } from 'clsx'
import { getModelLabel, getProviderLabel } from '@/lib/providers'
import { buildTaskTitleFromRequest } from '@/lib/task-output'

const IRIS = {
  id: 'iris',
  name: 'Iris',
  role: 'Personal Assistant & Traffic Manager',
  avatar: 'bot-purple',
  color: '#a78bfa',
  status: 'active' as const,
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatConversationTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function getConversationPreview(message?: ChatMessage) {
  if (!message?.content) return 'No messages yet'
  return message.content.length > 42 ? `${message.content.slice(0, 39)}...` : message.content
}

async function requestChat(
  payload: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: (meta?: ChatMessage['meta']) => void,
  onError: (err: string) => void
) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      onError(data.error || 'Request failed')
      return
    }

    onChunk(data.response || '')
    onDone(data.meta)
  } catch (err: any) {
    onError(err.message || 'Network error')
  }
}

export function IrisChat() {
  const isIrisOpen = useAgentsStore((state) => state.isIrisOpen)
  const closeIris = useAgentsStore((state) => state.closeIris)
  const conversations = useAgentsStore((state) => state.conversations)
  const activeConversationId = useAgentsStore((state) => state.activeConversationId)
  const setActiveConversation = useAgentsStore((state) => state.setActiveConversation)
  const createConversation = useAgentsStore((state) => state.createConversation)
  const sendMessage = useAgentsStore((state) => state.sendMessage)
  const upsertAssistantDraft = useAgentsStore((state) => state.upsertAssistantDraft)
  const addAssistantMessage = useAgentsStore((state) => state.addAssistantMessage)
  const clearConversation = useAgentsStore((state) => state.clearConversation)
  const agents = useAgentsStore((state) => state.agents)
  const clients = useAgentsStore((state) => state.clients)
  const missions = useAgentsStore((state) => state.missions)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const activeMissionId = useAgentsStore((state) => state.activeMissionId)
  const createMissionFromPrompt = useAgentsStore((state) => state.createMissionFromPrompt)
  const addArtifact = useAgentsStore((state) => state.addArtifact)
  const updateMission = useAgentsStore((state) => state.updateMission)
  const providerSettings = useAgentsStore((state) => state.providerSettings)
  const agencySettings = useAgentsStore((state) => state.agencySettings)
  const agentMemories = useAgentsStore((state) => state.agentMemories)
  const chatStatus = useAgentsStore((state) => state.chatStatus)
  const setChatStatus = useAgentsStore((state) => state.setChatStatus)
  const rememberAgentWork = useAgentsStore((state) => state.rememberAgentWork)

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeConv = conversations.find((conversation) => conversation.id === activeConversationId)
  const irisAgent = agents.find((agent) => agent.id === 'iris')
  const activeMission = missions.find((mission) => mission.id === activeMissionId)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages.length, chatStatus])

  useEffect(() => {
    if (isIrisOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isIrisOpen])

  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeConversationId || chatStatus !== 'idle') return

    const userMsg = input.trim()
    setInput('')
    setError(null)
    sendMessage(activeConversationId, userMsg)

    const createdMissionId = createMissionFromPrompt(userMsg, {
      clientId: activeMission?.clientId,
      campaignId: activeMission?.campaignId,
    })

    setChatStatus('thinking')
    let fullResponse = ''

    await requestChat(
      {
        provider: irisAgent?.provider || agencySettings.defaultProvider,
        model: irisAgent?.model || agencySettings.defaultModel,
        temperature: irisAgent?.temperature || 0.7,
        maxTokens: irisAgent?.maxTokens || 1024,
        messages: [...(activeConv?.messages || []), { role: 'user', content: userMsg }],
        systemPrompt: irisAgent?.systemPrompt,
        providerSettings,
        agentMemories,
        artifacts: artifacts
          .filter((artifact) => !activeMission?.clientId || artifact.clientId === activeMission.clientId)
          .slice(0, 12),
        agents: agents.map((agent) => ({ id: agent.id, name: agent.name, specialty: agent.specialty, role: agent.role })),
        clients: clients.map((client) => ({
          id: client.id,
          name: client.name,
          industry: client.industry,
          description: client.description,
          missionStatement: client.missionStatement,
          brandPromise: client.brandPromise,
          targetAudiences: client.targetAudiences,
          productsAndServices: client.productsAndServices,
          usp: client.usp,
          keyMessages: client.keyMessages,
          toneOfVoice: client.toneOfVoice,
          strategicPriorities: client.strategicPriorities,
          notes: client.notes,
        })),
        missions: missions.slice(0, 8),
        currentClientId: activeMission?.clientId,
        currentCampaignId: activeMission?.campaignId,
      },
      (chunk) => {
        fullResponse += chunk
        setChatStatus('streaming')
        upsertAssistantDraft(activeConversationId, fullResponse, 'iris', { missionId: createdMissionId })
      },
      (meta) => {
        const missionForArtifact = missions.find((mission) => mission.id === createdMissionId) || activeMission
        const deliverableType = (meta?.deliverableType as any) || missionForArtifact?.deliverableType || 'status-report'
        const taskTitle = buildTaskTitleFromRequest(userMsg, deliverableType)
        const artifactId = fullResponse.trim()
          ? addArtifact({
              title: taskTitle,
              deliverableType,
              status: 'draft',
              format: 'markdown',
              content: fullResponse,
              sourcePrompt: meta?.executionPrompt,
              notes: 'Generated by Iris chat and stored as an internal app artifact. Not delivered externally unless marked delivered.',
              clientId: meta?.clientId || activeMission?.clientId,
              campaignId: meta?.campaignId || activeMission?.campaignId,
              missionId: createdMissionId,
              agentId: meta?.routedAgentId || 'iris',
              creative:
                deliverableType === 'creative-asset'
                  ? {
                      assetType: 'social-post',
                      visualDirection: 'Premium scientific creative with clear hierarchy and clean educational storytelling.',
                      imagePrompt: meta?.executionPrompt || fullResponse,
                      aspectRatio: userMsg.toLowerCase().includes('story') ? '9:16' : userMsg.toLowerCase().includes('carousel') ? '4:5' : '1:1',
                      referenceNotes: '',
                      deliverableSpecs: [],
                      assetUrl: '',
                      assetPath: '',
                    }
                  : undefined,
            })
          : undefined
        addAssistantMessage(activeConversationId, fullResponse, meta?.routedAgentId || 'iris', {
          ...meta,
          missionId: createdMissionId,
          artifactId,
        })
        updateMission(createdMissionId, {
          title: taskTitle,
          summary: userMsg,
          deliverableType,
          status: fullResponse.trim() ? 'review' : 'in_progress',
          progress: fullResponse.trim() ? 75 : 35,
          assignedAgentIds: meta?.routedAgentId && meta.routedAgentId !== 'iris' ? ['iris', meta.routedAgentId] : ['iris'],
          clientId: meta?.clientId || activeMission?.clientId,
          campaignId: meta?.campaignId || activeMission?.campaignId,
        })
        rememberAgentWork('iris', {
          title: userMsg.slice(0, 48),
          summary: `Handled: ${userMsg.slice(0, 120)} | Replied: ${fullResponse.slice(0, 160)}`,
          clientId: meta?.clientId || activeMission?.clientId,
          campaignId: meta?.campaignId || activeMission?.campaignId,
          missionId: createdMissionId,
          conversationId: activeConversationId,
        })
        if (meta?.routedAgentId && meta.routedAgentId !== 'iris') {
          rememberAgentWork(meta.routedAgentId, {
            title: userMsg.slice(0, 48),
            summary: `Supported: ${fullResponse.slice(0, 160)}`,
            clientId: meta?.clientId || activeMission?.clientId,
            campaignId: meta?.campaignId || activeMission?.campaignId,
            missionId: createdMissionId,
            conversationId: activeConversationId,
          })
        }
        setChatStatus('idle')
      },
      (err) => {
        setError(err)
        setChatStatus('error')
      }
    )
  }, [
    input,
    activeConversationId,
    chatStatus,
    sendMessage,
    createMissionFromPrompt,
    addArtifact,
    updateMission,
    activeMission,
    setChatStatus,
    irisAgent,
    agencySettings,
    providerSettings,
    agentMemories,
    agents,
    clients,
    missions,
    artifacts,
    activeConv,
    upsertAssistantDraft,
    addAssistantMessage,
    rememberAgentWork,
  ])

  useEffect(() => {
    if (chatStatus === 'error') {
      const timeout = setTimeout(() => setChatStatus('idle'), 1500)
      return () => clearTimeout(timeout)
    }
  }, [chatStatus, setChatStatus])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startNewChat = () => {
    const id = createConversation('Chat with Iris')
    setActiveConversation(id)
  }

  if (!isIrisOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={closeIris} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-panel border-l border-border z-50 flex flex-col animate-slide-in-right shadow-2xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${IRIS.color}20` }}>
            <Sparkles size={16} style={{ color: IRIS.color }} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-heading font-semibold text-text-primary">{IRIS.name}</h2>
            <p className="text-[10px] font-mono" style={{ color: IRIS.color }}>{IRIS.role}</p>
            <p className="text-[10px] text-text-dim">
              {getModelLabel(irisAgent?.model || agencySettings.defaultModel)} via {getProviderLabel(irisAgent?.provider || agencySettings.defaultProvider)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {activeConversationId && (
              <button onClick={() => clearConversation(activeConversationId)} className="p-2 rounded-lg text-text-dim hover:text-text-secondary hover:bg-card transition-colors" title="Clear chat">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={closeIris} className="p-2 rounded-lg text-text-dim hover:text-text-primary hover:bg-card transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {activeMission && (
          <div className="px-4 py-3 border-b border-border bg-base/60 flex items-start gap-2">
            <Target size={14} className="text-accent-orange mt-0.5" />
            <div>
              <p className="text-[10px] font-mono uppercase text-text-dim">Active mission</p>
              <p className="text-sm text-text-primary">{activeMission.title}</p>
              <p className="text-[11px] text-text-secondary">{activeMission.summary}</p>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <div className="w-40 flex flex-col py-3 gap-2 border-r border-border flex-shrink-0 px-2">
            <button onClick={startNewChat} className="w-full h-9 rounded-lg flex items-center justify-center transition-all text-xs font-mono" style={{ background: `${IRIS.color}15`, border: `1px solid ${IRIS.color}30`, color: IRIS.color }} title="New chat">
              <span className="font-mono text-sm font-bold" style={{ color: IRIS.color }}>+</span>
              <span className="ml-2">New chat</span>
            </button>
            <div className="px-1">
              <p className="text-[10px] font-mono uppercase text-text-dim">History</p>
            </div>
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
              {conversations.slice(0, 8).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={clsx(
                    'w-full rounded-xl p-2 text-left transition-all border',
                    conv.id === activeConversationId
                      ? 'bg-card border-border-glow'
                      : 'bg-base/40 border-transparent hover:bg-card hover:border-border'
                  )}
                  title={conv.title}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare size={13} className="mt-0.5 flex-shrink-0" style={{ color: conv.id === activeConversationId ? IRIS.color : undefined }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-text-primary truncate">{conv.title || 'Chat with Iris'}</p>
                      <p className="text-[10px] text-text-dim truncate">
                        {getConversationPreview(conv.messages[conv.messages.length - 1])}
                      </p>
                      <p className="text-[9px] font-mono text-text-dim mt-1">{formatConversationTime(conv.updatedAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {!activeConv || activeConv.messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${IRIS.color}15` }}>
                  <AgentBot name={IRIS.name} avatar={IRIS.avatar} color={IRIS.color} status="active" animation="idle" size={56} />
                </div>
                <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">Iris runs the floor</h3>
                <p className="text-xs text-text-secondary max-w-[240px] leading-relaxed">
                  Brief her on a client problem, a campaign need, or an internal mission and she will route the work to the right unit.
                </p>
                <div className="mt-6 flex flex-col gap-2 w-full max-w-[240px]">
                  {[
                    'Plan a launch mission for TechStart',
                    'Give me the agency status by team',
                    'What should Bloom prioritize this week?',
                    'Route a content sprint for Urban Eats',
                  ].map((suggestion) => (
                    <button key={suggestion} onClick={() => setInput(suggestion)} className="text-left px-3 py-2 rounded-lg bg-base border border-border hover:border-border-glow text-xs text-text-secondary hover:text-text-primary transition-all">
                      → {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activeConv.messages.map((msg) => (
                    <div key={`${msg.id}-${msg.timestamp}`} className={clsx('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                      {msg.role === 'assistant' && (
                        <AgentBot name={IRIS.name} avatar={IRIS.avatar} color={IRIS.color} status="active" animation="idle" size={28} />
                      )}
                      <div className={clsx('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed', msg.role === 'user' ? 'bg-accent-purple/20 text-text-primary rounded-tr-sm' : 'bg-card border border-border text-text-primary rounded-tl-sm')}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.meta?.routedAgentId && (
                          <p className="text-[10px] font-mono text-text-dim mt-2">
                            Routed to {agents.find((agent) => agent.id === msg.meta?.routedAgentId)?.name || 'Iris'}
                          </p>
                        )}
                        {msg.meta?.fallbackUsed && (
                          <p className="text-[10px] font-mono text-amber-400 mt-1">
                            Gemini quota exhausted. Continued with {getProviderLabel(msg.meta.provider || 'ollama')}
                            {msg.meta.model ? ` · ${getModelLabel(msg.meta.model)}` : ''}.
                          </p>
                        )}
                        {!msg.meta?.fallbackUsed && msg.meta?.provider && msg.role === 'assistant' && (
                          <p className="text-[10px] font-mono text-text-dim mt-1">
                            Responded via {getProviderLabel(msg.meta.provider)}
                            {msg.meta.model ? ` · ${getModelLabel(msg.meta.model)}` : ''}
                          </p>
                        )}
                        <p className={clsx('text-[10px] font-mono mt-1 opacity-50', msg.role === 'user' ? 'text-right' : '')}>{formatTime(msg.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                  {chatStatus !== 'idle' && (
                    <div className="flex gap-2">
                      <AgentBot name={IRIS.name} avatar={IRIS.avatar} color={IRIS.color} status="active" animation="working" size={28} />
                      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <span key={i} className="w-2 h-2 rounded-full bg-text-dim animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {error && <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-2 text-xs text-red-400">{error}</div>}
                  <div ref={messagesEndRef} />
                </div>
                {chatStatus === 'idle' && (
                  <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
                    {['Status update by client', 'Create a new mission', 'What is blocking delivery?'].map((suggestion) => (
                      <button key={suggestion} onClick={() => setInput(suggestion)} className="flex-shrink-0 text-[10px] font-mono px-2.5 py-1.5 rounded-full bg-base border border-border text-text-dim hover:text-text-secondary hover:border-border-glow transition-all whitespace-nowrap">
                        {suggestion} →
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="p-3 border-t border-border flex-shrink-0">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Iris to coordinate the agency..."
                  rows={1}
                  className="flex-1 bg-base border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-dim resize-none focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/20 transition-all max-h-32"
                  style={{ minHeight: '42px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || chatStatus !== 'idle'}
                  className={clsx('w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0', input.trim() && chatStatus === 'idle' ? 'text-white active:scale-95' : 'text-text-dim cursor-not-allowed')}
                  style={input.trim() && chatStatus === 'idle' ? { background: IRIS.color } : {}}
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[10px] text-text-dim mt-1.5 px-1">
                {getModelLabel(irisAgent?.model || agencySettings.defaultModel)} via {getProviderLabel(irisAgent?.provider || agencySettings.defaultProvider)} · Press Enter to send
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
