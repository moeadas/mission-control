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
import { normalizeProviderSettings, resolveFallbackRuntime, resolveTaskRuntime } from '@/lib/provider-settings'

// DEBUG: Log incoming requests
function debugLog(label: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CHAT DEBUG] ${label}:`, JSON.stringify(data, null, 2).slice(0, 500))
  }
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

  const hasDeliveredArtifact = artifacts.some((artifact) => artifact.status === 'delivered' || artifact.path || artifact.link)
  if (hasDeliveredArtifact) return responseText

  return 'No completed or delivered file exists in the app yet. I can draft the output here and save it as an internal artifact, but I should not claim it has been exported, uploaded, or sent.'
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
        const categories = new Map<string, { id: string; name: string; skills: any[] }>()

        for (const row of data) {
          if (!categories.has(row.category)) {
            categories.set(row.category, {
              id: row.category,
              name: row.category,
              skills: [],
            })
          }

          categories.get(row.category)?.skills.push({
            id: row.id,
            name: row.name,
            description: row.description || '',
          })
        }

        return Array.from(categories.values())
      }
    }
  } catch {
    // Fall through to config fallback.
  }

  try {
    const modules = await import('@/config/skills/skills-library.json')
    return modules.default.skillCategories
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json()
    const {
      provider = 'ollama',
      model = 'minimax-m2.7:cloud',
      temperature = 0.7,
      maxTokens = 1024,
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
    } = requestBody


    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // Load pipeline and skill context
    const [pipelines, skillCategories] = await Promise.all([loadPipelines(), loadSkills()])

    const latestUser = [...messages].reverse().find((message) => message.role === 'user')
    const userContent = latestUser?.content || ''

    const routing = inferRoutingContext({
      content: userContent,
      clientHints: clients,
      agents,
    })

    // Infer which pipeline matches this request
    const pipelineHint = inferPipeline(userContent, pipelines)
    const pipelineDefinition = pipelineHint ? pipelines.find((pipeline: any) => pipeline.id === pipelineHint.id) || null : null
    const deliverableType = inferDeliverableType(userContent)
    const normalizedProviderSettings = normalizeProviderSettings(providerSettings)
    const selectedRuntime = resolveTaskRuntime({
      settings: normalizedProviderSettings,
      deliverableType,
      requestedProvider: provider,
      requestedModel: model,
    })
    debugLog('Provider payload', {
      requestedProvider: provider,
      requestedModel: model,
      selectedProvider: selectedRuntime.provider,
      selectedModel: selectedRuntime.model,
      hasProviderSettings: Boolean(providerSettings),
    })
    const routedAgent = agents.find((agent: any) => agent.id === routing.routedAgentId)
    const scopedClient =
      clients.find((client: any) => client.id === routing.clientId || client.id === currentClientId) ||
      clients.find((client: any) => userContent.toLowerCase().includes(client.name.toLowerCase()))

    const clientContext = scopedClient
      ? [
          `Name: ${scopedClient.name}`,
          `Industry: ${scopedClient.industry}`,
          scopedClient.description ? `Overview: ${scopedClient.description}` : '',
          scopedClient.missionStatement ? `Mission: ${scopedClient.missionStatement}` : '',
          scopedClient.brandPromise ? `Brand promise: ${scopedClient.brandPromise}` : '',
          scopedClient.targetAudiences ? `Audience: ${scopedClient.targetAudiences}` : '',
          scopedClient.productsAndServices ? `Products: ${scopedClient.productsAndServices}` : '',
          scopedClient.usp ? `USP: ${scopedClient.usp}` : '',
          scopedClient.keyMessages ? `Key messages: ${scopedClient.keyMessages}` : '',
          scopedClient.toneOfVoice ? `Tone of voice: ${scopedClient.toneOfVoice}` : '',
          scopedClient.strategicPriorities ? `Strategic priorities: ${scopedClient.strategicPriorities}` : '',
          scopedClient.notes ? `Notes: ${scopedClient.notes}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : ''

    const clientProfile = scopedClient
      ? {
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
        }
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
Lead agent: ${executionPlan.leadAgentId}
Supporting agents: ${executionPlan.collaboratorAgentIds.join(', ') || 'none'}
Quality checklist:
- ${executionPlan.qualityChecklist.join('\n- ')}
Handoff notes: ${executionPlan.handoffNotes}`,
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
    let actualProvider = selectedRuntime.provider
    let actualModel = selectedRuntime.model
    let fallbackUsed = false

    debugLog('Calling generateText', { provider: actualProvider, model: actualModel, ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl })

    // Check if Ollama is enabled before attempting
    if (actualProvider === 'ollama' && normalizedProviderSettings?.ollama?.enabled === false) {
      console.log('[CHAT ERROR] Ollama is disabled in providerSettings')
      return NextResponse.json({ error: 'Ollama is unavailable right now. Make sure your local Ollama server is running.' }, { status: 503 })
    }

    try {
      if (deliverableType !== 'status-report') {
        const result = await executeAutonomousTask({
          request: userContent,
          provider: actualProvider,
          model: actualModel,
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
        })
        responseText = result.response
        executionSteps = result.executionSteps
      } else {
        responseText = await generateText({
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens,
          messages: [...chatMessages],
          ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
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
        })
        responseText = result.response
        executionSteps = result.executionSteps
      } else {
        responseText = await generateText({
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens,
          messages: [...chatMessages],
          ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
          geminiApiKey: normalizedProviderSettings?.gemini?.apiKey,
        })
      }
    }

    responseText = enforceArtifactTruth(responseText, artifacts)
    responseText = enforceDeliverableDraft(responseText, deliverableType)
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
        executionPrompt,
        renderedHtml,
        provider: actualProvider,
        model: actualModel,
        fallbackUsed,
      },
    })
  } catch (err: any) {
    console.error('[/api/chat]', err)
    const status =
      err instanceof ProviderError
        ? err.status && Number.isFinite(err.status)
          ? err.status
          : 503
        : 500

    return NextResponse.json({ error: getFriendlyProviderError(err) }, { status })
  }
}
