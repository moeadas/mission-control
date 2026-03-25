'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAgentsStore, ChatMessage } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { clsx } from 'clsx'
import { getModelLabel, getProviderLabel } from '@/lib/providers'
import { Paperclip, Send, Sparkles, X, Image, FileText, File, CheckCircle2, AlertCircle, Loader2, Plus, MessageSquare } from 'lucide-react'

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
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachedText, setAttachedText] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleSend = useCallback(async () => {
    if (!input.trim() && attachments.length === 0 && !attachedText) return
    if (!activeConversationId || chatStatus !== 'idle') return

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
        messages: [...(activeConv?.messages || []), { role: 'user', content: fullMessage }],
        systemPrompt: irisAgent?.systemPrompt,
        providerSettings,
        agentMemories,
        artifacts: artifacts.slice(0, 12),
        agents: agents.map((agent) => ({ id: agent.id, name: agent.name, specialty: agent.specialty, role: agent.role })),
        clients: clients.map((client) => ({ id: client.id, name: client.name, industry: client.industry })),
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
        const artifactId = fullResponse.trim()
          ? addArtifact({
              title: userMsg.slice(0, 60),
              deliverableType,
              status: 'draft',
              format: 'markdown',
              content: fullResponse,
              sourcePrompt: meta?.executionPrompt,
              notes: 'Generated by Iris',
              clientId: meta?.clientId || activeMission?.clientId,
              campaignId: meta?.campaignId || activeMission?.campaignId,
              missionId: createdMissionId,
              agentId: meta?.routedAgentId || 'iris',
            })
          : undefined
        addAssistantMessage(activeConversationId, fullResponse, meta?.routedAgentId || 'iris', { ...meta, missionId: createdMissionId, artifactId })
        updateMission(createdMissionId, {
          title: userMsg.slice(0, 60),
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
          summary: `Handled: ${userMsg.slice(0, 120)}`,
          clientId: meta?.clientId || activeMission?.clientId,
          campaignId: meta?.campaignId || activeMission?.campaignId,
          missionId: createdMissionId,
          conversationId: activeConversationId,
        })
        setChatStatus('idle')
      },
      (err) => {
        setError(err)
        setChatStatus('error')
      }
    )
  }, [input, attachments, attachedText, activeConversationId, chatStatus])

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
              <span className="w-2 h-2 rounded-full bg-green-500" title="Ready" />
            )}
            {chatStatus === 'thinking' && (
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Thinking..." />
            )}
            <button onClick={startNewChat} className="p-2 hover:bg-[#1a1d26] rounded-lg text-gray-400 hover:text-white transition-colors" title="New chat">
              <Plus size={18} />
            </button>
            <button onClick={closeIris} className="p-2 hover:bg-[#1a1d26] rounded-lg text-gray-400 hover:text-white transition-colors">
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
                  'What campaigns need attention?',
                  'Show me the agency status',
                  'Plan a content calendar for a new client',
                  'Route a campaign brief for TechStart',
                ].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="text-left px-4 py-3 rounded-xl bg-[#1a1d26] border border-[#2a2d38] text-sm text-gray-300 hover:text-white hover:border-[#9b6dff] transition-all">
                    {s}
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
                      <p className="whitespace-pre-wrap">{msg.content}</p>
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
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
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
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Iris..."
                rows={1}
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-gray-500 outline-none resize-y max-h-32"
                style={{ minHeight: '44px' }}
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
                title="Attach files"
              >
                <Paperclip size={18} />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0 && !attachedText) || chatStatus !== 'idle'}
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
