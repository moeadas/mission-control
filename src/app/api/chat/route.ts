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

// Load pipelines server-side
async function loadPipelines() {
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
      model = 'llama3.2:latest',
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


    // Comprehensive debug logging
    debugLog('Full request body keys', Object.keys(req.headers).length > 0 ? 'headers present' : 'no headers')
    console.log('[CHAT DEBUG] Full payload:', JSON.stringify({ provider, model, providerSettings: providerSettings ? JSON.stringify(providerSettings) : 'null' }, null, 2).slice(0, 1000))

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
    const deliverableType = inferDeliverableType(userContent)
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

    const executionPrompt = buildExecutionPrompt({
      userRequest: userContent,
      deliverableType,
      routedAgentName: routedAgent?.name,
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
    let actualProvider = provider
    let actualModel = model
    let fallbackUsed = false

    debugLog('Calling generateText', { provider, model, ollamaBaseUrl: providerSettings?.ollama?.baseUrl })

    // Check if Ollama is enabled before attempting
    if (provider === 'ollama' && providerSettings?.ollama?.enabled === false) {
      console.log('[CHAT ERROR] Ollama is disabled in providerSettings')
      return NextResponse.json({ error: 'Ollama is unavailable right now. Make sure your local Ollama server is running.' }, { status: 503 })
    }

    try {
      responseText = await generateText({
        provider,
        model,
        temperature,
        maxTokens,
        messages: [...chatMessages],
        ollamaBaseUrl: providerSettings?.ollama?.baseUrl,
        geminiApiKey: providerSettings?.gemini?.apiKey,
      })
    } catch (error) {
      console.log('[CHAT ERROR]', error instanceof Error ? error.message : String(error), 'Provider:', provider)
      const shouldFallbackToOllama =
        error instanceof ProviderError &&
        error.provider === 'gemini' &&
        (error.status === 429 || error.code === 'RESOURCE_EXHAUSTED') &&
        providerSettings?.ollama?.enabled

      if (!shouldFallbackToOllama) {
        throw error
      }

      actualProvider = 'ollama'
      actualModel =
        providerSettings?.ollama?.availableModels?.[0] ||
        providerSettings?.ollama?.model ||
        'llama3.2:latest'
      fallbackUsed = true

      responseText = await generateText({
        provider: 'ollama',
        model: actualModel,
        temperature,
        maxTokens,
        messages: [...chatMessages],
        ollamaBaseUrl: providerSettings?.ollama?.baseUrl,
      })
    }

    responseText = enforceArtifactTruth(responseText, artifacts)
    responseText = enforceDeliverableDraft(responseText, deliverableType)

    return NextResponse.json({
      response: responseText,
      meta: {
        routedAgentId: routing.routedAgentId,
        clientId: routing.clientId || currentClientId || null,
        campaignId: currentCampaignId || null,
        deliverableType,
        pipelineId: pipelineHint?.id || null,
        pipelineName: pipelineHint?.name || null,
        executionPrompt,
        provider: actualProvider,
        model: actualModel,
        fallbackUsed,
      },
    })
  } catch (err: any) {
    console.error('[/api/chat]', err)
    return NextResponse.json({ error: getFriendlyProviderError(err) }, { status: 500 })
  }
}
