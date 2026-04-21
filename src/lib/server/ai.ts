import { AIProvider, DeliverableType } from '@/lib/types'
import { DELIVERABLE_REGISTRY, getDeliverableSpec, inferDeliverableTypeFromText, isSubstantiveRequest } from '@/lib/deliverables'
import { getDeliverableOutputSpec } from '@/lib/task-output'
import { resolveTaskRoutingBlueprint } from '@/lib/server/task-channeling'

type VerifyPayload =
  | { provider: 'ollama'; baseUrl: string }
  | { provider: 'gemini'; apiKey: string }

export async function verifyProvider(payload: VerifyPayload) {
  if (payload.provider === 'ollama') {
    const baseUrl = payload.baseUrl.replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/api/tags`)
    if (!response.ok) {
      throw new Error('Could not reach Ollama.')
    }
    const data = await response.json()
    const models = Array.isArray(data.models) ? data.models.map((model: { name: string }) => model.name) : []
    return { ok: true, models }
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${payload.apiKey}`)
  if (!response.ok) {
    throw new Error('Gemini API key verification failed.')
  }
  const data = await response.json()
  const models = Array.isArray(data.models)
    ? data.models
        .map((model: { name?: string }) => model.name?.replace('models/', ''))
        .filter(Boolean)
    : []
  return { ok: true, models }
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class ProviderError extends Error {
  provider: AIProvider
  status?: number
  code?: string

  constructor(provider: AIProvider, message: string, options?: { status?: number; code?: string }) {
    super(message)
    this.name = 'ProviderError'
    this.provider = provider
    this.status = options?.status
    this.code = options?.code
  }
}

function normalizeProviderError(provider: AIProvider, status: number, rawText: string) {
  let parsed: any = null
  try {
    parsed = JSON.parse(rawText)
  } catch {
    parsed = null
  }

  const code = parsed?.error?.status || parsed?.error?.code
  const message =
    (typeof parsed?.error === 'object' ? parsed.error.message : null) ||
    (typeof parsed?.error === 'string' ? parsed.error : null) ||
    rawText ||
    `${provider} request failed.`
  return new ProviderError(provider, message, { status, code })
}

export async function generateText(input: {
  provider: AIProvider
  model: string
  messages: Message[]
  temperature: number
  maxTokens: number
  ollamaBaseUrl?: string
  ollamaContextWindow?: number
  geminiApiKey?: string
  timeoutMs?: number
}) {
  const timeoutMs = Math.max(5_000, input.timeoutMs || 90_000)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(`Timed out after ${timeoutMs}ms`), timeoutMs)

  try {
  if (input.provider === 'gemini') {
    if (!input.geminiApiKey) throw new Error('Gemini API key missing.')

    const systemMessage = input.messages.find((message) => message.role === 'system')
    const conversationMessages = input.messages.filter((message) => message.role !== 'system')
    const contents = conversationMessages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }))

    if (contents.length === 0 && systemMessage) {
      contents.push({ role: 'user', parts: [{ text: systemMessage.content }] })
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: input.temperature,
        maxOutputTokens: input.maxTokens,
      },
    }

    if (systemMessage && conversationMessages.length > 0) {
      body.systemInstruction = { parts: [{ text: systemMessage.content }] }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      const text = await response.text()
      throw normalizeProviderError('gemini', response.status, text)
    }

    const data = await response.json()
    const text =
      data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || ''
    return text
  }

  const baseUrl = (input.ollamaBaseUrl || 'http://localhost:11434').replace(/\/$/, '')
  const isCloudModel = input.model.includes(':cloud')
  const configuredCtx =
    typeof input.ollamaContextWindow === 'number' && input.ollamaContextWindow > 0
      ? input.ollamaContextWindow
      : undefined
  const numCtx = configuredCtx
    ? Math.max(2048, Math.min(configuredCtx, isCloudModel ? 65536 : 32768))
    : undefined

  const baseMessages = input.messages.map((message) => ({ role: message.role, content: message.content }))
  const hasNonSystemMessage = baseMessages.some((message) => message.role !== 'system')
  const messages = hasNonSystemMessage
    ? baseMessages
    : [
        ...baseMessages,
        {
          role: 'user' as const,
          content: 'Execute the instruction above and return only the requested output.',
        },
      ]

  const ollamaPayload = {
    model: input.model,
    messages,
    stream: false,
    options: {
      temperature: input.temperature,
      num_predict: input.maxTokens,
      ...(numCtx ? { num_ctx: numCtx } : {}),
    },
  }

  let response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ollamaPayload),
    signal: controller.signal,
  })

  if (response.status === 500 && isCloudModel) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaPayload),
      signal: controller.signal,
    })
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw normalizeProviderError('ollama', response.status, text || 'Ollama request failed.')
  }

  const data = await response.json()
  return data.message?.content || ''
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || /timed out/i.test(error.message))) {
      throw new ProviderError(input.provider, `Model call timed out after ${Math.round(timeoutMs / 1000)}s.`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export function getFriendlyProviderError(error: unknown) {
  if (error instanceof ProviderError) {
    if (error.provider === 'gemini' && (error.status === 429 || error.code === 'RESOURCE_EXHAUSTED')) {
      return 'Gemini quota is exhausted right now. Enable Ollama as a fallback, switch Iris to an Ollama model, or check Gemini billing and rate limits.'
    }
    if (error.provider === 'gemini') {
      return 'Gemini is unavailable right now. Check the API key, billing, or quota.'
    }
    if (error.provider === 'ollama') {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('econnrefused') || msg.includes('fetch failed') || msg.includes('network') || msg.includes('etimedout')) {
        return 'Ollama is unavailable right now. Make sure your local Ollama server is running.'
      }
      if (error.status === 500 || msg.includes('internal server error')) {
        return "Ollama model error — the conversation may be too long for the model's context window. Try starting a new chat, or switch to a model with a larger context in Settings."
      }
      return `Ollama error: ${error.message || 'Unknown error. Check that Ollama is running and the model is available.'}`
    }
  }

  if (error instanceof Error) return error.message
  return 'Chat request failed.'
}

export interface RoutingContext {
  routedAgentId: string
  routingReason: string
  clientId?: string
  deliverableType: DeliverableType
  collaboratorAgentIds: string[]
  pipelineId: string | null
  confidence: 'high' | 'medium' | 'low'
}

export function inferRoutingContext(input: {
  content: string
  clientHints: { id: string; name: string; industry: string }[]
  agents: { id: string; name: string; specialty: string; role: string; skills?: string[] }[]
}): RoutingContext {
  const lower = input.content.toLowerCase()
  const deliverableType = inferDeliverableType(input.content)
  const spec = getDeliverableSpec(deliverableType)
  const client =
    input.clientHints.find((item) => lower.includes(item.name.toLowerCase()) || lower.includes(item.id.toLowerCase())) || null

  const routingBlueprint = resolveTaskRoutingBlueprint({
    request: input.content,
    deliverableType,
    agents: input.agents,
  })
  const routedAgentId = routingBlueprint.leadAgentId
  const collaborators = new Set(routingBlueprint.collaboratorAgentIds)

  const routedAgent = input.agents.find((agent) => agent.id === routedAgentId)
  const patternMatches = spec.patterns.filter((pattern) => pattern.test(lower)).length
  const confidence: 'high' | 'medium' | 'low' =
    routingBlueprint.confidence ||
    (deliverableType === 'status-report'
      ? 'low'
      : patternMatches >= 2
        ? 'high'
        : patternMatches === 1 || deliverableType === 'general-task'
          ? 'medium'
          : 'low')

  const collaboratorNames = Array.from(collaborators)
    .map((id) => input.agents.find((agent) => agent.id === id)?.name || id)
    .join(', ')

  return {
    routedAgentId,
    routingReason:
      deliverableType === 'status-report'
        ? 'Iris handled this request directly as a conversational response.'
        : routedAgent
          ? `Iris identified this as ${spec.label.toLowerCase()} work and routed it to ${routedAgent.name} (${routedAgent.role}) as lead.${collaborators.size ? ` Supporting: ${collaboratorNames}.` : ''}`
          : 'Iris routed this request to the best available specialist.',
    clientId: client?.id,
    deliverableType,
    collaboratorAgentIds: Array.from(collaborators),
    pipelineId: spec.pipelineId,
    confidence,
  }
}

export function inferDeliverableType(content: string): DeliverableType {
  return inferDeliverableTypeFromText(content)
}

export interface PipelineHint {
  id: string
  name: string
  description: string
  confidence: 'high' | 'medium' | 'low'
  phases: string[]
  estimatedDuration: string
  clientProfileFields: Array<{ id: string; label: string; type: string; required: boolean }>
}

export function inferPipeline(content: string, pipelines: any[]): PipelineHint | null {
  const lower = content.toLowerCase()

  let bestMatch: { pipelineId: string; matchCount: number; specificity: number } | null = null

  for (const spec of DELIVERABLE_REGISTRY) {
    if (!spec.pipelineId || !spec.pipelineKeywords.length) continue
    let matchCount = 0
    let totalMatchLength = 0
    for (const keyword of spec.pipelineKeywords) {
      if (lower.includes(keyword)) {
        matchCount += 1
        totalMatchLength += keyword.length
      }
    }
    if (matchCount > 0) {
      const specificity = totalMatchLength / spec.pipelineKeywords.length
      if (!bestMatch || matchCount > bestMatch.matchCount || (matchCount === bestMatch.matchCount && specificity > bestMatch.specificity)) {
        bestMatch = { pipelineId: spec.pipelineId, matchCount, specificity }
      }
    }
  }

  if (!bestMatch) return null

  const pipeline = pipelines.find((p: any) => p.id === bestMatch.pipelineId)
  if (!pipeline) return null

  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    confidence: bestMatch.matchCount >= 3 ? 'high' : bestMatch.matchCount >= 2 ? 'medium' : 'low',
    phases: pipeline.phases.map((p: any) => p.name),
    estimatedDuration: pipeline.estimatedDuration,
    clientProfileFields: pipeline.clientProfileFields || [],
  }
}

export function resolvePipelineSelection(input: {
  content: string
  deliverableType: DeliverableType
  pipelines: any[]
  preferredPipelineId?: string | null
  fallbackPipelineId?: string | null
}) {
  const spec = getDeliverableSpec(input.deliverableType)
  const inferred = inferPipeline(input.content, input.pipelines)

  const orderedIds = [
    input.preferredPipelineId || null,
    inferred?.id || null,
    spec.pipelineId || null,
    input.fallbackPipelineId || null,
  ].filter(Boolean) as string[]

  const pipeline =
    orderedIds
      .map((pipelineId) => input.pipelines.find((entry: any) => entry.id === pipelineId) || null)
      .find(Boolean) || null

  return {
    hint: inferred,
    pipeline,
    pipelineId: pipeline?.id || null,
    pipelineName: pipeline?.name || inferred?.name || null,
  }
}

export function buildExecutionPrompt(input: {
  userRequest: string
  deliverableType: DeliverableType
  routedAgentName?: string
  routedAgentSpecialty?: string
  collaboratorAgents?: Array<{ name: string; role: string; specialty?: string }>
  clientName?: string
  clientContext?: string
  clientIndustry?: string
  clientToneOfVoice?: string
  clientTargetAudiences?: string
  clientBrandPromise?: string
  clientKeyMessages?: string
  pipelineName?: string
  briefFields?: Record<string, unknown>
}) {
  const spec = getDeliverableSpec(input.deliverableType)
  const lead = input.routedAgentName || 'the assigned specialist'
  const clientLine = input.clientName ? `Client: ${input.clientName}` : 'Client: not specified'
  const instructions = getDeliverableOutputSpec(input.deliverableType, input.userRequest)

  const lines: string[] = [
    '# Execution Brief',
    '',
    `Lead specialist: ${lead}${input.routedAgentSpecialty ? ` (${input.routedAgentSpecialty})` : ''}`,
  ]

  if (input.collaboratorAgents?.length) {
    lines.push('Supporting team:')
    lines.push(
      ...input.collaboratorAgents.map(
        (agent) => `  - ${agent.name} (${agent.role}${agent.specialty ? ` — ${agent.specialty}` : ''})`
      )
    )
  }

  lines.push(clientLine)
  lines.push(`Deliverable type: ${spec.label} (${spec.id})`)
  lines.push(`Category: ${spec.category}`)
  if (input.pipelineName) lines.push(`Pipeline: ${input.pipelineName}`)
  lines.push('')

  if (input.clientIndustry || input.clientToneOfVoice || input.clientTargetAudiences || input.clientBrandPromise || input.clientKeyMessages || input.clientContext) {
    lines.push('## Client Context')
    if (input.clientIndustry) lines.push(`Industry: ${input.clientIndustry}`)
    if (input.clientBrandPromise) lines.push(`Brand Promise: ${input.clientBrandPromise}`)
    if (input.clientTargetAudiences) lines.push(`Target Audiences: ${input.clientTargetAudiences}`)
    if (input.clientToneOfVoice) lines.push(`Tone of Voice: ${input.clientToneOfVoice}`)
    if (input.clientKeyMessages) lines.push(`Key Messages: ${input.clientKeyMessages}`)
    if (input.clientContext) lines.push(`Additional Context: ${input.clientContext}`)
    lines.push('')
  }

  if (input.briefFields && Object.keys(input.briefFields).length > 0) {
    lines.push('## Confirmed Brief')
    for (const [key, value] of Object.entries(input.briefFields)) {
      if (value !== undefined && value !== null && value !== '') {
        lines.push(`- ${key}: ${Array.isArray(value) ? value.join(' + ') : String(value)}`)
      }
    }
    lines.push('')
  }

  lines.push('## Output Specification')
  lines.push(instructions)
  lines.push('')
  lines.push('## Execution Rules')
  lines.push('Do not answer with "task routed", "lead agent", "status", "delivery", or project-management boilerplate when the user asked for a deliverable.')
  lines.push('Produce the actual draft output itself unless the user explicitly asked for planning only.')
  lines.push('Assume the task starts now. Do not describe that you will do the work later. Do the work in the answer.')
  lines.push('Make the result specific to the client, industry, audience, and product context provided.')
  lines.push('Do not invent file paths, exports, delivery actions, inbox sends, or deadlines unless explicitly provided in context.')
  lines.push('Use only real agent names from context. Do not invent team members.')
  lines.push('If work is still a draft, say it is a draft.')
  if (spec.complexity === 'high') {
    lines.push('This is a complex deliverable. Be thorough, structured, and stakeholder-readable.')
  } else if (spec.complexity === 'low') {
    lines.push('Keep the output concise and focused. Do not pad the response.')
  }
  lines.push('')
  lines.push('## User Request')
  lines.push(input.userRequest)

  return lines.join('\n')
}
