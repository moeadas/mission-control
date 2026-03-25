import { AIProvider, DeliverableType } from '@/lib/types'
import { getDeliverableOutputSpec } from '@/lib/task-output'

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
  const message = parsed?.error?.message || rawText || `${provider} request failed.`
  return new ProviderError(provider, message, { status, code })
}

export async function generateText(input: {
  provider: AIProvider
  model: string
  messages: Message[]
  temperature: number
  maxTokens: number
  ollamaBaseUrl?: string
  geminiApiKey?: string
}) {
  if (input.provider === 'gemini') {
    if (!input.geminiApiKey) throw new Error('Gemini API key missing.')
    const prompt = input.messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n')
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: input.temperature,
            maxOutputTokens: input.maxTokens,
          },
        }),
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
  const prompt = input.messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n')
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: input.model,
      prompt,
      stream: false,
      options: {
        temperature: input.temperature,
        num_predict: input.maxTokens,
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw normalizeProviderError('ollama', response.status, text || 'Ollama request failed.')
  }

  const data = await response.json()
  return data.response || ''
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
      return 'Ollama is unavailable right now. Make sure your local Ollama server is running.'
    }
  }

  if (error instanceof Error) return error.message
  return 'Chat request failed.'
}

export function inferRoutingContext(input: {
  content: string
  clientHints: { id: string; name: string; industry: string }[]
  agents: { id: string; name: string; specialty: string; role: string }[]
}) {
  const lower = input.content.toLowerCase()
  const client =
    input.clientHints.find((item) => lower.includes(item.name.toLowerCase()) || lower.includes(item.id.toLowerCase())) || null

  const rules = [
    { keywords: ['brand strategy', 'campaign strategy', 'position', 'messaging', 'strategy'], agentId: 'maya' },
    { keywords: ['client', 'presentation', 'update', 'email', 'brief'], agentId: 'sage' },
    { keywords: ['timeline', 'schedule', 'handoff', 'traffic', 'resourcing'], agentId: 'piper' },
    { keywords: ['creative concept', 'creative direction', 'campaign concept', 'concept'], agentId: 'finn' },
    { keywords: ['content calendar', 'caption', 'script', 'copy', 'content'], agentId: 'echo' },
    { keywords: ['visual', 'design', 'asset', 'image', 'nano banana'], agentId: 'lyra' },
    { keywords: ['media plan', 'budget', 'channel', 'ads', 'forecast'], agentId: 'nova' },
    { keywords: ['excel', 'spreadsheet', 'kpi', 'pacing', 'budget sheet'], agentId: 'dex' },
    { keywords: ['research', 'competitor', 'trend', 'seo', 'audit'], agentId: 'atlas' },
  ]

  const matchedRule = rules.find((rule) => rule.keywords.some((keyword) => lower.includes(keyword)))
  const routedAgentId = matchedRule?.agentId || 'iris'
  const routedAgent = input.agents.find((agent) => agent.id === routedAgentId)

  return {
    routedAgentId,
    routingReason: routedAgent
      ? `Iris routed this request to ${routedAgent.name} (${routedAgent.role}) based on the task focus.`
      : 'Iris handled this request directly.',
    clientId: client?.id,
  }
}

export function inferDeliverableType(content: string): DeliverableType {
  const lower = content.toLowerCase()

  const rules: Array<{ keywords: string[]; type: DeliverableType }> = [
    { keywords: ['carousel', 'caption', 'social post', 'instagram post', 'linkedin post', 'campaign content'], type: 'campaign-copy' },
    { keywords: ['content calendar', 'editorial calendar'], type: 'content-calendar' },
    { keywords: ['media plan', 'channel plan'], type: 'media-plan' },
    { keywords: ['budget', 'budget sheet'], type: 'budget-sheet' },
    { keywords: ['kpi', 'forecast', 'projection'], type: 'kpi-forecast' },
    { keywords: ['seo audit', 'technical seo', 'seo report'], type: 'seo-audit' },
    { keywords: ['research', 'competitor', 'insight report'], type: 'research-brief' },
    { keywords: ['brand strategy', 'positioning', 'messaging architecture'], type: 'strategy-brief' },
    { keywords: ['campaign strategy', 'launch plan'], type: 'campaign-strategy' },
    { keywords: ['visual', 'creative asset', 'banner', 'image'], type: 'creative-asset' },
    { keywords: ['brief', 'client brief'], type: 'client-brief' },
  ]

  return rules.find((rule) => rule.keywords.some((keyword) => lower.includes(keyword)))?.type || 'status-report'
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

  const pipelineKeywords: Record<string, { keywords: string[]; confidence: 'high' | 'medium' | 'low' }> = {
    'content-calendar': {
      keywords: ['content calendar', 'social media content', 'content ideas', 'post copy', 'caption', 'hashtag', 'hook', 'instagram', 'linkedin', 'tiktok', 'facebook', 'twitter', 'social post', '30 day', 'visual brief'],
      confidence: 'high',
    },
    'campaign-brief': {
      keywords: ['campaign brief', 'campaign strategy', 'marketing campaign', 'campaign plan', 'campaign concept', 'positioning', 'messaging strategy'],
      confidence: 'high',
    },
    'ad-creative': {
      keywords: ['ad creative', 'advertising creative', 'ad copy', 'ad assets', 'banner ads', 'facebook ads', 'google ads', 'instagram ads', 'ad campaign', 'a/b test'],
      confidence: 'high',
    },
    'seo-audit': {
      keywords: ['seo audit', 'seo analysis', 'search engine optimization', 'keyword research', 'technical seo', 'seo report', 'seo strategy'],
      confidence: 'high',
    },
    'competitor-research': {
      keywords: ['competitor research', 'competitive analysis', 'competitor report', 'market research', 'competitor intelligence', 'competitor audit'],
      confidence: 'high',
    },
    'media-plan': {
      keywords: ['media plan', 'media strategy', 'channel strategy', 'budget allocation', 'media buying', 'ad spend', 'channel mix', 'media schedule'],
      confidence: 'high',
    },
  }

  let bestMatch: { pipelineId: string; matchCount: number; confidence: 'high' | 'medium' | 'low' } | null = null

  for (const [pipelineId, { keywords, confidence }] of Object.entries(pipelineKeywords)) {
    const matchCount = keywords.filter(kw => lower.includes(kw)).length
    if (matchCount > 0) {
      if (!bestMatch || matchCount > bestMatch.matchCount || (matchCount === bestMatch.matchCount && confidence === 'high')) {
        bestMatch = { pipelineId, matchCount, confidence }
      }
    }
  }

  if (!bestMatch) return null

  const pipeline = pipelines.find((p: any) => p.id === bestMatch!.pipelineId)
  if (!pipeline) return null

  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    confidence: bestMatch.confidence,
    phases: pipeline.phases.map((p: any) => p.name),
    estimatedDuration: pipeline.estimatedDuration,
    clientProfileFields: pipeline.clientProfileFields || [],
  }
}

export function buildExecutionPrompt(input: {
  userRequest: string
  deliverableType: DeliverableType
  routedAgentName?: string
  clientName?: string
  clientContext?: string
}) {
  const lead = input.routedAgentName || 'the assigned specialist'
  const clientLine = input.clientName ? `Client: ${input.clientName}` : 'Client: not specified'
  const instructions = getDeliverableOutputSpec(input.deliverableType, input.userRequest)

  return [
    `Lead specialist: ${lead}`,
    clientLine,
    `Deliverable type: ${input.deliverableType}`,
    input.clientContext ? `Client context:\n${input.clientContext}` : '',
    instructions,
    'Do not answer with "task routed", "lead agent", "status", "delivery", or project-management boilerplate when the user asked for a deliverable.',
    'Produce the actual draft output itself unless the user explicitly asked for planning only.',
    'Assume the task starts now. Do not describe that you will do the work later. Do the work in the answer.',
    'Make the result specific to the client, industry, audience, and product context provided.',
    'Do not invent file paths, exports, delivery actions, inbox sends, or deadlines unless explicitly provided in context.',
    'Use only real agent names from context. Do not invent team members.',
    'If work is still a draft, say it is a draft.',
    `User request: ${input.userRequest}`,
  ].join('\n')
}
