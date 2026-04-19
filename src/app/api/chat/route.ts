import { NextRequest, NextResponse } from 'next/server'
import {
  buildExecutionPrompt,
  generateText,
  getFriendlyProviderError,
  inferDeliverableType,
  inferRoutingContext,
  ProviderError,
  inferPipeline,
} from '@/lib/server/ai'
import { buildTaskExecutionPlan, buildTaskTitleFromRequest } from '@/lib/task-output'
import { executeAutonomousTask } from '@/lib/server/autonomous-task'
import { buildArtifactHtml } from '@/lib/output-html'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'
import { normalizeProviderSettings, resolveFallbackRuntime, resolveTaskRuntime } from '@/lib/provider-settings'
import { sanitizePromptProfile, sanitizePromptValue } from '@/lib/server/prompt-safety'
import { validateDeliverableQuality } from '@/lib/output-quality'
import { ensureTaskExecutionPersistence, insertTaskRun, upsertWorkflowExecutionState } from '@/lib/server/task-execution'
import { loadConfigSkillCategories, mergeDbSkillsWithConfig } from '@/lib/server/skills-catalog'
import { buildTaskChannelingPlan } from '@/lib/server/task-channeling'
import { getConfigPipelines, mergeDatabasePipelines } from '@/lib/pipeline-loader'

// DEBUG: Log incoming requests
function debugLog(label: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CHAT DEBUG] ${label}:`, JSON.stringify(data, null, 2).slice(0, 500))
  }
}

const TASK_KEYWORDS = /\b(create|make|build|draft|generate|write|produce|design|plan|schedule|audit|analyze|research|forecast|calendar|campaign|brief|copy|content calendar|media plan|budget|strategy|kpi|seo|competitor|carousel|caption|social post|hashtag|visual|banner|ad creative|launch plan|report)\b/i

function isConversationalMessage(content: string): boolean {
  if (TASK_KEYWORDS.test(content)) return false
  if (content.trim().length < 80) return true
  if (/^(who|what|how|why|when|where|can you|do you|tell me|explain|describe|show me)\b/i.test(content.trim())) return true
  return false
}

function enforceArtifactTruth(responseText: string, artifacts: any[]) {
  const lower = responseText.toLowerCase()
  const claimsDelivery =
    lower.includes('delivered') ||
    lower.includes('shared drive') ||
    lower.includes('client inbox') ||
    lower.includes('.docx') ||
    lower.includes('.pdf') ||
    lower.includes('.xlsx') ||
    lower.includes('saved in') ||
    lower.includes('file:')

  if (!claimsDelivery) return responseText

  if (!artifacts?.length) return 'No completed or delivered file exists in the app yet. I can draft the output here and save it as an internal artifact, but I should not claim it has been exported, uploaded, or sent.'

  const hasDeliveredArtifact = artifacts.some((artifact) => artifact.status === 'delivered' || artifact.path || artifact.link)
  if (hasDeliveredArtifact) return responseText

  return 'No completed or delivered file exists in the app yet. I can draft the output here and save it as an internal artifact, but I should not claim it has been exported, uploaded, or sent.'
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

function enforceDeliverableDraft(responseText: string, deliverableType: string) {
  if (deliverableType === 'status-report') return responseText

  const lower = responseText.toLowerCase()
  const looksLikeCoordinationOnly =
    lower.includes('task routed to') ||
    lower.includes('lead agent') ||
    lower.includes('delivery:') ||
    lower.includes('status: in progress') ||
    lower.includes('next steps:')

  if (!looksLikeCoordinationOnly) return responseText

  return 'I have not drafted the deliverable yet. I should respond with the actual draft content and save it as an internal output artifact instead of only returning routing/status language.'
}

async function getDefaultAgencyId() {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase.from('agencies').select('id').eq('slug', 'default-agency').single()
  if (error) throw error
  return data.id as string
}

// Load pipelines server-side
async function loadPipelines() {
  try {
    const supabase = getSupabaseServerClient()
    const agencyId = await getDefaultAgencyId()

    if (supabase && agencyId) {
      const { data, error } = await supabase
        .from('pipelines')
        .select('definition')
        .eq('agency_id', agencyId)
        .order('name', { ascending: true })

      if (!error && data?.length) {
        return mergeDatabasePipelines(data.map((row: any) => row.definition || {}).filter(Boolean))
      }
    }
  } catch {
    // Fall through to config fallback.
  }

  try {
    return getConfigPipelines()
  } catch {
    return []
  }
}

// Load skills server-side
async function loadSkills() {
  try {
    const supabase = getSupabaseServerClient()
    const agencyId = await getDefaultAgencyId()

    if (supabase && agencyId) {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('agency_id', agencyId)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (!error && data?.length) {
        return mergeDbSkillsWithConfig(data)
      }
    }
  } catch {
    // Fall through to config fallback.
  }

  try {
    return loadConfigSkillCategories()
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  let requestBody: any = null
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(req))
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    requestBody = await req.json()
    const {
      provider = 'ollama',
      model = 'minimax-m2.7:cloud',
      temperature = 0.7,
      maxTokens = 4096,
      messages,
      systemPrompt,
      providerSettings,
      agentMemories = {},
      artifacts = [],
      agents = [],
      clients = [],
      missions = [],
      currentClientId,
      currentCampaignId,
      missionId,
    } = requestBody

    let canPersistMissionExecution = false


    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const latestUser = [...messages].reverse().find((message) => message.role === 'user')
    const userContent = latestUser?.content || ''
    const conversational = isConversationalMessage(userContent)
    const deliverableType = conversational ? 'status-report' : inferDeliverableType(userContent)
    const normalizedProviderSettings = normalizeProviderSettings(auth.providerSettings || providerSettings)
    const selectedRuntime = resolveTaskRuntime({
      settings: normalizedProviderSettings,
      deliverableType,
      requestedProvider: provider,
      requestedModel: model,
    })
    let actualProvider = selectedRuntime.provider
    let actualModel = selectedRuntime.model

    debugLog('Provider payload', {
      requestedProvider: provider,
      requestedModel: model,
      selectedProvider: selectedRuntime.provider,
      selectedModel: selectedRuntime.model,
      hasProviderSettings: Boolean(providerSettings),
      conversational,
    })

    if (actualProvider === 'ollama' && normalizedProviderSettings?.ollama?.enabled === false) {
      console.log('[CHAT ERROR] Ollama is disabled in providerSettings')
      return NextResponse.json({ error: 'Ollama is unavailable right now. Make sure your local Ollama server is running.' }, { status: 503 })
    }

    if (conversational) {
      const agentRoster = agents.slice(0, 10).map((agent: any) => `${agent.name} (${agent.role})`).join(', ')
      const leanSystemPrompt = [
        `ROLE: You are Iris, Chief of Staff at Mission Control — a virtual creative and digital media agency.`,
        `PURPOSE: You help the agency owner manage their team, answer questions, and kick off tasks.`,
        '',
        `TEAM: ${agentRoster}.`,
        clients.length ? `CLIENTS: ${clients.map((client: any) => client.name).join(', ')}.` : '',
        missions.length ? `ACTIVE WORK: ${missions.slice(0, 5).map((mission: any) => mission.title).join(', ')}.` : '',
        '',
        `RESPONSE FORMAT: Short, warm, professional. 1-3 sentences for simple questions. Use markdown for lists.`,
        '',
        `RULES:`,
        `1. Answer questions about the agency, team, clients, and capabilities directly.`,
        `2. Never promise to route to or check with another agent in chat mode.`,
        `3. When the user wants a deliverable, ask them to give the specific request and then execute it.`,
        `4. For status questions, answer honestly based on what you know.`,
      ]
        .filter(Boolean)
        .join('\n')

      const recentMessages = messages.slice(-6)

      try {
        const responseText = await generateText({
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens: Math.min(maxTokens, 768),
          messages: [
            { role: 'system', content: leanSystemPrompt },
            ...recentMessages.map((message: any) => ({ role: message.role, content: message.content })),
          ],
          ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
          ollamaContextWindow: normalizedProviderSettings?.ollama?.contextWindow,
          geminiApiKey: normalizedProviderSettings?.gemini?.apiKey,
        })

        if (!responseText?.trim()) {
          return NextResponse.json(
            { error: 'The model returned an empty response. Try rephrasing or starting a new chat.' },
            { status: 503 }
          )
        }

        return NextResponse.json({
          response: responseText,
          meta: {
            routedAgentId: 'iris',
            leadAgentId: 'iris',
            collaboratorAgentIds: [],
            assignedAgentIds: ['iris'],
            clientId: null,
            campaignId: null,
            deliverableType: 'status-report',
            pipelineId: null,
            pipelineName: null,
            qualityChecklist: [],
            handoffNotes: '',
            executionSteps: [],
            quality: null,
            executionPrompt: '',
            renderedHtml: null,
            provider: actualProvider,
            model: actualModel,
            fallbackUsed: false,
            conversational: true,
          },
        })
      } catch (err: any) {
        console.error('[CHAT] Conversational error:', err?.message || err)
        const status =
          err instanceof ProviderError
            ? err.status && Number.isFinite(err.status)
              ? err.status
              : 503
            : 500
        return NextResponse.json({ error: getFriendlyProviderError(err) }, { status })
      }
    }

    // Load pipeline and skill context
    const [pipelines, skillCategories] = await Promise.all([loadPipelines(), loadSkills()])

    const routing = inferRoutingContext({
      content: userContent,
      clientHints: clients,
      agents,
    })

    // Infer which pipeline matches this request
    const pipelineHint = inferPipeline(userContent, pipelines)
    const pipelineDefinition = pipelineHint ? pipelines.find((pipeline: any) => pipeline.id === pipelineHint.id) || null : null
    const routedAgent = agents.find((agent: any) => agent.id === routing.routedAgentId)
    const scopedClient =
      clients.find((client: any) => client.id === routing.clientId || client.id === currentClientId) ||
      clients.find((client: any) => userContent.toLowerCase().includes(client.name.toLowerCase()))

    const clientContext = scopedClient
      ? [
          `Name: ${sanitizePromptValue(scopedClient.name)}`,
          `Industry: ${sanitizePromptValue(scopedClient.industry)}`,
          scopedClient.description ? `Overview: ${sanitizePromptValue(scopedClient.description)}` : '',
          scopedClient.missionStatement ? `Mission: ${sanitizePromptValue(scopedClient.missionStatement)}` : '',
          scopedClient.brandPromise ? `Brand promise: ${sanitizePromptValue(scopedClient.brandPromise)}` : '',
          scopedClient.targetAudiences ? `Audience: ${sanitizePromptValue(scopedClient.targetAudiences)}` : '',
          scopedClient.productsAndServices ? `Products: ${sanitizePromptValue(scopedClient.productsAndServices)}` : '',
          scopedClient.usp ? `USP: ${sanitizePromptValue(scopedClient.usp)}` : '',
          scopedClient.keyMessages ? `Key messages: ${sanitizePromptValue(scopedClient.keyMessages)}` : '',
          scopedClient.toneOfVoice ? `Tone of voice: ${sanitizePromptValue(scopedClient.toneOfVoice)}` : '',
          scopedClient.strategicPriorities ? `Strategic priorities: ${sanitizePromptValue(scopedClient.strategicPriorities)}` : '',
          scopedClient.notes ? `Notes: ${sanitizePromptValue(scopedClient.notes)}` : '',
          Array.isArray(scopedClient.knowledgeAssets) && scopedClient.knowledgeAssets.length
            ? `Knowledge assets:\n${scopedClient.knowledgeAssets
                .slice(0, 8)
                .map(
                  (asset: any) =>
                    `- ${sanitizePromptValue(asset.title)} (${sanitizePromptValue(asset.type)})` +
                    `${asset.summary ? `: ${sanitizePromptValue(asset.summary)}` : ''}` +
                    `${asset.extractedInsights ? ` | Insights: ${sanitizePromptValue(asset.extractedInsights)}` : ''}`
                )
                .join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : ''

    const clientProfile = scopedClient
      ? sanitizePromptProfile({
          brand_name: scopedClient.name,
          niche: scopedClient.industry,
          industry: scopedClient.industry,
          target_audience: scopedClient.targetAudiences,
          audience_demographics: scopedClient.targetAudiences,
          audience_psychographics: scopedClient.targetAudiences,
          product_service: scopedClient.productsAndServices,
          business_objectives: scopedClient.strategicPriorities,
          tone: scopedClient.toneOfVoice,
          brand_voice: scopedClient.toneOfVoice,
          campaign_theme: scopedClient.keyMessages,
          visual_direction: scopedClient.brandIdentityNotes,
          asset_specs: scopedClient.brandIdentityNotes,
          competitive_landscape: scopedClient.competitiveLandscape,
          channel_strategy: scopedClient.strategicPriorities,
          pain_points: scopedClient.objectionHandling,
          key_dates: scopedClient.operationalDetails,
          posting_frequency: '3-4 posts per week',
          platforms: 'Instagram, LinkedIn',
          content_goal: 'Awareness and lead generation',
          campaign_duration: '30 days',
        })
      : undefined

    const executionPlan = buildTaskExecutionPlan({
      deliverableType,
      request: userContent,
      routedAgentId: routing.routedAgentId,
      pipelinePhases: pipelineHint?.phases,
    })
    const channelingPlan = buildTaskChannelingPlan({
      request: userContent,
      deliverableType,
      routedAgentId: executionPlan.leadAgentId || routing.routedAgentId,
      agents,
      skillCategories,
      pipeline: pipelineDefinition,
    })

    const executionPrompt = buildExecutionPrompt({
      userRequest: userContent,
      deliverableType,
      routedAgentName: agents.find((agent: any) => agent.id === executionPlan.leadAgentId)?.name || routedAgent?.name,
      routedAgentSpecialty: agents.find((agent: any) => agent.id === executionPlan.leadAgentId)?.specialty || routedAgent?.specialty,
      collaboratorAgents: channelingPlan.collaboratorAgentIds.map((id) => agents.find((agent: any) => agent.id === id)).filter(Boolean),
      clientName: scopedClient?.name,
      clientContext,
      clientIndustry: scopedClient?.industry,
      clientToneOfVoice: scopedClient?.toneOfVoice,
      clientTargetAudiences: scopedClient?.targetAudiences,
      clientBrandPromise: scopedClient?.brandPromise,
      clientKeyMessages: scopedClient?.keyMessages,
      pipelineName: pipelineHint?.name || undefined,
    })

    const missionSnapshot = Array.isArray(missions)
      ? missions.find((mission: any) => mission?.id === missionId)
      : null

    if (missionId) {
      try {
        await ensureTaskExecutionPersistence({
          taskId: missionId,
          auth,
          title: missionSnapshot?.title || buildTaskTitleFromRequest(userContent, deliverableType),
          summary: missionSnapshot?.summary || userContent,
          deliverableType,
          ownerUserId: missionSnapshot?.ownerUserId || auth.userId,
          assignedBy: missionSnapshot?.assignedBy || 'iris',
          clientId: missionSnapshot?.clientId || routing.clientId || currentClientId || null,
          campaignId: missionSnapshot?.campaignId || currentCampaignId || null,
          leadAgentId: channelingPlan.leadAgentId,
          collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
          assignedAgentIds: channelingPlan.assignedAgentIds,
          pipelineId: pipelineHint?.id || missionSnapshot?.pipelineId || null,
          pipelineName: pipelineHint?.name || missionSnapshot?.pipelineName || null,
          skillAssignments: channelingPlan.selectedSkillsByAgent,
          orchestrationTrace: channelingPlan.orchestrationTrace,
          qualityChecklist: executionPlan.qualityChecklist,
          handoffNotes: executionPlan.handoffNotes,
          status: 'in_progress',
          priority: missionSnapshot?.priority || 'medium',
          progress: Math.max(missionSnapshot?.progress || 0, 8),
          complexity: missionSnapshot?.complexity,
          channelingConfidence: missionSnapshot?.channelingConfidence || channelingPlan.confidence,
          createdAt: missionSnapshot?.createdAt,
          updatedAt: new Date().toISOString(),
        })
        canPersistMissionExecution = true
      } catch (error) {
        console.warn('[CHAT] Task execution persistence bootstrap failed:', error)
      }
    }

    // Build pipeline context for Iris
    const pipelineContext = pipelineHint
      ? [
          '',
          `--- PIPELINE ROUTING ---`,
          `This request matches the "${pipelineHint.name}" pipeline (confidence: ${pipelineHint.confidence}).`,
          `Pipeline phases: ${pipelineHint.phases.map((p: string) => `"${p}"`).join(' → ')}.`,
          `Estimated duration: ${pipelineHint.estimatedDuration}.`,
          `Client profile fields needed: ${pipelineHint.clientProfileFields.map((f: any) => f.label).join(', ') || 'none'}.`,
          ``,
          `To execute this pipeline, Iris should:`,
          `1. Confirm the client and collect any missing profile data`,
          `2. Route to the pipeline via /app/pipeline/${pipelineHint.id}`,
          `3. Assign agents to phases based on their roles (client-services → intake, copy → drafting, etc.)`,
        ].join('\n')
      : ''

    // Build skills context
    const skillsContext = skillCategories.length
      ? [
          '',
          `--- AVAILABLE SKILLS ---`,
          `The agency has ${skillCategories.reduce((sum: number, cat: any) => sum + cat.skills.length, 0)} skills across ${skillCategories.length} categories:`,
          ...skillCategories.map((cat: any) =>
            `  [${cat.name}]: ${cat.skills.map((s: any) => s.name).join(', ')}`
          ),
          ``,
          `When routing work, Iris can reference these skills by ID (e.g., "brand-strategy", "campaign-copywriting").`,
          `Skills assigned to agents are stored in the agent's "skills" array.`,
        ].join('\n')
      : ''

    // Build pipelines summary for Iris to pick from
    const pipelinesSummary = pipelines.length
      ? [
          '',
          `--- PIPELINE LIBRARY ---`,
          `Available pipelines (use inferPipeline above to match):`,
          ...pipelines.map((p: any) =>
            `  - ${p.id}: "${p.name}" — ${p.phases.length} phases (${p.phases.map((ph: any) => ph.name).join(', ')})`
          ),
        ].join('\n')
      : ''

    const contextBits = [
      systemPrompt || '',
      `Agency mode: Mission Control is a virtual creative and digital media agency where Iris coordinates specialist units.`,
      `Default response style: keep answers short, precise, and momentum-focused unless the user explicitly asks for depth.`,
      `Real agency roster:\n${agents.map((agent: any) => `- ${agent.name} (${agent.role}, skills: ${(agent.skills || []).join(', ') || 'none'})`).join('\n')}`,
      `Truthfulness rule: never claim a task is completed, delivered, uploaded, emailed, exported, or saved to a file path unless that exact artifact is listed in the known artifacts section below.`,
      `If no matching artifact exists, explicitly say the work is not yet produced in the app and offer to draft it.`,
      routing.routingReason,
      pipelineContext,
      pipelinesSummary,
      skillsContext,
      `Execution plan:
Lead agent: ${channelingPlan.leadAgentId}
Supporting agents: ${channelingPlan.collaboratorAgentIds.join(', ') || 'none'}
Assigned skills by agent:
${Object.entries(channelingPlan.selectedSkillsByAgent)
  .map(([agentId, skills]) => `- ${agentId}: ${skills.join(', ') || 'none'}`)
  .join('\n')}
Quality checklist:
- ${executionPlan.qualityChecklist.join('\n- ')}
Handoff notes: ${executionPlan.handoffNotes}
Orchestration trace:
- ${channelingPlan.orchestrationTrace.join('\n- ')}`,
      `Execution prompt:\n${executionPrompt}`,
      agentMemories?.iris?.roleSummary ? `Iris memory:\n${agentMemories.iris.roleSummary}` : '',
      Array.isArray(agentMemories?.iris?.userPreferences) && agentMemories.iris.userPreferences.length
        ? `User preferences:\n- ${agentMemories.iris.userPreferences.join('\n- ')}`
        : '',
      Array.isArray(agentMemories?.[routing.routedAgentId]?.workingMemory) && agentMemories[routing.routedAgentId].workingMemory.length
        ? `Recent working memory for ${routing.routedAgentId}:\n- ${agentMemories[routing.routedAgentId].workingMemory.join('\n- ')}`
        : '',
      currentClientId ? `Current client in focus: ${currentClientId}` : '',
      currentCampaignId ? `Current campaign in focus: ${currentCampaignId}` : '',
      missions.length ? `Active missions:\n${missions.map((mission: any) => `- ${mission.title} (${mission.status})`).join('\n')}` : '',
      artifacts.length
        ? `Known artifacts in app state:\n${artifacts
            .map((artifact: any) => `- ${artifact.title} [${artifact.status}] (${artifact.deliverableType})${artifact.path ? ` path=${artifact.path}` : ''}${artifact.link ? ` link=${artifact.link}` : ''}`)
            .join('\n')}`
        : 'Known artifacts in app state: none. Do not imply files or delivery exist yet.',
      clients.length
        ? `Known clients:\n${clients.map((client: any) => `- ${client.name}: ${client.industry}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const chatMessages = [
      { role: 'system', content: contextBits },
      ...messages.map((message: any) => ({ role: message.role, content: message.content })),
    ] as const

    let responseText = ''
    let executionSteps: any[] = []
    let qualityResult: { ok: boolean; score: number; issues: string[] } | null = null
    let fallbackUsed = false
    debugLog('Calling generateText', { provider: actualProvider, model: actualModel, ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl })

    try {
      if (missionId && canPersistMissionExecution) {
        await upsertWorkflowExecutionState({
          taskId: missionId,
          pipelineId: pipelineDefinition?.id || null,
          status: 'active',
          currentPhase: pipelineDefinition?.phases?.[0]?.name || 'Execution',
          progress: 5,
          context: {
            source: 'chat',
            startedBy: auth.userId,
            request: userContent,
          },
        })
        await insertTaskRun({
          taskId: missionId,
          agentId: channelingPlan.leadAgentId || null,
          stage: 'chat-request',
          status: 'in_progress',
          inputPayload: {
            deliverableType,
            pipelineId: pipelineDefinition?.id || null,
          },
          startedAt: new Date().toISOString(),
        })
      }

      if (deliverableType !== 'status-report') {
        const result = await executeAutonomousTask({
          request: userContent,
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens,
          ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
          ollamaContextWindow: normalizedProviderSettings?.ollama?.contextWindow,
          geminiApiKey: normalizedProviderSettings?.gemini?.apiKey,
          deliverableType,
          executionPrompt,
          clientContext,
          clientProfile,
          agents,
          leadAgentId: channelingPlan.leadAgentId,
          collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
          selectedSkillsByAgent: channelingPlan.selectedSkillsByAgent,
          qualityChecklist: executionPlan.qualityChecklist,
          pipeline: pipelineDefinition,
          skillCategories,
          hooks: missionId && canPersistMissionExecution
            ? {
                onPhaseStart: async ({ phase, progress }) => {
                  await upsertWorkflowExecutionState({
                    taskId: missionId,
                    pipelineId: pipelineDefinition?.id || null,
                    status: 'active',
                    currentPhase: phase.name,
                    progress,
                    context: { source: 'chat', phaseId: phase.id },
                  })
                },
                onActivityComplete: async ({ phase, activity, agent, runtime, summary, outputIds, progress }) => {
                  await insertTaskRun({
                    taskId: missionId,
                    agentId: agent.id,
                    stage: `${phase.id}:${activity.id}`,
                    status: 'completed',
                    inputPayload: { phaseId: phase.id, activityId: activity.id, outputIds },
                    outputPayload: { summary, provider: runtime.provider, model: runtime.model },
                    startedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                  })
                  await upsertWorkflowExecutionState({
                    taskId: missionId,
                    pipelineId: pipelineDefinition?.id || null,
                    status: 'active',
                    currentPhase: phase.name,
                    progress,
                    context: { source: 'chat', phaseId: phase.id, activityId: activity.id },
                  })
                },
                onActivityFailure: async ({ phase, activity, agent, runtime, progress, error, outputPayload }) => {
                  await insertTaskRun({
                    taskId: missionId,
                    agentId: agent.id,
                    stage: `${phase.id}:${activity.id}`,
                    status: 'failed',
                    inputPayload: { phaseId: phase.id, activityId: activity.id },
                    outputPayload: { provider: runtime.provider, model: runtime.model, ...(outputPayload || {}) },
                    errorMessage: error,
                    startedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                  })
                  await upsertWorkflowExecutionState({
                    taskId: missionId,
                    pipelineId: pipelineDefinition?.id || null,
                    status: 'paused',
                    currentPhase: phase.name,
                    progress,
                    context: { source: 'chat', phaseId: phase.id, activityId: activity.id, error },
                  })
                },
              }
            : undefined,
        })
        responseText = result.response
        executionSteps = result.executionSteps
        qualityResult = result.qualityResult
      } else {
        responseText = await generateText({
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens,
          messages: [...chatMessages],
          ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
          ollamaContextWindow: normalizedProviderSettings?.ollama?.contextWindow,
          geminiApiKey: normalizedProviderSettings?.gemini?.apiKey,
        })
      }
    } catch (error) {
      console.log('[CHAT ERROR]', error instanceof Error ? error.message : String(error), 'Provider:', actualProvider)
      const fallbackRuntime = resolveFallbackRuntime({
        settings: normalizedProviderSettings,
        currentProvider: actualProvider,
        requestedModel: model,
      })

      if (!fallbackRuntime) {
        throw error
      }

      actualProvider = fallbackRuntime.provider
      actualModel = fallbackRuntime.model
      fallbackUsed = true

      if (deliverableType !== 'status-report') {
        const result = await executeAutonomousTask({
          request: userContent,
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens,
          ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
          ollamaContextWindow: normalizedProviderSettings?.ollama?.contextWindow,
          geminiApiKey: normalizedProviderSettings?.gemini?.apiKey,
          deliverableType,
          executionPrompt,
          clientContext,
          clientProfile,
          agents,
          leadAgentId: channelingPlan.leadAgentId,
          collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
          selectedSkillsByAgent: channelingPlan.selectedSkillsByAgent,
          qualityChecklist: executionPlan.qualityChecklist,
          pipeline: pipelineDefinition,
          skillCategories,
          hooks: missionId && canPersistMissionExecution
            ? {
                onPhaseStart: async ({ phase, progress }) => {
                  await upsertWorkflowExecutionState({
                    taskId: missionId,
                    pipelineId: pipelineDefinition?.id || null,
                    status: 'active',
                    currentPhase: phase.name,
                    progress,
                    context: { source: 'chat-fallback', phaseId: phase.id },
                  })
                },
                onActivityComplete: async ({ phase, activity, agent, runtime, summary, outputIds, progress }) => {
                  await insertTaskRun({
                    taskId: missionId,
                    agentId: agent.id,
                    stage: `${phase.id}:${activity.id}`,
                    status: 'completed',
                    inputPayload: { phaseId: phase.id, activityId: activity.id, outputIds },
                    outputPayload: { summary, provider: runtime.provider, model: runtime.model },
                    startedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                  })
                  await upsertWorkflowExecutionState({
                    taskId: missionId,
                    pipelineId: pipelineDefinition?.id || null,
                    status: 'active',
                    currentPhase: phase.name,
                    progress,
                    context: { source: 'chat-fallback', phaseId: phase.id, activityId: activity.id },
                  })
                },
                onActivityFailure: async ({ phase, activity, agent, runtime, progress, error, outputPayload }) => {
                  await insertTaskRun({
                    taskId: missionId,
                    agentId: agent.id,
                    stage: `${phase.id}:${activity.id}`,
                    status: 'failed',
                    inputPayload: { phaseId: phase.id, activityId: activity.id },
                    outputPayload: { provider: runtime.provider, model: runtime.model, ...(outputPayload || {}) },
                    errorMessage: error,
                    startedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                  })
                  await upsertWorkflowExecutionState({
                    taskId: missionId,
                    pipelineId: pipelineDefinition?.id || null,
                    status: 'paused',
                    currentPhase: phase.name,
                    progress,
                    context: { source: 'chat-fallback', phaseId: phase.id, activityId: activity.id, error },
                  })
                },
              }
            : undefined,
        })
        responseText = result.response
        executionSteps = result.executionSteps
        qualityResult = result.qualityResult
      } else {
        responseText = await generateText({
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens,
          messages: [...chatMessages],
          ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
          ollamaContextWindow: normalizedProviderSettings?.ollama?.contextWindow,
          geminiApiKey: normalizedProviderSettings?.gemini?.apiKey,
        })
      }
    }

    responseText = enforceArtifactTruth(responseText, artifacts)
    responseText = enforceDeliverableDraft(responseText, deliverableType)
    if (deliverableType !== 'status-report' && !qualityResult) {
      qualityResult = validateDeliverableQuality(deliverableType, responseText, userContent)
    }
    if (missionId && canPersistMissionExecution) {
      await insertTaskRun({
        taskId: missionId,
        agentId: channelingPlan.leadAgentId || null,
        stage: 'final-assembly',
        status: qualityResult?.ok === false ? 'blocked' : 'completed',
        outputPayload: {
          qualityScore: qualityResult?.score,
          qualityIssues: qualityResult?.issues || [],
          provider: actualProvider,
          model: actualModel,
        },
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      })
      await upsertWorkflowExecutionState({
        taskId: missionId,
        pipelineId: pipelineDefinition?.id || null,
        status: qualityResult?.ok === false ? 'paused' : 'completed',
        currentPhase: pipelineDefinition?.phases?.at(-1)?.name || 'Quality Control',
        progress: qualityResult?.ok === false ? 82 : 100,
        context: {
          source: fallbackUsed ? 'chat-fallback' : 'chat',
          quality: qualityResult,
          completedAt: new Date().toISOString(),
        },
      })
    }
    const renderedHtml = buildArtifactHtml(responseText)

    return NextResponse.json({
      response: responseText,
      meta: {
        routedAgentId: routing.routedAgentId,
        leadAgentId: channelingPlan.leadAgentId,
        collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
        assignedAgentIds: channelingPlan.assignedAgentIds,
        selectedSkillsByAgent: channelingPlan.selectedSkillsByAgent,
        orchestrationTrace: channelingPlan.orchestrationTrace,
        confidence: channelingPlan.confidence,
        resolvedDeliverableType: channelingPlan.resolvedDeliverableType,
        clientId: routing.clientId || currentClientId || null,
        campaignId: currentCampaignId || null,
        deliverableType,
        pipelineId: pipelineHint?.id || null,
        pipelineName: pipelineHint?.name || null,
        qualityChecklist: executionPlan.qualityChecklist,
        handoffNotes: executionPlan.handoffNotes,
        executionSteps,
        quality: qualityResult,
        executionPrompt,
        renderedHtml,
        provider: actualProvider,
        model: actualModel,
        fallbackUsed,
      },
    })
  } catch (err: any) {
    console.error('[/api/chat]', err)
    if (requestBody?.missionId) {
      try {
        const supabase = getSupabaseServerClient()
        const { data: existingTask } = supabase
          ? await supabase.from('tasks').select('id').eq('id', requestBody.missionId).maybeSingle()
          : { data: null }
        if (existingTask?.id) {
          await insertTaskRun({
            taskId: requestBody.missionId,
            stage: 'task-execution',
            status: 'failed',
            errorMessage: err instanceof Error ? err.message : 'Chat execution failed.',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          })
          await upsertWorkflowExecutionState({
            taskId: requestBody.missionId,
            status: 'paused',
            currentPhase: 'Execution',
            progress: 10,
            context: { error: err instanceof Error ? err.message : 'Chat execution failed.' },
          })
        }
      } catch {}
    }
    const status =
      err instanceof ProviderError
        ? err.status && Number.isFinite(err.status)
          ? err.status
          : 503
        : 500

    return NextResponse.json({ error: getFriendlyProviderError(err) }, { status })
  }
}
