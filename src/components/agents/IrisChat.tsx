'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useAgentsStore, ChatMessage } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { clsx } from 'clsx'
import { getModelLabel, getProviderLabel } from '@/lib/providers'
import { Paperclip, Send, Sparkles, X, Image, FileText, File, CheckCircle2, AlertCircle, Loader2, Plus, MessageSquare } from 'lucide-react'
import { buildTaskTitleFromRequest } from '@/lib/task-output'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { getDeliverableSpec, inferDeliverableTypeFromText, isSubstantiveRequest } from '@/lib/deliverables'
import {
  applyBriefAnswer,
  composeBriefedRequest,
  createPendingBrief,
  getBriefQuestion,
  isBriefComplete,
  type IrisPendingBrief,
} from '@/lib/iris-briefing'

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

function isLikelyDeliverableResponse(content: string) {
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
    'iris could not complete that request',
    'chat request failed',
  ]

  if (invalidPatterns.some((pattern) => lower.includes(pattern))) return false
  return trimmed.length >= 80
}

function buildAssignmentNote(meta?: ChatMessage['meta']) {
  if (!meta?.leadAgentId) return ''

  const collaborators = meta.collaboratorAgentIds?.length
    ? `Support: ${meta.collaboratorAgentIds.join(', ')}`
    : 'Support: none'
  const pipeline = meta.pipelineName ? `Pipeline: ${meta.pipelineName}` : 'Pipeline: direct execution'
  const confidence = (meta as any)?.confidence ? `Confidence: ${(meta as any).confidence}` : ''

  return [`Lead: ${meta.leadAgentId}`, collaborators, pipeline, confidence].filter(Boolean).join(' · ')
}

function shouldOpenMissionForMessage(message: string) {
  const trimmed = message.trim()
  if (!trimmed) return false

  const casualOnlyPatterns = [
    /^hi[.!? ]*$/i,
    /^hey[.!? ]*$/i,
    /^hello[.!? ]*$/i,
    /^yo[.!? ]*$/i,
    /^thanks?[.!? ]*$/i,
    /^ok[.!? ]*$/i,
    /^test(ing)?[.!? ]*$/i,
    /^why[.!? ]*$/i,
  ]

  if (casualOnlyPatterns.some((pattern) => pattern.test(trimmed))) return false
  const inferred = inferDeliverableTypeFromText(trimmed)
  if (inferred !== 'status-report') return true
  return isSubstantiveRequest(trimmed)
}

async function requestChat(
  payload: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: (meta?: ChatMessage['meta']) => void,
  onError: (err: string) => void
) {
  try {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      onError('Your session is not ready or has expired. Please sign in again and retry.')
      return
    }
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) {
      onError(data.error || 'Request failed')
      return
    }
    if (!data.response || !String(data.response).trim()) {
      onError('Iris did not return a usable response. Check provider settings and retry.')
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
  const pendingBriefs = useAgentsStore((state) => state.pendingBriefs)
  const setPendingBriefInStore = useAgentsStore((state) => state.setPendingBrief)
  const clearPendingBriefInStore = useAgentsStore((state) => state.clearPendingBrief)
  const chatStatus = useAgentsStore((state) => state.chatStatus)
  const setChatStatus = useAgentsStore((state) => state.setChatStatus)
  const rememberAgentWork = useAgentsStore((state) => state.rememberAgentWork)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachedText, setAttachedText] = useState<string>('')
  const [pendingBriefState, setPendingBriefState] = useState<{ conversationId: string; brief: IrisPendingBrief } | null>(null)
  const pendingBriefRef = useRef<{ conversationId: string; brief: IrisPendingBrief } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeBriefRef = useRef<HTMLDivElement>(null)

  const activeConv = conversations.find((conversation) => conversation.id === activeConversationId)
  const irisAgent = agents.find((agent) => agent.id === 'iris')
  const activeMission = missions.find((mission) => mission.id === activeMissionId)
  const storePendingBrief = activeConversationId ? pendingBriefs[activeConversationId] || null : null
  const activePendingBrief = useMemo(
    () => (pendingBriefState?.conversationId === activeConversationId ? pendingBriefState.brief : null),
    [activeConversationId, pendingBriefState]
  )
  const activeBriefQuestion = useMemo(
    () => (activePendingBrief ? getBriefQuestion(activePendingBrief) : null),
    [activePendingBrief]
  )

  const setPendingBrief = useCallback((conversationId: string, brief: IrisPendingBrief) => {
    const next = { conversationId, brief }
    pendingBriefRef.current = next
    setPendingBriefState(next)
    setPendingBriefInStore(conversationId, brief)
  }, [setPendingBriefInStore])

  const clearPendingBrief = useCallback((conversationId: string) => {
    clearPendingBriefInStore(conversationId)
    if (pendingBriefRef.current?.conversationId === conversationId) {
      pendingBriefRef.current = null
      setPendingBriefState(null)
    }
  }, [clearPendingBriefInStore])

  useEffect(() => {
    if (!activeConversationId) {
      pendingBriefRef.current = null
      setPendingBriefState(null)
      return
    }

    if (storePendingBrief) {
      const next = { conversationId: activeConversationId, brief: storePendingBrief }
      const current = pendingBriefRef.current
      if (
        current?.conversationId !== next.conversationId ||
        JSON.stringify(current.brief) !== JSON.stringify(next.brief)
      ) {
        pendingBriefRef.current = next
        setPendingBriefState(next)
      }
      return
    }

    if (pendingBriefRef.current?.conversationId === activeConversationId || pendingBriefState?.conversationId === activeConversationId) {
      pendingBriefRef.current = null
      setPendingBriefState(null)
    }
  }, [activeConversationId, pendingBriefState?.conversationId, storePendingBrief])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages.length, chatStatus])

  useEffect(() => {
    if (!activeBriefQuestion) return
    requestAnimationFrame(() => {
      activeBriefRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [activeBriefQuestion?.field])

  useEffect(() => {
    if (!isIrisOpen) return
    if (activeConv) return
    const fallbackConversationId = conversations[0]?.id
    if (fallbackConversationId) {
      setActiveConversation(fallbackConversationId)
    }
  }, [activeConv, conversations, isIrisOpen, setActiveConversation])

  useEffect(() => {
    if (isIrisOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isIrisOpen])

  useEffect(() => {
    if (!activeMissionId) return
    if (chatStatus === 'idle') return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const pollExecution = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token || cancelled) return

        const response = await fetch(`/api/tasks/${activeMissionId}/execution`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: 'no-store',
        })

        if (!response.ok || cancelled) return
        const payload = await response.json()
        const workflow = payload?.workflow
        const runs = Array.isArray(payload?.runs) ? payload.runs : []

        if (workflow) {
          const nextStatus =
            workflow.status === 'active'
              ? 'in_progress'
              : workflow.status === 'paused'
                ? 'paused'
                : workflow.status === 'completed'
                  ? 'review'
                  : undefined

          const latestRun = runs[0]
          const phaseNote = workflow.current_phase ? `Current phase: ${workflow.current_phase}` : undefined
          const latestRunNote = latestRun?.stage ? `Latest activity: ${latestRun.stage}` : undefined

          updateMission(activeMissionId, {
            progress: Math.max(workflow.progress || 0, 8),
            status: nextStatus as any,
            handoffNotes: [phaseNote, latestRunNote].filter(Boolean).join('\n') || undefined,
          })
        }
      } catch {
        // Keep polling lightweight and silent in the chat shell.
      } finally {
        if (!cancelled) {
          timer = setTimeout(pollExecution, 2000)
        }
      }
    }

    timer = setTimeout(pollExecution, 1200)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [activeMissionId, chatStatus, updateMission])

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

  const runTaskRequest = useCallback(
    async (conversationId: string, requestText: string) => {
      let createdMissionId: string | null = shouldOpenMissionForMessage(requestText)
        ? createMissionFromPrompt(requestText, {
            clientId: activeMission?.clientId,
            campaignId: activeMission?.campaignId,
          })
        : null

      if (createdMissionId) {
        updateMission(createdMissionId, {
          status: 'in_progress',
          progress: 8,
          handoffNotes: 'Iris is analysing the request and preparing the task plan.',
          orchestrationTrace: ['Iris is analysing the request and preparing the execution plan.'],
        })
      }

      setChatStatus('thinking')
      let fullResponse = ''
      let receivedFirstChunk = false

      await requestChat(
        {
          provider: irisAgent?.provider || agencySettings.defaultProvider,
          model: irisAgent?.model || agencySettings.defaultModel,
          temperature: irisAgent?.temperature || 0.7,
          maxTokens: irisAgent?.maxTokens || 4096,
          messages: [...(activeConv?.messages || []), { role: 'user', content: requestText }],
          systemPrompt: irisAgent?.systemPrompt,
          providerSettings,
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
            missionStatement: client.missionStatement,
            brandPromise: client.brandPromise,
            targetAudiences: client.targetAudiences,
            productsAndServices: client.productsAndServices,
            usp: client.usp,
            keyMessages: client.keyMessages,
            toneOfVoice: client.toneOfVoice,
            strategicPriorities: client.strategicPriorities,
            notes: client.notes,
            knowledgeAssets: client.knowledgeAssets,
          })),
          missions: missions.slice(0, 8),
          currentClientId: activeMission?.clientId,
          currentCampaignId: activeMission?.campaignId,
          missionId: createdMissionId || undefined,
        },
        (chunk) => {
          fullResponse += chunk
          setChatStatus('streaming')
          if (createdMissionId && !receivedFirstChunk) {
            receivedFirstChunk = true
            updateMission(createdMissionId, {
              status: 'in_progress',
              progress: 42,
              handoffNotes: 'Specialists are working on the deliverable.',
            })
          }
          upsertAssistantDraft(conversationId, fullResponse, 'iris', { missionId: createdMissionId || undefined })
        },
        (meta) => {
          if (!createdMissionId && meta?.deliverableType && meta.deliverableType !== 'status-report') {
            createdMissionId = createMissionFromPrompt(requestText, {
              clientId: meta?.clientId || activeMission?.clientId,
              campaignId: meta?.campaignId || activeMission?.campaignId,
            })
          }

          const missionForArtifact = (createdMissionId ? missions.find((mission) => mission.id === createdMissionId) : null) || activeMission
          const deliverableType = (meta?.deliverableType as any) || missionForArtifact?.deliverableType || 'status-report'
          const taskTitle = buildTaskTitleFromRequest(requestText, deliverableType)
          const passedQualityGate = passesQualityGate(meta)
          const hasUsableDeliverable = looksLikeSavedDeliverable(fullResponse) && passedQualityGate
          const shouldPersistArtifact =
            deliverableType !== 'status-report' &&
            isLikelyDeliverableResponse(fullResponse) &&
            passedQualityGate
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
                missionId: createdMissionId || undefined,
                agentId: meta?.leadAgentId || meta?.routedAgentId || 'iris',
                executionSteps: meta?.executionSteps || [],
              })
            : shouldPersistArtifact
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
                      ? `Saved with quality warnings: ${((meta as any)?.quality?.issues || []).join(' | ')}`
                      : meta?.handoffNotes || 'Generated by Iris',
                  clientId: meta?.clientId || activeMission?.clientId,
                  campaignId: meta?.campaignId || activeMission?.campaignId,
                  missionId: createdMissionId || undefined,
                  agentId: meta?.leadAgentId || meta?.routedAgentId || 'iris',
                  executionSteps: meta?.executionSteps || [],
                })
              : undefined

          addAssistantMessage(conversationId, fullResponse, meta?.routedAgentId || 'iris', {
            ...meta,
            missionId: createdMissionId || undefined,
            artifactId,
            handoffNotes: [meta?.handoffNotes, buildAssignmentNote(meta)].filter(Boolean).join('\n'),
          })

          if (createdMissionId) {
            const resolvedDeliverableType = ((meta as any)?.resolvedDeliverableType || deliverableType) as any
            updateMission(createdMissionId, {
              title: taskTitle,
              summary: requestText,
              deliverableType: resolvedDeliverableType,
              status: shouldPersistArtifact ? 'review' : 'blocked',
              progress: shouldPersistArtifact ? 92 : 15,
              complexity: getDeliverableSpec(resolvedDeliverableType).complexity,
              channelingConfidence:
                (meta as any)?.confidence ||
                (resolvedDeliverableType === 'general-task' ? 'medium' : resolvedDeliverableType === 'status-report' ? 'low' : 'medium'),
              assignedAgentIds: meta?.assignedAgentIds?.length ? meta.assignedAgentIds : meta?.routedAgentId && meta.routedAgentId !== 'iris' ? ['iris', meta.routedAgentId] : ['iris'],
              leadAgentId: meta?.leadAgentId || meta?.routedAgentId || 'iris',
              collaboratorAgentIds: meta?.collaboratorAgentIds || [],
              pipelineId: meta?.pipelineId || undefined,
              pipelineName: meta?.pipelineName || undefined,
              skillAssignments: meta?.selectedSkillsByAgent || {},
              orchestrationTrace: meta?.orchestrationTrace || [],
              qualityChecklist: meta?.qualityChecklist || [],
              handoffNotes: shouldPersistArtifact
                ? [meta?.handoffNotes, buildAssignmentNote(meta)].filter(Boolean).join('\n') || undefined
                : (meta as any)?.quality?.ok === false
                  ? `Quality gate failed: ${((meta as any)?.quality?.issues || []).join(' | ')}`
                  : 'Iris did not return a usable deliverable. Re-run the task or check provider settings.',
              clientId: meta?.clientId || activeMission?.clientId,
              campaignId: meta?.campaignId || activeMission?.campaignId,
            })
          }

          rememberAgentWork('iris', {
            title: requestText.slice(0, 48),
            summary: `Handled: ${requestText.slice(0, 120)}`,
            clientId: meta?.clientId || activeMission?.clientId,
            campaignId: meta?.campaignId || activeMission?.campaignId,
            missionId: createdMissionId || undefined,
            conversationId,
          })

          if (meta?.leadAgentId && meta.leadAgentId !== 'iris') {
            rememberAgentWork(meta.leadAgentId, {
              title: requestText.slice(0, 48),
              summary: `Lead on task: ${taskTitle}`,
              clientId: meta?.clientId || activeMission?.clientId,
              campaignId: meta?.campaignId || activeMission?.campaignId,
              missionId: createdMissionId || undefined,
              conversationId,
            })
          }

          for (const collaboratorId of meta?.collaboratorAgentIds || []) {
            rememberAgentWork(collaboratorId, {
              title: requestText.slice(0, 48),
              summary: `Supporting task: ${taskTitle}`,
              clientId: meta?.clientId || activeMission?.clientId,
              campaignId: meta?.campaignId || activeMission?.campaignId,
              missionId: createdMissionId || undefined,
              conversationId,
            })
          }

          setChatStatus('idle')
        },
        (err) => {
          setError(err)
          addAssistantMessage(conversationId, `Iris could not complete that request.\n\nReason: ${err}`, 'iris', {
            missionId: createdMissionId || undefined,
            handoffNotes: err,
          })
          if (createdMissionId) {
            updateMission(createdMissionId, {
              status: 'blocked',
              progress: 0,
              handoffNotes: err,
            })
          }
          setChatStatus('idle')
        }
      )
    },
    [activeConv?.messages, activeMission, addArtifact, addAssistantMessage, agencySettings.defaultModel, agencySettings.defaultProvider, agentMemories, agents, artifacts, clients, createMissionFromPrompt, irisAgent?.maxTokens, irisAgent?.model, irisAgent?.provider, irisAgent?.systemPrompt, irisAgent?.temperature, missions, providerSettings, rememberAgentWork, setChatStatus, updateMission, upsertAssistantDraft]
  )

  const askBriefQuestion = useCallback(
    (conversationId: string, requestText: string) => {
      const deliverableType = inferDeliverableTypeFromText(requestText)
      const pendingBrief = createPendingBrief(requestText, deliverableType)
      if (!pendingBrief || isBriefComplete(pendingBrief)) return false

      const question = getBriefQuestion(pendingBrief)
      if (!question) return false

      setPendingBrief(conversationId, pendingBrief)
      addAssistantMessage(
        conversationId,
        `${question.prompt}\n\n${question.helper}`,
        'iris',
        { deliverableType }
      )
      return true
    },
    [addAssistantMessage, setPendingBrief]
  )

  const handleBriefProgress = useCallback(
    async (conversationId: string, answer: string) => {
      const currentBriefEntry = pendingBriefRef.current
      if (!currentBriefEntry || currentBriefEntry.conversationId !== conversationId) return false

      const currentBrief = currentBriefEntry.brief
      const currentField = getBriefQuestion(currentBrief)?.field
      const updatedBrief = applyBriefAnswer(currentBrief, answer, currentField)
      if (!isBriefComplete(updatedBrief)) {
        setPendingBrief(conversationId, updatedBrief)
        const nextQuestion = getBriefQuestion(updatedBrief)
        if (nextQuestion) {
          addAssistantMessage(conversationId, `${nextQuestion.prompt}\n\n${nextQuestion.helper}`, 'iris', {
            deliverableType: updatedBrief.deliverableType,
          })
        }
        return true
      }

      clearPendingBrief(conversationId)
      addAssistantMessage(conversationId, 'Perfect. I have enough to start this now.', 'iris', {
        deliverableType: updatedBrief.deliverableType,
      })
      await runTaskRequest(conversationId, composeBriefedRequest(updatedBrief))
      return true
    },
    [addAssistantMessage, clearPendingBrief, runTaskRequest, setPendingBrief]
  )

  const submitUserMessage = useCallback(
    async (rawMessage: string, attachmentContent = '') => {
      if (chatStatus !== 'idle') return

      const conversationId =
        activeConversationId && conversations.some((conversation) => conversation.id === activeConversationId)
          ? activeConversationId
          : createConversation('Chat with Iris')

      if (!conversationId) return

      const userMsg = rawMessage.trim()
      const fullMessage = attachmentContent.trim()
        ? `${userMsg}\n\n[Attached files context]\n${attachmentContent.trim()}`
        : userMsg

      setError(null)
      setActiveConversation(conversationId)
      sendMessage(conversationId, userMsg)

      const currentBriefEntry = pendingBriefRef.current
      if (currentBriefEntry && currentBriefEntry.conversationId === conversationId) {
        await handleBriefProgress(conversationId, userMsg)
        return
      }

      if (shouldOpenMissionForMessage(fullMessage) && askBriefQuestion(conversationId, fullMessage)) {
        return
      }

      await runTaskRequest(conversationId, fullMessage)
    },
    [activeConversationId, askBriefQuestion, chatStatus, conversations, createConversation, handleBriefProgress, runTaskRequest, sendMessage, setActiveConversation]
  )

  const handleSend = useCallback(async () => {
    if (!input.trim() && attachments.length === 0 && !attachedText) return

    const userMsg = input.trim()
    const attachmentContent = attachedText.trim()

    setInput('')
    setAttachments([])
    setAttachedText('')

    await submitUserMessage(userMsg, attachmentContent)
  }, [input, attachments.length, attachedText, submitUserMessage])

  const handleBriefOptionClick = useCallback(async (option: string) => {
    if (!activeBriefQuestion || chatStatus !== 'idle') return
    await submitUserMessage(option)
  }, [activeBriefQuestion, chatStatus, submitUserMessage])

  const clearPendingBriefFlow = useCallback(() => {
    if (!activeConversationId) return
    clearPendingBrief(activeConversationId)
    addAssistantMessage(activeConversationId, 'Briefing cleared. Send the full request again whenever you are ready.', 'iris')
  }, [activeConversationId, addAssistantMessage, clearPendingBrief])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startNewChat = () => {
    const id = createConversation('New Chat')
    clearPendingBrief(id)
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
            <div className="p-5 pb-28 space-y-5">
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

              {activeBriefQuestion && chatStatus === 'idle' && (
                <div ref={activeBriefRef} className="ml-11 rounded-2xl border border-[#3a334d] bg-[#171922] p-4 space-y-3 scroll-mt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#9b6dff]/15">
                      <MessageSquare size={15} className="text-[#c3a7ff]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{activeBriefQuestion.prompt}</p>
                      <p className="text-xs text-gray-400 mt-1">{activeBriefQuestion.helper}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeBriefQuestion.options.map((option) => (
                      <button
                        key={`${activeBriefQuestion.field}-${option}`}
                        onClick={() => handleBriefOptionClick(option)}
                        className="px-3 py-2 rounded-xl border border-[#3a334d] bg-[#1d2030] text-xs text-gray-200 hover:border-[#9b6dff] hover:text-white transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-gray-500">
                      {activeBriefQuestion.allowsFreeText ? 'You can also type a custom answer below.' : 'Pick an option to continue.'}
                    </p>
                    <button
                      onClick={clearPendingBriefFlow}
                      className="text-[11px] text-gray-500 hover:text-red-300 transition-colors"
                    >
                      Clear briefing
                    </button>
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
