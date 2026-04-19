'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAgentsStore, ChatMessage } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { clsx } from 'clsx'
import { getModelLabel, getProviderLabel } from '@/lib/providers'
import { Paperclip, Send, Sparkles, X, Image, FileText, File, AlertCircle, Loader2, Plus, RefreshCw } from 'lucide-react'
import { buildTaskTitleFromRequest } from '@/lib/task-output'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

const IRIS = {
  id: 'iris',
  name: 'Iris',
  role: 'Operations Lead',
  avatar: 'bot-purple',
  color: '#a78bfa',
  status: 'active' as const,
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={14} className="text-accent-purple" />
  if (type.includes('pdf')) return <FileText size={14} className="text-accent-red" />
  if (type.includes('sheet') || type.includes('excel')) return <FileText size={14} className="text-accent-green" />
  return <File size={14} className="text-accent-blue" />
}

function looksLikeSavedDeliverable(content: string) {
  const trimmed = content.trim()
  if (!trimmed) return false

  const lower = trimmed.toLowerCase()
  const invalidPatterns = [
    'task routed to',
    'lead agent',
    'status: in progress',
    'delivery:',
    'next steps:',
    'i have not drafted the deliverable yet',
    'no completed or delivered file exists',
  ]

  if (invalidPatterns.some((pattern) => lower.includes(pattern))) return false
  if (trimmed.length < 120) return false

  return true
}

function passesQualityGate(meta?: ChatMessage['meta']) {
  const quality = (meta as any)?.quality
  if (!quality) return true
  return quality.ok !== false
}

async function requestChat(
  payload: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: (meta?: ChatMessage['meta']) => void,
  onError: (err: string) => void,
  signal?: AbortSignal
) {
  try {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      console.warn('[requestChat] No auth session — request will likely fail')
    }

    console.log('[requestChat] Sending to /api/chat...')
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal,
    })

    let data: any
    try {
      data = await response.json()
    } catch {
      console.error('[requestChat] Failed to parse response JSON, status:', response.status)
      onError(`Server returned invalid response (HTTP ${response.status}). Please try again.`)
      return
    }

    console.log('[requestChat] Response status:', response.status, 'has response:', !!data?.response, 'length:', data?.response?.length || 0)

    if (!response.ok) {
      onError(data.error || `Request failed (HTTP ${response.status})`)
      return
    }

    if (!data.response) {
      onError('The model returned an empty response. Try rephrasing or starting a new chat.')
      return
    }

    onChunk(data.response)
    onDone(data.meta)
  } catch (err: any) {
    if (err.name === 'AbortError') return // cancelled by user — not an error
    console.error('[requestChat] Error:', err)
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
  const updateAgentStatus = useAgentsStore((state) => state.updateAgentStatus)
  const updateAgentTask = useAgentsStore((state) => state.updateAgentTask)

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachedText, setAttachedText] = useState<string>('')
  const [lastPayload, setLastPayload] = useState<Record<string, unknown> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

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

  // Extract text from files
  const extractFileText = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('text/') || file.type === 'application/json') {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve(`[Could not read file: ${file.name}]`)
        reader.readAsText(file)
      } else if (file.type.startsWith('image/')) {
        // For images, we'll include a placeholder - actual vision would need API support
        resolve(`[Image file: ${file.name} - ${(file.size / 1024).toFixed(1)}KB]`)
      } else {
        resolve(`[File: ${file.name} - ${(file.size / 1024).toFixed(1)}KB - ${file.type}]`)
      }
    })
  }

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setAttachments(prev => [...prev, ...files])
    // Extract text from each file
    const texts = await Promise.all(files.map(extractFileText))
    setAttachedText(prev => prev + '\n\n' + texts.join('\n\n'))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    updateAgentStatus('iris', 'idle')
    setChatStatus('idle')
  }, [setChatStatus, updateAgentStatus])

  const runChat = useCallback(async (payload: Record<string, unknown>, createdMissionId: string, userMsg: string, conversationId?: string) => {
    const convId = conversationId || activeConversationId || ''
    if (!convId) {
      console.error('[IrisChat] runChat called with empty convId — aborting')
      setError('No active conversation. Please start a new chat.')
      setChatStatus('idle')
      return
    }
    abortRef.current = new AbortController()
    setLastPayload(payload)
    setChatStatus('thinking')
    updateAgentStatus('iris', 'active')
    updateAgentTask('iris', userMsg.slice(0, 60))
    let fullResponse = ''

    console.log('[IrisChat] runChat — convId:', convId, 'isTask:', !!createdMissionId)

    try {
      await requestChat(
        payload,
        (chunk) => {
          try {
            fullResponse += chunk
            setChatStatus('streaming')
            upsertAssistantDraft(convId, fullResponse, 'iris', { missionId: createdMissionId })
          } catch (e) {
            console.error('[IrisChat] onChunk error:', e)
          }
        },
        (meta) => {
          try {
            console.log('[IrisChat] onDone — response length:', fullResponse.length, 'conversational:', !!(meta as any)?.conversational)
            // Conversational responses — just add the message, no missions or artifacts
            if ((meta as any)?.conversational || !createdMissionId) {
              addAssistantMessage(convId, fullResponse, 'iris', meta)
              updateAgentStatus('iris', 'idle')
              setChatStatus('idle')
              return
            }

            // Task responses — full mission/artifact handling
            const missionForArtifact = missions.find((mission) => mission.id === createdMissionId) || activeMission
            const deliverableType = (meta?.deliverableType as any) || missionForArtifact?.deliverableType || 'status-report'
            const taskTitle = buildTaskTitleFromRequest(userMsg, deliverableType)
            const hasUsableDeliverable = looksLikeSavedDeliverable(fullResponse) && passesQualityGate(meta)
            const artifactId = hasUsableDeliverable
              ? addArtifact({
                  title: taskTitle,
                  deliverableType,
                  status: 'draft',
                  format: 'html',
                  content: fullResponse,
                  renderedHtml: meta?.renderedHtml,
                  sourcePrompt: meta?.executionPrompt,
                  notes:
                    (meta as any)?.quality?.ok === false
                      ? `Quality gate flagged issues: ${((meta as any)?.quality?.issues || []).join(' | ')}`
                      : meta?.handoffNotes || 'Generated by Iris',
                  clientId: meta?.clientId || activeMission?.clientId,
                  campaignId: meta?.campaignId || activeMission?.campaignId,
                  missionId: createdMissionId,
                  agentId: meta?.leadAgentId || meta?.routedAgentId || 'iris',
                  executionSteps: meta?.executionSteps || [],
                })
              : undefined
            addAssistantMessage(convId, fullResponse, meta?.routedAgentId || 'iris', { ...meta, missionId: createdMissionId, artifactId })
            updateMission(createdMissionId, {
              title: taskTitle,
              summary: userMsg,
              deliverableType,
              status: hasUsableDeliverable ? 'review' : 'blocked',
              progress: hasUsableDeliverable ? 75 : 15,
              assignedAgentIds: meta?.assignedAgentIds?.length ? meta.assignedAgentIds : meta?.routedAgentId && meta.routedAgentId !== 'iris' ? ['iris', meta.routedAgentId] : ['iris'],
              leadAgentId: meta?.leadAgentId || meta?.routedAgentId || 'iris',
              collaboratorAgentIds: meta?.collaboratorAgentIds || [],
              pipelineId: meta?.pipelineId || undefined,
              pipelineName: meta?.pipelineName || undefined,
              qualityChecklist: meta?.qualityChecklist || [],
              handoffNotes: hasUsableDeliverable
                ? meta?.handoffNotes || undefined
                : (meta as any)?.quality?.ok === false
                  ? `Quality gate failed: ${((meta as any)?.quality?.issues || []).join(' | ')}`
                  : 'Iris did not return a usable deliverable. Re-run the task or check provider settings.',
              clientId: meta?.clientId || activeMission?.clientId,
              campaignId: meta?.campaignId || activeMission?.campaignId,
            })
            rememberAgentWork('iris', {
              title: userMsg.slice(0, 48),
              summary: `Handled: ${userMsg.slice(0, 120)}`,
              clientId: meta?.clientId || activeMission?.clientId,
              campaignId: meta?.campaignId || activeMission?.campaignId,
              missionId: createdMissionId,
              conversationId: convId || undefined,
            })
            if (meta?.leadAgentId && meta.leadAgentId !== 'iris') {
              rememberAgentWork(meta.leadAgentId, {
                title: userMsg.slice(0, 48),
                summary: `Lead on task: ${taskTitle}`,
                clientId: meta?.clientId || activeMission?.clientId,
                campaignId: meta?.campaignId || activeMission?.campaignId,
                missionId: createdMissionId,
                conversationId: convId || undefined,
              })
            }
            for (const collaboratorId of meta?.collaboratorAgentIds || []) {
              rememberAgentWork(collaboratorId, {
                title: userMsg.slice(0, 48),
                summary: `Supporting task: ${taskTitle}`,
                clientId: meta?.clientId || activeMission?.clientId,
                campaignId: meta?.campaignId || activeMission?.campaignId,
                missionId: createdMissionId,
                conversationId: convId || undefined,
              })
            }
            // Reset agent statuses on completion
            updateAgentStatus('iris', 'idle')
            if (meta?.leadAgentId && meta.leadAgentId !== 'iris') {
              updateAgentStatus(meta.leadAgentId, 'idle')
            }
            setChatStatus('idle')
          } catch (e) {
            console.error('[IrisChat] onDone error:', e)
            // Still ensure status resets even if task handling fails
            addAssistantMessage(convId, fullResponse || 'An error occurred processing the response.', 'iris', meta)
            updateAgentStatus('iris', 'idle')
            setChatStatus('idle')
          }
        },
        (err) => {
          console.error('[IrisChat] onError:', err)
          setError(err)
          updateAgentStatus('iris', 'idle')
          if (createdMissionId) {
            updateMission(createdMissionId, {
              status: 'blocked',
              progress: 0,
              handoffNotes: err,
            })
          }
          setChatStatus('idle')
        },
        abortRef.current?.signal
      )
    } catch (e: any) {
      // Catch-all: if requestChat itself throws (e.g. JSON serialization, network)
      console.error('[IrisChat] runChat catch-all:', e)
      setError(e?.message || 'Something went wrong. Please try again.')
      updateAgentStatus('iris', 'idle')
      setChatStatus('idle')
    }
    abortRef.current = null
  }, [activeConversationId, activeMission, missions, addArtifact, addAssistantMessage, updateMission, rememberAgentWork, upsertAssistantDraft, setChatStatus, updateAgentStatus, updateAgentTask])

  const handleSend = useCallback(async () => {
    if (!input.trim() && attachments.length === 0 && !attachedText) return
    if (!activeConversationId) {
      console.warn('[IrisChat] handleSend — no activeConversationId')
      return
    }
    if (chatStatus !== 'idle') {
      console.warn('[IrisChat] handleSend — chatStatus is', chatStatus, '(not idle), ignoring')
      return
    }

    const userMsg = input.trim()
    const attachmentContent = attachedText.trim()
    const fullMessage = attachmentContent
      ? `${userMsg}\n\n[Attached files context]\n${attachmentContent}`
      : userMsg

    setInput('')
    setError(null)
    setAttachments([])
    setAttachedText('')
    sendMessage(activeConversationId, userMsg)

    // Detect if this is casual conversation vs. an actionable task
    const taskKeywords = /\b(create|make|build|draft|generate|write|produce|design|plan|schedule|audit|analyze|research|forecast|calendar|campaign|brief|copy|content calendar|media plan|budget|strategy|kpi|seo|competitor|carousel|caption|social post|hashtag|visual|banner|ad creative|launch plan|report)\b/i
    const isTask = taskKeywords.test(userMsg)

    // Only create a mission for actual tasks
    const createdMissionId = isTask
      ? createMissionFromPrompt(userMsg, {
          clientId: activeMission?.clientId,
          campaignId: activeMission?.campaignId,
        })
      : ''

    // Build messages array — only send role + content to keep payload small
    const recentMessages = (activeConv?.messages || []).slice(-6).map((m) => ({ role: m.role, content: m.content }))
    const payload: Record<string, unknown> = {
      provider: irisAgent?.provider || agencySettings.defaultProvider,
      model: irisAgent?.model || agencySettings.defaultModel,
      temperature: irisAgent?.temperature || 0.7,
      maxTokens: irisAgent?.maxTokens || 4096,
      messages: [...recentMessages, { role: 'user', content: fullMessage }],
      systemPrompt: irisAgent?.systemPrompt,
      providerSettings,
      ...(isTask ? {
        agentMemories,
        artifacts: artifacts.slice(0, 12),
        agents: agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          specialty: agent.specialty,
          role: agent.role,
          skills: agent.skills,
          tools: agent.tools,
          systemPrompt: agent.systemPrompt,
          provider: agent.provider,
          model: agent.model,
        })),
        clients: clients.map((client) => ({
          id: client.id,
          name: client.name,
          industry: client.industry,
          description: client.description,
          targetAudiences: client.targetAudiences,
          productsAndServices: client.productsAndServices,
          toneOfVoice: client.toneOfVoice,
          strategicPriorities: client.strategicPriorities,
        })),
        missions: missions.slice(0, 8),
        currentClientId: activeMission?.clientId,
        currentCampaignId: activeMission?.campaignId,
        missionId: createdMissionId,
      } : {
        // Lightweight payload for conversation — just agent/client names for context
        agents: agents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
        clients: clients.map((c) => ({ id: c.id, name: c.name, industry: c.industry })),
        missions: missions.slice(0, 5).map((m) => ({ title: m.title })),
      }),
    }

    console.log('[IrisChat] handleSend — sending message:', userMsg.slice(0, 60), 'isTask:', isTask, 'convId:', activeConversationId)

    try {
      await runChat(payload, createdMissionId, userMsg, activeConversationId)
    } catch (e: any) {
      console.error('[IrisChat] handleSend catch-all:', e)
      setError(e?.message || 'Failed to send message')
      setChatStatus('idle')
      updateAgentStatus('iris', 'idle')
    }
  }, [input, attachments, attachedText, activeConversationId, chatStatus, activeConv, activeMission, agents, clients, missions, artifacts, agentMemories, providerSettings, agencySettings, irisAgent, sendMessage, createMissionFromPrompt, runChat, setChatStatus, updateAgentStatus])

  const handleRetry = useCallback(async () => {
    if (!lastPayload || !activeConversationId) return
    setError(null)
    const userMsg = (lastPayload.messages as any[])?.findLast?.((m: any) => m.role === 'user')?.content?.slice(0, 48) || 'Retried task'
    const missionId = (lastPayload.missionId as string) || ''
    await runChat(lastPayload, missionId, userMsg)
  }, [lastPayload, activeConversationId, runChat])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startNewChat = () => {
    const id = createConversation('New Chat')
    setActiveConversation(id)
  }

  if (!isIrisOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closeIris} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#12141a] border-l border-[#2a2d38] z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#2a2d38]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${IRIS.color}20` }}>
            <Sparkles size={18} style={{ color: IRIS.color }} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white">{IRIS.name}</h2>
            <p className="text-xs text-gray-400">
              {getModelLabel(irisAgent?.model || agencySettings.defaultModel)} · {getProviderLabel(irisAgent?.provider || agencySettings.defaultProvider)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {chatStatus === 'idle' && (
              <span className="w-2 h-2 rounded-full bg-green-500" aria-label="Ready" title="Ready" />
            )}
            {(chatStatus === 'thinking' || chatStatus === 'streaming') && (
              <button
                onClick={cancelRequest}
                className="px-2 py-1 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 rounded-lg border border-yellow-400/30 transition-colors"
                aria-label="Cancel request"
                title="Cancel"
              >
                Cancel
              </button>
            )}
            <button
              onClick={startNewChat}
              className="p-2 hover:bg-[#1a1d26] rounded-lg text-gray-400 hover:text-white transition-colors"
              aria-label="Start new chat"
              title="New chat"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={closeIris}
              className="p-2 hover:bg-[#1a1d26] rounded-lg text-gray-400 hover:text-white transition-colors"
              aria-label="Close Iris"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!activeConv || activeConv.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${IRIS.color}15` }}>
                <AgentBot name={IRIS.name} avatar={IRIS.avatar} color={IRIS.color} status="active" animation="idle" size={64} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Chat with Iris</h3>
              <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-8">
                Ask anything about your clients, campaigns, or agency operations. Attach files for context.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {[
                  { label: 'Create a content calendar', icon: '📅', desc: 'Plan posts for a client' },
                  { label: 'Draft a campaign brief', icon: '📋', desc: 'Full strategy document' },
                  { label: 'Research competitors', icon: '🔍', desc: 'Market analysis report' },
                  { label: 'What can you do?', icon: '💬', desc: 'Explore agency capabilities' },
                ].map((s) => (
                  <button key={s.label} onClick={() => setInput(s.label)} className="text-left px-4 py-3 rounded-xl bg-[#1a1d26] border border-[#2a2d38] text-sm text-gray-300 hover:text-white hover:border-[#9b6dff] transition-all group">
                    <div className="flex items-center gap-3">
                      <span className="text-base">{s.icon}</span>
                      <div>
                        <p className="font-medium group-hover:text-white transition-colors">{s.label}</p>
                        <p className="text-[10px] text-gray-500">{s.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {activeConv.messages.map((msg, i) => {
                const isUser = msg.role === 'user'
                const showAvatar = !isUser && (i === 0 || activeConv.messages[i - 1].role === 'user')
                return (
                  <div key={`${msg.id}-${i}`} className={clsx('flex gap-3', isUser && 'flex-row-reverse')}>
                    {!isUser && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${IRIS.color}20` }}>
                        <AgentBot name={IRIS.name} avatar={IRIS.avatar} color={IRIS.color} status="active" animation="idle" size={28} />
                      </div>
                    )}
                    <div className={clsx('max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      isUser
                        ? 'bg-[#9b6dff] text-white rounded-tr-sm'
                        : 'bg-[#1a1d26] text-gray-200 border border-[#2a2d38] rounded-tl-sm'
                    )}>
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:bg-[#0f111a] prose-pre:border prose-pre:border-[#2a2d38] prose-code:text-[#a78bfa] prose-code:bg-[#1a1d26] prose-code:px-1 prose-code:rounded prose-a:text-[#9b6dff]">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                      <p className={clsx('text-[10px] mt-2 opacity-60', isUser ? 'text-right' : 'text-gray-500')}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                )
              })}
              
              {/* Streaming indicator */}
              {chatStatus === 'thinking' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${IRIS.color}20` }}>
                    <Loader2 size={16} className="animate-spin" style={{ color: IRIS.color }} />
                  </div>
                  <div className="bg-[#1a1d26] border border-[#2a2d38] rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm text-gray-400">Thinking...</p>
                  </div>
                </div>
              )}
              
              {chatStatus === 'streaming' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${IRIS.color}20` }}>
                    <AgentBot name={IRIS.name} avatar={IRIS.avatar} color={IRIS.color} status="active" animation="idle" size={28} />
                  </div>
                  <div className="bg-[#1a1d26] border border-[#2a2d38] rounded-2xl rounded-tl-sm px-4 py-3">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#9b6dff] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="inline-block w-2 h-2 rounded-full bg-[#9b6dff] animate-bounce mx-0.5" style={{ animationDelay: '150ms' }} />
                    <span className="inline-block w-2 h-2 rounded-full bg-[#9b6dff] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              
              {/* Error */}
              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm">
                  <div className="flex items-start gap-2 text-red-400">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span className="flex-1">{error}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {lastPayload && (
                      <button
                        onClick={handleRetry}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs transition-colors"
                        aria-label="Retry the last request"
                      >
                        <RefreshCw size={12} />
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => { setError(null); setChatStatus('idle') }}
                      className="px-3 py-1.5 text-gray-500 hover:text-gray-300 rounded-lg text-xs transition-colors"
                      aria-label="Dismiss error"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-5 py-2 border-t border-[#2a2d38]">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-xs text-gray-300">
                  {getFileIcon(file.type)}
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button onClick={() => removeAttachment(i)} className="text-gray-500 hover:text-red-400">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-[#2a2d38]">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex bg-[#1a1d26] border border-[#2a2d38] rounded-xl focus-within:border-[#9b6dff] transition-colors overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  // auto-expand
                  e.target.style.height = 'auto'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message Iris..."
                rows={1}
                aria-label="Message input"
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-gray-500 outline-none resize-none overflow-y-auto"
                style={{ minHeight: '44px', maxHeight: '128px' }}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.json"
                onChange={handleFileAttach}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-500 hover:text-white transition-colors flex-shrink-0"
                aria-label="Attach files"
                title="Attach files"
              >
                <Paperclip size={18} />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0 && !attachedText) || chatStatus !== 'idle'}
              aria-label="Send message"
              className={clsx(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                (input.trim() || attachments.length > 0 || attachedText) && chatStatus === 'idle'
                  ? 'bg-[#9b6dff] text-white hover:bg-[#9b6dff]/80'
                  : 'bg-[#1a1d26] text-gray-500 cursor-not-allowed'
              )}
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-2 text-center">
            Attach images, PDFs, Excel, or Word files for context
          </p>
        </div>
      </div>
    </>
  )
}
