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
import { buildTaskExecutionPlan } from '@/lib/task-output'
import { executeAutonomousTask } from '@/lib/server/autonomous-task'
import { buildArtifactHtml } from '@/lib/output-html'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'
import { normalizeProviderSettings, resolveFallbackRuntime, resolveTaskRuntime } from '@/lib/provider-settings'
import { sanitizePromptProfile, sanitizePromptValue } from '@/lib/server/prompt-safety'
import { validateDeliverableQuality } from '@/lib/output-quality'
import { insertTaskRun, upsertWorkflowExecutionState } from '@/lib/server/task-execution'

// DEBUG: Log incoming requests
function debugLog(label: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CHAT DEBUG] ${label}:`, JSON.stringify(data, null, 2).slice(0, 500))
  }
}

// Detect whether a user message is casual conversation vs. an actionable task.
// Conversational messages get a lightweight prompt; task messages get the full pipeline context.
const TASK_KEYWORDS = /\b(create|make|build|draft|generate|write|produce|design|plan|schedule|audit|analyze|research|forecast|calendar|campaign|brief|copy|content calendar|media plan|budget|strategy|kpi|seo|competitor|carousel|caption|social post|hashtag|visual|banner|ad creative|launch plan|report)\b/i

function isConversationalMessage(content: string): boolean {
  if (TASK_KEYWORDS.test(content)) return false
  // Short messages without task keywords are conversational
  if (content.trim().length < 80) return true
  // Questions about the agency / agents / capabilities are conversational
  if (/^(who|what|how|why|when|where|can you|do you|tell me|explain|describe|show me)\b/i.test(content.trim())) return true
  return false
}

function enforceArtifactTruth(responseText: string, artifacts: any[]) {
  const lower = responseText.toLowerCase()
  const claimsDelivery =
    lower.includes('shared drive') ||
    lower.includes('client inbox') ||
    lower.includes('saved in') ||
    lower.includes('file:') ||
    lower.includes('sent to the client') ||
    lower.includes('uploaded to')

  if (!claimsDelivery) return responseText

  const hasDeliveredArtifact = artifacts?.some(
    (artifact) => artifact.status === 'delivered' || artifact.path || artifact.link
  )
  if (hasDeliveredArtifact) return responseText

  // Append a clarification note — preserve the actual deliverable content
  return `${responseText}\n\n> **Note:** This output is saved as an internal draft artifact in the app. It has not been exported, uploaded, or sent externally yet.`
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
        return data.map((row: any) => row.definition || {}).filter(Boolean)
      }
    }
  } catch {
    // Fall through to config fallback.
  }

  try {
    const modules = await import('@/config/pipelines/pipelines.json')
    return modules.default.pipelines
  } catch {
    return []
  }
}

// Load skills server-side — returns full skill definitions so agents receive
// actual methodology instructions, not just one-line descriptions.
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
        const categories = new Map<string, { id: string; name: string; skills: any[] }>()

        for (const row of data) {
          if (!categories.has(row.category)) {
            categories.set(row.category, {
              id: row.category,
              name: row.category,
              skills: [],
            })
          }

          // Pass the full skill definition so agents receive actual instructions
          categories.get(row.category)?.skills.push({
            id: row.id,
            name: row.name,
            description: row.description || '',
            instructions: row.instructions || row.definition?.prompts?.en?.instructions || '',
            outputTemplate: row.output_template || row.definition?.prompts?.en?.output_template || '',
            checklist: row.checklist || row.definition?.checklist || [],
          })
        }

        return Array.from(categories.values())
      }
    }
  } catch {
    // Fall through to config fallback.
  }

  try {
    // Load individual skill JSON files which contain full definitions
    // The skills-library.json only has name/description; individual files have instructions
    const modules = await import('@/config/skills/skills-library.json')
    const categories = modules.default.skillCategories || []

    // Dynamically load individual skill JSON files to get instructions, output templates, etc.
    const enrichedCategories = await Promise.all(
      categories.map(async (cat: any) => {
        const enrichedSkills = await Promise.all(
          (cat.skills || []).map(async (skill: any) => {
            try {
              const skillModule = await import(`@/config/skills/${skill.id}.json`)
              const fullSkill = skillModule.default || skillModule
              return {
                id: fullSkill.id || skill.id,
                name: fullSkill.name || skill.name,
                description: fullSkill.description || skill.description || '',
                instructions: fullSkill.prompts?.en?.instructions || '',
                outputTemplate: fullSkill.prompts?.en?.output_template || '',
                checklist: fullSkill.checklist || [],
              }
            } catch {
              return {
                id: skill.id,
                name: skill.name,
                description: skill.description || '',
                instructions: '',
                outputTemplate: '',
                checklist: [],
              }
            }
          })
        )
        return { id: cat.id, name: cat.name, skills: enrichedSkills }
      })
    )
    return enrichedCategories
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


    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const latestUser = [...messages].reverse().find((message) => message.role === 'user')
    const userContent = latestUser?.content || ''
    const normalizedProviderSettings = normalizeProviderSettings(auth.providerSettings || providerSettings)
    const conversational = isConversationalMessage(userContent)

    // Resolve which provider + model to use
    const deliverableType = conversational ? 'status-report' as const : inferDeliverableType(userContent)
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
      selectedProvider: actualProvider,
      selectedModel: actualModel,
      conversational,
    })

    // Check if Ollama is enabled before attempting
    if (actualProvider === 'ollama' && normalizedProviderSettings?.ollama?.enabled === false) {
      console.log('[CHAT ERROR] Ollama is disabled in providerSettings')
      return NextResponse.json({ error: 'Ollama is unavailable right now. Make sure your local Ollama server is running.' }, { status: 503 })
    }

    // ──────────────────────────────────────────────────────────────────────
    // CONVERSATIONAL PATH — lightweight prompt, no missions, no pipelines
    // ──────────────────────────────────────────────────────────────────────
    if (conversational) {
      const agentRoster = agents.slice(0, 10).map((a: any) => `${a.name} (${a.role})`).join(', ')

      // MiniMax best practices: clear format, explain purpose, concise instructions
      const leanSystemPrompt = [
        `ROLE: You are Iris, Chief of Staff at Mission Control — a virtual creative and digital media agency.`,
        `PURPOSE: You help the agency owner manage their team, answer questions, and kick off tasks.`,
        ``,
        `TEAM: ${agentRoster}.`,
        clients.length ? `CLIENTS: ${clients.map((c: any) => c.name).join(', ')}.` : '',
        missions.length ? `ACTIVE WORK: ${missions.slice(0, 5).map((m: any) => m.title).join(', ')}.` : '',
        ``,
        `RESPONSE FORMAT: Short, warm, professional. 1-3 sentences for simple questions. Use markdown for lists.`,
        ``,
        `RULES:`,
        `1. Answer questions about the agency, team, clients, and capabilities directly.`,
        `2. Never promise to "route to" or "check with" another agent — you cannot delegate in chat mode.`,
        `3. When the user wants a deliverable, tell them to type the specific request (e.g. "Create a content calendar for [client name]") and it will execute immediately.`,
        `4. For status questions, answer honestly based on what you know. Say "I don't have those details yet" if unsure.`,
      ].filter(Boolean).join('\n')

      // Keep only last 6 messages to stay well within context window
      const recentMessages = messages.slice(-6)
      const chatMessages = [
        { role: 'system' as const, content: leanSystemPrompt },
        ...recentMessages.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ]

      console.log('[CHAT] Conversational mode — lean prompt (%d chars), %d messages', leanSystemPrompt.length, recentMessages.length)

      try {
        const responseText = await generateText({
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens: Math.min(maxTokens, 768),
          messages: chatMessages,
          ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
          geminiApiKey: normalizedProviderSettings?.gemini?.apiKey,
        })

        console.log('[CHAT] Conversational response — length:', responseText?.length ?? 0)

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
        const status = err instanceof ProviderError
          ? err.status && Number.isFinite(err.status) ? err.status : 503
          : 500
        return NextResponse.json({ error: getFriendlyProviderError(err) }, { status })
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // TASK PATH — full pipeline context, execution plans, mission tracking
    // ──────────────────────────────────────────────────────────────────────
    const [pipelines, skillCategories] = await Promise.all([loadPipelines(), loadSkills()])

    const routing = inferRoutingContext({
      content: userContent,
      clientHints: clients,
      agents,
    })

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
          scopedClient.targetAudiences ? `Audience: ${sanitizePromptValue(scopedClient.targetAudiences)}` : '',
          scopedClient.productsAndServices ? `Products: ${sanitizePromptValue(scopedClient.productsAndServices)}` : '',
          scopedClient.toneOfVoice ? `Tone of voice: ${sanitizePromptValue(scopedClient.toneOfVoice)}` : '',
          scopedClient.strategicPriorities ? `Strategic priorities: ${sanitizePromptValue(scopedClient.strategicPriorities)}` : '',
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
          audience_demographics: scopedClient.audienceDemographics || scopedClient.targetAudiences,
          audience_psychographics: scopedClient.audiencePsychographics || scopedClient.targetAudiences,
          pain_points: scopedClient.painPoints || scopedClient.objectionHandling,
          product_service: scopedClient.productsAndServices,
          business_objectives: scopedClient.strategicPriorities,
          tone: scopedClient.toneOfVoice,
          brand_voice: scopedClient.toneOfVoice,
          campaign_theme: scopedClient.keyMessages,
          visual_direction: scopedClient.brandIdentityNotes,
          asset_specs: scopedClient.brandIdentityNotes,
          competitive_landscape: scopedClient.competitiveLandscape,
          channel_strategy: scopedClient.channelStrategy || scopedClient.strategicPriorities,
          key_dates: scopedClient.operationalDetails,
          posting_frequency: scopedClient.postingFrequency || '',
          platforms: Array.isArray(scopedClient.platforms)
            ? scopedClient.platforms.join(', ')
            : scopedClient.platforms || '',
          content_goal: scopedClient.contentGoal || scopedClient.strategicPriorities || '',
          campaign_duration: scopedClient.campaignDuration || '',
          month_label: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        })
      : undefined

    const executionPlan = buildTaskExecutionPlan({
      deliverableType,
      request: userContent,
      routedAgentId: routing.routedAgentId,
      pipelinePhases: pipelineHint?.phases,
    })

    const executionPrompt = buildExecutionPrompt({
      userRequest: userContent,
      deliverableType,
      routedAgentName: agents.find((agent: any) => agent.id === executionPlan.leadAgentId)?.name || routedAgent?.name,
      clientName: scopedClient?.name,
      clientContext,
    })

    // Build task-mode system context — follows MiniMax best practices:
    // clear structure, explicit format, explain purpose, keep focused
    const routedAgentName = agents.find((a: any) => a.id === executionPlan.leadAgentId)?.name || routedAgent?.name || 'Iris'
    const contextBits = [
      `ROLE: You are ${routedAgentName}, a specialist at Mission Control — a virtual creative agency.`,
      `PURPOSE: Produce the requested deliverable directly. The user is the agency owner who expects finished output, not plans or status updates.`,
      ``,
      `TEAM: ${agents.map((a: any) => `${a.name} (${a.role})`).join(', ')}`,
      routing.routingReason,
      clientContext ? `CLIENT CONTEXT:\n${clientContext}` : '',
      pipelineHint
        ? `PIPELINE: "${pipelineHint.name}" — phases: ${pipelineHint.phases.join(' → ')}`
        : '',
      ``,
      `TASK INSTRUCTIONS:\n${executionPrompt}`,
      ``,
      `OUTPUT FORMAT:`,
      `- Start with a clear heading (# Title)`,
      `- Use markdown sections (## Heading) to organize the deliverable`,
      `- Be specific to the client's industry, audience, and brand voice`,
      `- Produce the actual deliverable content, not a description of what it would contain`,
      `- Mark output as DRAFT`,
      ``,
      `RULES:`,
      `1. Do the work NOW — do not describe what you will do later`,
      `2. Never invent file paths, emails, uploads, or delivery actions`,
      `3. Never use project-management language ("task routed to", "lead agent", "status: in progress")`,
      `4. If work is a draft, say it is a draft`,
    ]
      .filter(Boolean)
      .join('\n')

    // Keep last 8 messages for task context
    const trimmedMessages = messages.slice(-8)
    const chatMessages = [
      { role: 'system', content: contextBits },
      ...trimmedMessages.map((message: any) => ({ role: message.role, content: message.content })),
    ] as const

    let responseText = ''
    let executionSteps: any[] = []
    let qualityResult: { ok: boolean; score: number; issues: string[] } | null = null
    let fallbackUsed = false

    console.log('[CHAT] Task mode — system prompt %d chars, %d messages, deliverable: %s', contextBits.length, trimmedMessages.length, deliverableType)

    // Build mission execution hooks — defined once, reused for primary and fallback runs
    function buildMissionHooks(source: string) {
      if (!missionId) return undefined
      return {
        onPhaseStart: async ({ phase, progress }: { phase: any; progress: number }) => {
          await upsertWorkflowExecutionState({
            taskId: missionId,
            pipelineId: pipelineDefinition?.id || null,
            status: 'active',
            currentPhase: phase.name,
            progress,
            context: { source, phaseId: phase.id },
          }).catch((e: unknown) => console.warn('[CHAT] phase state upsert skipped:', e instanceof Error ? e.message : String(e)))
        },
        onActivityComplete: async ({ phase, activity, agent, runtime, summary, outputIds, progress }: any) => {
          await insertTaskRun({
            taskId: missionId,
            agentId: agent.id,
            stage: `${phase.id}:${activity.id}`,
            status: 'completed',
            inputPayload: { phaseId: phase.id, activityId: activity.id, outputIds },
            outputPayload: { summary, provider: runtime.provider, model: runtime.model },
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          }).catch((e: unknown) => console.warn('[CHAT] activity run insert skipped:', e instanceof Error ? e.message : String(e)))
          await upsertWorkflowExecutionState({
            taskId: missionId,
            pipelineId: pipelineDefinition?.id || null,
            status: 'active',
            currentPhase: phase.name,
            progress,
            context: { source, phaseId: phase.id, activityId: activity.id },
          }).catch((e: unknown) => console.warn('[CHAT] activity state upsert skipped:', e instanceof Error ? e.message : String(e)))
        },
      }
    }

    // Run the task with the given provider/model — extracted to avoid duplication
    async function runTask(provider: typeof actualProvider, model: typeof actualModel, source = 'chat') {
      if (deliverableType !== 'status-report') {
        return executeAutonomousTask({
          request: userContent,
          provider,
          model,
          temperature,
          maxTokens,
          ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
          geminiApiKey: normalizedProviderSettings?.gemini?.apiKey,
          deliverableType,
          executionPrompt,
          clientContext,
          clientProfile,
          agents,
          leadAgentId: executionPlan.leadAgentId,
          collaboratorAgentIds: executionPlan.collaboratorAgentIds,
          qualityChecklist: executionPlan.qualityChecklist,
          pipeline: pipelineDefinition,
          skillCategories,
          hooks: buildMissionHooks(source),
        })
      }
      const text = await generateText({
        provider,
        model,
        temperature,
        maxTokens,
        messages: [...chatMessages],
        ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
        geminiApiKey: normalizedProviderSettings?.gemini?.apiKey,
      })
      return { response: text, executionSteps: [], qualityResult: null }
    }

    // DB tracking — runs before the AI call but must never crash the request
    if (missionId) {
      await upsertWorkflowExecutionState({
        taskId: missionId,
        pipelineId: pipelineDefinition?.id || null,
        status: 'active',
        currentPhase: pipelineDefinition?.phases?.[0]?.name || 'Execution',
        progress: 5,
        context: { source: 'chat', startedBy: auth.userId, request: userContent },
      }).catch((e: unknown) => console.warn('[CHAT] workflow state upsert skipped:', e instanceof Error ? e.message : String(e)))
      await insertTaskRun({
        taskId: missionId,
        agentId: executionPlan.leadAgentId || null,
        stage: 'chat-request',
        status: 'in_progress',
        inputPayload: { deliverableType, pipelineId: pipelineDefinition?.id || null },
        startedAt: new Date().toISOString(),
      }).catch((e: unknown) => console.warn('[CHAT] task run insert skipped:', e instanceof Error ? e.message : String(e)))
    }

    // Helper: single-pass compact task execution (fallback when multi-agent pipeline exceeds context)
    async function runSimpleTask(taskProvider: typeof actualProvider, taskModel: typeof actualModel) {
      // MiniMax best practice: clear role, explicit format, explain purpose
      const compactPrompt = [
        `ROLE: You are ${routedAgentName}, a specialist at Mission Control creative agency.`,
        `PURPOSE: Produce the requested ${deliverableType} deliverable in a single pass.`,
        clientContext ? `CLIENT:\n${clientContext}` : '',
        ``,
        `TASK: ${userContent}`,
        ``,
        `OUTPUT FORMAT:`,
        `- Use markdown with # heading and ## sections`,
        `- Be specific to the client context above`,
        `- Produce actual content, not descriptions`,
        `- Mark as DRAFT`,
        ``,
        `INSTRUCTIONS:\n${executionPrompt}`,
      ].filter(Boolean).join('\n')

      console.log('[CHAT] Simple task fallback — prompt %d chars', compactPrompt.length)
      const text = await generateText({
        provider: taskProvider,
        model: taskModel,
        temperature,
        maxTokens,
        messages: [
          { role: 'system', content: compactPrompt },
          { role: 'user', content: userContent },
        ],
        ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
        geminiApiKey: normalizedProviderSettings?.gemini?.apiKey,
      })
      return { response: text, executionSteps: [] as any[], qualityResult: null }
    }

    try {
      const result = await runTask(actualProvider, actualModel, 'chat')
      responseText = result.response
      executionSteps = result.executionSteps
      qualityResult = result.qualityResult
    } catch (error) {
      console.log('[CHAT ERROR]', error instanceof Error ? error.message : String(error), 'Provider:', actualProvider)

      // First try: fallback to a different provider (e.g. Gemini)
      const fallbackRuntime = resolveFallbackRuntime({
        settings: normalizedProviderSettings,
        currentProvider: actualProvider,
        requestedModel: model,
      })

      if (fallbackRuntime) {
        try {
          actualProvider = fallbackRuntime.provider
          actualModel = fallbackRuntime.model
          fallbackUsed = true
          const result = await runTask(actualProvider, actualModel, 'chat-fallback')
          responseText = result.response
          executionSteps = result.executionSteps
          qualityResult = result.qualityResult
        } catch (fallbackError) {
          console.log('[CHAT ERROR] Fallback provider also failed:', fallbackError instanceof Error ? fallbackError.message : String(fallbackError))
        }
      }

      // Second try: if pipeline failed on both providers, do a single compact call
      if (!responseText) {
        try {
          console.log('[CHAT] Pipeline failed, trying simple single-pass task execution...')
          // Reset to original provider for simple call (smaller prompt = likely to succeed)
          actualProvider = selectedRuntime.provider
          actualModel = selectedRuntime.model
          fallbackUsed = true
          const result = await runSimpleTask(actualProvider, actualModel)
          responseText = result.response
          executionSteps = result.executionSteps
          qualityResult = result.qualityResult
        } catch (simpleError) {
          console.log('[CHAT ERROR] Simple task also failed:', simpleError instanceof Error ? simpleError.message : String(simpleError))
          throw error // throw original error
        }
      }
    }

    // Debug: log what the model actually returned
    console.log('[CHAT] Response from', actualProvider, '/', actualModel, '— length:', responseText?.length ?? 0, '— preview:', (responseText || '').slice(0, 120) || '(empty)')

    // Guard: if the model returned nothing, surface it as an actionable error
    if (!responseText?.trim()) {
      return NextResponse.json(
        { error: `${actualProvider === 'ollama' ? 'Ollama' : 'Gemini'} returned an empty response. The model's context window may have been exceeded, or the model doesn't support this request format. Try a shorter message or switch to a different model in Settings.` },
        { status: 503 }
      )
    }

    responseText = enforceArtifactTruth(responseText, artifacts)
    responseText = enforceDeliverableDraft(responseText, deliverableType)
    if (deliverableType !== 'status-report' && !qualityResult) {
      qualityResult = validateDeliverableQuality(deliverableType, responseText)
    }
    if (missionId) {
      await insertTaskRun({
        taskId: missionId,
        agentId: executionPlan.leadAgentId || null,
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
      }).catch((e: unknown) => console.warn('[CHAT] final task run skipped:', e instanceof Error ? e.message : String(e)))
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
      }).catch((e: unknown) => console.warn('[CHAT] final workflow state skipped:', e instanceof Error ? e.message : String(e)))
    }
    const renderedHtml = buildArtifactHtml(responseText)

    return NextResponse.json({
      response: responseText,
      meta: {
        routedAgentId: routing.routedAgentId,
        leadAgentId: executionPlan.leadAgentId,
        collaboratorAgentIds: executionPlan.collaboratorAgentIds,
        assignedAgentIds: executionPlan.assignedAgentIds,
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
