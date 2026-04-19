import { ArtifactExecutionStep, AIProvider, DeliverableType } from '@/lib/types'
import { generateText } from '@/lib/server/ai'
import { pickAgentForRole } from '@/lib/agent-roles'
import { sanitizePromptProfile, sanitizePromptValue } from '@/lib/server/prompt-safety'
import { validateDeliverableQuality } from '@/lib/output-quality'

interface RuntimeAgent {
  id: string
  name: string
  role: string
  specialty?: string
  skills?: string[]
  tools?: string[]
  provider?: AIProvider
  model?: string
  systemPrompt?: string
}

interface PipelineActivity {
  id: string
  name: string
  description?: string
  assignedRole?: string
  checklist?: string[]
  prompts?: { en?: string; ar?: string }
  outputs?: string[]
  maxTokens?: number
  outputFormat?: string
  outputSchema?: {
    shape?: string
    key?: string
    itemFields?: string[]
  }
  batching?: {
    batchSize?: number
    parallel?: boolean
    itemLabel?: string
    totalItems?: number
  }
}

interface PipelinePhase {
  id: string
  name: string
  activities?: PipelineActivity[]
}

interface PipelineLike {
  id: string
  name: string
  phases?: PipelinePhase[]
}

interface ClientProfileMap {
  [key: string]: string
}

interface SkillRef {
  name: string
  description?: string
  instructions?: string
  outputTemplate?: string
  checklist?: string[]
  workflowSteps?: Array<{ step?: number; name?: string; action?: string; verify?: string }>
  variables?: Array<{ name?: string; description?: string; required?: boolean }>
  examples?: Array<{ title?: string; prompt?: string; output?: string }>
}

interface ExecutionHooks {
  onPhaseStart?: (input: { phase: PipelinePhase; progress: number }) => Promise<void> | void
  onActivityComplete?: (input: {
    phase: PipelinePhase
    activity: PipelineActivity
    agent: RuntimeAgent
    runtime: { provider: AIProvider; model: string }
    summary: string
    outputIds: string[]
    progress: number
  }) => Promise<void> | void
  onActivityFailure?: (input: {
    phase: PipelinePhase
    activity: PipelineActivity
    agent: RuntimeAgent
    runtime: { provider: AIProvider; model: string }
    progress: number
    error: string
    outputPayload?: Record<string, unknown>
  }) => Promise<void> | void
}

type GenerateTextFn = typeof generateText

interface StructuredActivityErrorContext {
  phaseId: string
  phaseName: string
  activityId: string
  activityName: string
  agentId: string
  agentName: string
  expectedShape: string
}

function activityWantsJson(activity: PipelineActivity) {
  const prompt = [activity.description || '', activity.prompts?.en || '', activity.prompts?.ar || ''].join(' ').toLowerCase()
  return (
    activity.outputFormat === 'json' ||
    prompt.includes('json') ||
    prompt.includes('kanban') ||
    /\bvisual_brief\b|\bsuggested_style\b|\bwhat_changed\b/.test(prompt)
  )
}

function getStructuredShape(activity: PipelineActivity) {
  if (activity.id === 'generate-ideas') {
    const key = activity.outputSchema?.key || 'ideas'
    return `JSON object: {"${key}": Idea[]} or {"idea": Idea}`
  }
  if (activity.id === 'assemble-calendar') return 'JSON array of calendar entries'
  if (activity.id === 'create-visual-briefs') return 'JSON array of visual brief entries'
  if (activity.id === 'generate-hashtags') return 'JSON object or array with hashtag groups'
  return 'valid JSON'
}

function getActivityTokenBudget(activity: PipelineActivity, maxTokens: number) {
  const configured = typeof activity.maxTokens === 'number' ? activity.maxTokens : 0
  const requested = Math.max(maxTokens || 0, configured)
  const base = Math.min(Math.max(requested, 1600), 8192)
  if (activity.id === 'generate-ideas') return Math.min(Math.max(requested, configured || 8192, 4096), 8192)
  if (activity.id === 'assemble-calendar') return Math.min(Math.max(requested, configured || 4800, 3200), 8192)
  if (activity.id === 'draft-posts' || activity.id === 'adapt-posts') return Math.min(Math.max(requested, configured || 3600, 2600), 8192)
  if (activity.id === 'generate-hashtags' || activity.id === 'create-visual-briefs') return Math.min(Math.max(requested, configured || 2800, 2200), 8192)
  return base
}

function extractJsonCandidate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const fromFence = fencedMatch?.[1]?.trim()
  if (fromFence) return fromFence

  const firstBrace = trimmed.indexOf('{')
  const firstBracket = trimmed.indexOf('[')
  const startCandidates = [firstBrace, firstBracket].filter((index) => index >= 0)
  if (!startCandidates.length) return null
  const start = Math.min(...startCandidates)
  const sliced = trimmed.slice(start)

  for (let end = sliced.length; end > 0; end -= 1) {
    const candidate = sliced.slice(0, end).trim()
    if (!candidate) continue
    try {
      JSON.parse(candidate)
      return candidate
    } catch {
      // keep shrinking until we find the largest valid JSON block
    }
  }

  return sliced
}

function normalizeStructuredOutput(value: string, activity: PipelineActivity) {
  if (!activityWantsJson(activity)) {
    return { ok: true, content: value.trim(), parsed: null as any }
  }

  const candidate = extractJsonCandidate(value)
  if (!candidate) {
    return { ok: false, content: value.trim(), parsed: null as any, error: 'No JSON block found.' }
  }

  try {
    const parsed = JSON.parse(candidate)
    if (activity.id === 'generate-ideas') {
      const ideas = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.ideas)
          ? parsed.ideas
          : parsed?.idea
            ? [parsed.idea]
            : null
      if (!Array.isArray(ideas) || ideas.length === 0) {
        return {
          ok: false,
          content: candidate,
          parsed: null as any,
          error: 'Expected a JSON object with a non-empty "ideas" array.',
        }
      }
    }
    if (activity.id === 'assemble-calendar' && !Array.isArray(parsed)) {
      return {
        ok: false,
        content: candidate,
        parsed: null as any,
        error: 'Expected a JSON array for calendar entries.',
      }
    }
    return {
      ok: true,
      content: JSON.stringify(parsed, null, 2),
      parsed,
    }
  } catch (error) {
    return {
      ok: false,
      content: candidate,
      parsed: null as any,
      error: error instanceof Error ? error.message : 'Invalid JSON.',
    }
  }
}

function validateAndRepairJson(value: string, activity: PipelineActivity) {
  const normalized = normalizeStructuredOutput(value, activity)
  if (normalized.ok) return normalized

  const candidate = normalized.content || value.trim()
  if (!candidate) {
    return normalized
  }

  const repaired = candidate
    .replace(/,\s*$/, '')
    .replace(/,\s*([}\]])/g, '$1')

  const openBraces = (repaired.match(/\{/g) || []).length
  const closeBraces = (repaired.match(/\}/g) || []).length
  const openBrackets = (repaired.match(/\[/g) || []).length
  const closeBrackets = (repaired.match(/\]/g) || []).length

  let balanced = repaired
  for (let i = 0; i < openBrackets - closeBrackets; i += 1) balanced += ']'
  for (let i = 0; i < openBraces - closeBraces; i += 1) balanced += '}'

  return normalizeStructuredOutput(balanced, activity)
}

function slugLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function truncate(value: string, max = 900) {
  const normalized = value.trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 3)}...`
}

function extractClientContextValue(source: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?=\\n[A-Z][^\\n]*:|$)`))
  return match?.[1]?.trim() || ''
}

function buildClientProfileMap(clientContext: string, explicitProfile?: ClientProfileMap) {
  const merged: ClientProfileMap = { ...(sanitizePromptProfile(explicitProfile || {}) || {}) }

  const derivedValues: Record<string, string> = {
    brand_name: explicitProfile?.brand_name || sanitizePromptValue(extractClientContextValue(clientContext, 'Name')),
    niche: explicitProfile?.niche || sanitizePromptValue(extractClientContextValue(clientContext, 'Industry')),
    industry: explicitProfile?.industry || sanitizePromptValue(extractClientContextValue(clientContext, 'Industry')),
    target_audience: explicitProfile?.target_audience || sanitizePromptValue(extractClientContextValue(clientContext, 'Audience')),
    audience_demographics: explicitProfile?.audience_demographics || sanitizePromptValue(extractClientContextValue(clientContext, 'Audience')),
    audience_psychographics: explicitProfile?.audience_psychographics || sanitizePromptValue(extractClientContextValue(clientContext, 'Audience')),
    pain_points: explicitProfile?.pain_points || sanitizePromptValue(extractClientContextValue(clientContext, 'Strategic priorities')),
    tone: explicitProfile?.tone || sanitizePromptValue(extractClientContextValue(clientContext, 'Tone of voice')),
    brand_voice: explicitProfile?.brand_voice || sanitizePromptValue(extractClientContextValue(clientContext, 'Tone of voice')),
    product_service: explicitProfile?.product_service || sanitizePromptValue(extractClientContextValue(clientContext, 'Products')),
    business_objectives: explicitProfile?.business_objectives || sanitizePromptValue(extractClientContextValue(clientContext, 'Strategic priorities')),
    campaign_theme: explicitProfile?.campaign_theme || sanitizePromptValue(extractClientContextValue(clientContext, 'Key messages')),
    visual_direction: explicitProfile?.visual_direction || sanitizePromptValue(extractClientContextValue(clientContext, 'Brand promise')),
    asset_specs: explicitProfile?.asset_specs || sanitizePromptValue(extractClientContextValue(clientContext, 'Brand identity notes')),
    competitive_landscape: explicitProfile?.competitive_landscape || sanitizePromptValue(extractClientContextValue(clientContext, 'Notes')),
    channel_strategy: explicitProfile?.channel_strategy || sanitizePromptValue(extractClientContextValue(clientContext, 'Strategic priorities')),
    budget_range: explicitProfile?.budget_range || 'TBD - planning assumptions required',
    budget: explicitProfile?.budget || 'TBD - planning assumptions required',
    timeline: explicitProfile?.timeline || 'TBD',
    campaign_duration: explicitProfile?.campaign_duration || '30 days',
    key_dates: explicitProfile?.key_dates || 'TBD',
    posting_frequency: explicitProfile?.posting_frequency || '3-4 posts per week',
    platforms: explicitProfile?.platforms || 'Instagram, LinkedIn',
    content_goal: explicitProfile?.content_goal || 'Awareness and lead generation',
    month_label: explicitProfile?.month_label || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  }

  for (const [key, value] of Object.entries(derivedValues)) {
    if (value && !merged[key]) merged[key] = value
  }

  return merged
}

function interpolateTemplate(template: string, data: ClientProfileMap) {
  let result = template
  for (const [key, value] of Object.entries(data)) {
    result = result.split(`{{${key}}}`).join(value)
  }
  return result.replace(/\{\{[^}]+\}\}/g, 'TBD')
}

function extractItemCount(activity: PipelineActivity) {
  if (typeof activity.batching?.totalItems === 'number' && activity.batching.totalItems > 0) {
    return activity.batching.totalItems
  }

  const match = `${activity.name} ${activity.description || ''}`.match(/\b(\d+)\s+(content ideas|ideas|hooks|posts|items)\b/i)
  return match ? Number.parseInt(match[1], 10) : 0
}

function getActivityOutputShapeInstruction(activity: PipelineActivity) {
  if (!activityWantsJson(activity)) return ''

  if (activity.id === 'generate-ideas') {
    const key = activity.outputSchema?.key || 'ideas'
    const fields = activity.outputSchema?.itemFields?.length
      ? activity.outputSchema.itemFields.join(', ')
      : 'id, title, pillar, description, platform, format, difficulty'
    return [
      'OUTPUT FORMAT: Return valid JSON only.',
      'Do not wrap in markdown code fences.',
      'Do not include any text before or after the JSON.',
      `Required top-level shape: {"${key}":[...]}`,
      `Each item must include: ${fields}.`,
      'If you cannot fit everything, return fewer complete items rather than truncated JSON.',
    ].join('\n')
  }

  return [
    'OUTPUT FORMAT: Return valid JSON only.',
    'Do not wrap in markdown code fences.',
    'Do not include any text before or after the JSON.',
    'Every JSON object and array must be fully closed and machine-parseable.',
  ].join('\n')
}

function buildSkillLookup(skillCategories: any[]) {
  const skillLookup = new Map<string, SkillRef>()
  for (const category of skillCategories || []) {
    for (const skill of category.skills || []) {
      skillLookup.set(skill.id, {
        name: skill.name,
        description: skill.description,
        instructions: skill.prompts?.en?.instructions || '',
        outputTemplate: skill.prompts?.en?.output_template || '',
        checklist: Array.isArray(skill.checklist) ? skill.checklist : [],
        workflowSteps: Array.isArray(skill.workflow?.steps) ? skill.workflow.steps : [],
        variables: Array.isArray(skill.variables) ? skill.variables : [],
        examples: Array.isArray(skill.examples) ? skill.examples : [],
      })
    }
  }
  return skillLookup
}

function agentSkillsContext(agent: RuntimeAgent, skillLookup: Map<string, SkillRef>) {
  return agentSkillsContextFromIds(agent, skillLookup, agent.skills || [])
}

function agentSkillsContextFromIds(agent: RuntimeAgent, skillLookup: Map<string, SkillRef>, selectedSkillIds: string[]) {
  const assignedSkills = (agent.skills || [])
    .filter((skillId) => !selectedSkillIds.length || selectedSkillIds.includes(skillId))
    .map((skillId) => ({ id: skillId, ...(skillLookup.get(skillId) || { name: skillId }) }))
    .slice(0, 4)

  const tools = (agent.tools || []).slice(0, 8)

  const parts = []
  parts.push(
    assignedSkills.length
      ? assignedSkills
          .map((skill, index) => {
            const isPrimarySkill = index === 0
            return [
              `- ${skill.name}${skill.description ? `: ${skill.description}` : ''}`,
              skill.instructions
                ? `  Instructions: ${isPrimarySkill ? skill.instructions.trim() : truncate(skill.instructions, 700)}`
                : '',
              skill.outputTemplate
                ? `  Output template: ${isPrimarySkill ? skill.outputTemplate.trim() : truncate(skill.outputTemplate, 360)}`
                : '',
              skill.variables?.length
                ? `  Variables: ${skill.variables
                    .slice(0, isPrimarySkill ? 8 : 4)
                    .map((variable) =>
                      variable?.name
                        ? `${variable.name}${variable.required ? ' (required)' : ''}${variable.description ? `: ${truncate(variable.description, 120)}` : ''}`
                        : ''
                    )
                    .filter(Boolean)
                    .join(' | ')}`
                : '',
              skill.checklist?.length
                ? `  Checklist: ${skill.checklist.slice(0, isPrimarySkill ? 8 : 4).join(' | ')}`
                : '',
              skill.workflowSteps?.length
                ? `  Workflow: ${skill.workflowSteps
                    .slice(0, isPrimarySkill ? 5 : 3)
                    .map((step) => {
                      const label = step.name || step.action || `Step ${step.step || '?'}`
                      return isPrimarySkill && step.verify
                        ? `${label} (verify: ${truncate(step.verify, 140)})`
                        : label
                    })
                    .join(' -> ')}`
                : '',
              skill.examples?.length
                ? `  Examples: ${skill.examples
                    .slice(0, isPrimarySkill ? 2 : 1)
                    .map((example) => example.title || truncate(example.output || example.prompt || '', 160))
                    .filter(Boolean)
                    .join(' | ')}`
                : '',
            ]
              .filter(Boolean)
              .join('\n')
          })
          .join('\n\n')
      : 'No explicit skills assigned.'
  )

  if (tools.length) {
    parts.push(`Available tools:\n- ${tools.join('\n- ')}`)
  }

  return parts.join('\n\n')
}

function isProviderAvailable(provider: AIProvider | undefined, input: { geminiApiKey?: string; ollamaBaseUrl?: string }) {
  if (provider === 'gemini') return Boolean(input.geminiApiKey)
  if (provider === 'ollama') return Boolean(input.ollamaBaseUrl || 'http://localhost:11434')
  return false
}

function resolveAgentRuntime(agent: RuntimeAgent, fallback: { provider: AIProvider; model: string; geminiApiKey?: string; ollamaBaseUrl?: string; ollamaContextWindow?: number }) {
  const provider = agent.provider && isProviderAvailable(agent.provider, fallback) ? agent.provider : fallback.provider
  const model = agent.model && provider === agent.provider ? agent.model : fallback.model
  return { provider, model }
}

function getAgentForRole(agents: RuntimeAgent[], role: string | undefined, fallbackAgentId?: string) {
  return pickAgentForRole(agents, role, fallbackAgentId)
}

function summarizeOutputs(outputRegister: Record<string, string>) {
  const entries = Object.entries(outputRegister)
  if (!entries.length) return 'No prior outputs.'
  return entries
    .map(([key, value]) => `### ${key}\n${truncate(value, 320)}`)
    .join('\n\n')
}

function buildFallbackDeliverable(input: {
  request: string
  deliverableType: DeliverableType
  leadAgentName: string
  pipeline: PipelineLike | null
  pipelineOutputs: Record<string, string>
  executionSteps: ArtifactExecutionStep[]
}) {
  const outputEntries = Object.entries(input.pipelineOutputs)
  const sections = outputEntries.length
    ? outputEntries
        .map(([key, value]) => `## ${key.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}\n\n${truncate(value, 1800)}`)
        .join('\n\n')
    : input.executionSteps
        .filter((step) => step.role !== 'quality')
        .map((step) => `## ${step.title}\n\n${truncate(step.summary, 1800)}`)
        .join('\n\n')

  return [
    `# ${input.pipeline?.name || 'Task Output'} Draft`,
    '## Status',
    `Draft assembled by ${input.leadAgentName} because the final model pass returned no visible output.`,
    '## Request',
    input.request,
    '## Deliverable Type',
    input.deliverableType,
    sections || '## Output\n\nNo output available.',
  ].join('\n\n')
}

function isInvalidFinalDeliverable(response: string) {
  const lower = response.toLowerCase()

  return (
    !response.trim() ||
    lower.includes('task routed to') ||
    lower.includes('lead agent') ||
    lower.includes('status: in progress') ||
    lower.includes('delivery:') ||
    lower.includes('next steps:') ||
    lower.includes('i have not drafted the deliverable yet')
  )
}

function buildActivityPrompt(input: {
  agent: RuntimeAgent
  request: string
  clientContext: string
  clientProfile: ClientProfileMap
  pipeline: PipelineLike
  phase: PipelinePhase
  activity: PipelineActivity
  previousOutputs: Record<string, string>
  qualityChecklist: string[]
  skillContext: string
}) {
  const pipelinePrompt = interpolateTemplate(
    input.activity.prompts?.en || input.activity.description || `Complete the activity "${input.activity.name}".`,
    input.clientProfile
  )

  return [
    input.agent.systemPrompt || `You are ${input.agent.name}, ${input.agent.role}.`,
    `You are autonomously executing a pipeline activity for Mission Control.`,
    `Pipeline: ${input.pipeline.name}`,
    `Phase: ${input.phase.name}`,
    `Activity: ${input.activity.name}`,
    input.activity.description ? `Activity goal: ${input.activity.description}` : '',
    `Original task request: ${truncate(input.request, 280)}`,
    input.clientContext ? `Client context:\n${truncate(input.clientContext, 700)}` : '',
    `Assigned skills and tools:\n${input.skillContext}`,
    Object.keys(input.previousOutputs).length
      ? `Previous pipeline outputs available for handoff:\n${summarizeOutputs(input.previousOutputs)}`
      : 'This is an early activity. No prior phase outputs yet.',
    input.activity.checklist?.length
      ? `Activity checklist:\n- ${input.activity.checklist.join('\n- ')}`
      : '',
    `Global quality checkpoints:\n- ${input.qualityChecklist.join('\n- ')}`,
    `Base pipeline prompt:\n${pipelinePrompt}`,
    'Execute the activity now without asking the user for approval.',
    getActivityOutputShapeInstruction(input.activity),
    activityWantsJson(input.activity)
      ? 'Return strictly valid JSON only. No markdown fences, no prose before or after the JSON, no comments, and no trailing commas.'
      : 'Return one concise but useful specialist output that can be handed to the next agent.',
    activityWantsJson(input.activity)
      ? 'Make the JSON complete and machine-parseable. Do not shorten, summarize, or omit closing brackets.'
      : '',
    'Do not return project-management boilerplate.',
    'Do not claim anything was exported or delivered.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function renumberIdeaIds(ideas: any[]) {
  return ideas.map((idea, index) => ({
    ...idea,
    id: `idea_${String(index + 1).padStart(2, '0')}`,
  }))
}

function getGenerateIdeasBatchBudget(stageTokenBudget: number, requestedCount: number) {
  if (requestedCount === 1) return Math.min(stageTokenBudget, 2000)
  return Math.min(stageTokenBudget, 8192)
}

function buildJsonRepairPrompt(input: {
  activity: PipelineActivity
  basePrompt: string
  failedResponse: string
  parseError: string
  requestedCount?: number
}) {
  return [
    input.basePrompt,
    'Your previous response was not valid JSON.',
    `Validation issue: ${input.parseError}`,
    `Failed response snippet: ${truncate(input.failedResponse, 800)}`,
    '',
    'Rewrite the full answer as valid JSON only.',
    'No markdown fences. No explanation. Just the JSON.',
    input.requestedCount
      ? `Keep the output compact and return exactly ${input.requestedCount} complete item${input.requestedCount === 1 ? '' : 's'}.`
      : 'Keep the output compact and ensure the JSON is complete.',
  ].join('\n\n')
}

async function generateContentIdeasInBatches(input: {
  agent: RuntimeAgent
  request: string
  clientContext: string
  clientProfile: ClientProfileMap
  pipeline: PipelineLike
  phase: PipelinePhase
  activity: PipelineActivity
  previousOutputs: Record<string, string>
  qualityChecklist: string[]
  skillContext: string
  runtime: { provider: AIProvider; model: string }
  ollamaBaseUrl?: string
  ollamaContextWindow?: number
  geminiApiKey?: string
  maxTokens: number
  generateTextFn?: GenerateTextFn
}) {
  const generateTextFn = input.generateTextFn || generateText
  const configuredBatchSize = Math.max(1, input.activity.batching?.batchSize || 1)
  const stageTokenBudget = getActivityTokenBudget(input.activity, input.maxTokens)
  const pillarPlan = [
    { pillar: 'Educational', count: 8 },
    { pillar: 'Storytelling', count: 6 },
    { pillar: 'Engagement', count: 6 },
    { pillar: 'Authority', count: 5 },
    { pillar: 'Promotional', count: 5 },
  ]
  const allIdeas: any[] = []

  for (let segmentIndex = 0; segmentIndex < pillarPlan.length; segmentIndex += 1) {
    const segment = pillarPlan[segmentIndex]
    const batchCount = Math.ceil(segment.count / configuredBatchSize)
    const completedIdeasBeforeSegment = pillarPlan
      .slice(0, segmentIndex)
      .reduce((sum, entry) => sum + entry.count, 0)

    for (let batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
      const requestedCount = Math.min(configuredBatchSize, segment.count - batchIndex * configuredBatchSize)
      let lastResponse = ''
      let lastError = ''

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const basePrompt = buildActivityPrompt({
          agent: input.agent,
          request: input.request,
          clientContext: input.clientContext,
          clientProfile: input.clientProfile,
          pipeline: input.pipeline,
          phase: input.phase,
          activity: input.activity,
          previousOutputs: input.previousOutputs,
          qualityChecklist: input.qualityChecklist,
          skillContext: input.skillContext,
        })

        const requiredShape =
          requestedCount === 1
            ? '{"idea":{"id":"idea_xx","title":"...","pillar":"...","description":"...","platform":"...","format":"...","difficulty":"low|medium|high"}}'
            : '{"ideas":[{"id":"idea_xx","title":"...","pillar":"...","description":"...","platform":"...","format":"...","difficulty":"low|medium|high"}]}'

        const response = await generateTextFn({
          provider: input.runtime.provider,
          model: input.runtime.model,
          temperature: 0.15,
          maxTokens: getGenerateIdeasBatchBudget(stageTokenBudget, requestedCount),
          messages: [
            {
              role: 'system',
              content: [
                basePrompt,
                `Generate only the ${segment.pillar} pillar for this batch.`,
                `Batch ${batchIndex + 1} of ${batchCount}.`,
                `Return exactly ${requestedCount} idea${requestedCount === 1 ? '' : 's'} as valid JSON only.`,
                'Use compact descriptions under 160 characters.',
                'Required shape:',
                requiredShape,
                `Every idea in this batch must use pillar "${segment.pillar}".`,
                attempt > 0 ? `Previous batch output failed validation: ${lastError}` : '',
              ]
                .filter(Boolean)
                .join('\n\n'),
            },
          ],
          ollamaBaseUrl: input.ollamaBaseUrl,
          ollamaContextWindow: input.ollamaContextWindow,
          geminiApiKey: input.geminiApiKey,
        })

        lastResponse = response
        const normalized = validateAndRepairJson(response, input.activity)
        if (!normalized.ok) {
          lastError = normalized.error || 'Invalid JSON.'
          if (attempt < 3) {
            const repairResponse = await generateTextFn({
              provider: input.runtime.provider,
              model: input.runtime.model,
              temperature: 0.05,
              maxTokens: getGenerateIdeasBatchBudget(stageTokenBudget, requestedCount),
              messages: [
                {
                  role: 'system',
                  content: buildJsonRepairPrompt({
                    activity: input.activity,
                    basePrompt,
                    failedResponse: response,
                    parseError: lastError,
                    requestedCount,
                  }),
                },
              ],
              ollamaBaseUrl: input.ollamaBaseUrl,
              ollamaContextWindow: input.ollamaContextWindow,
              geminiApiKey: input.geminiApiKey,
            })
            lastResponse = repairResponse
            const repaired = validateAndRepairJson(repairResponse, input.activity)
            if (repaired.ok) {
              const repairedParsed = JSON.parse(repaired.content)
              const repairedIdeas = Array.isArray(repairedParsed)
                ? repairedParsed
                : Array.isArray(repairedParsed?.ideas)
                  ? repairedParsed.ideas
                  : repairedParsed?.idea
                    ? [repairedParsed.idea]
                    : []
              if (repairedIdeas.length === requestedCount) {
                allIdeas.push(...repairedIdeas.map((idea: any) => ({ ...idea, pillar: segment.pillar })))
                lastError = ''
                break
              }
              lastError = `Expected ${requestedCount} ideas after repair for ${segment.pillar} batch ${batchIndex + 1}, received ${repairedIdeas.length}.`
            }
          }
          continue
        }

        const parsed = JSON.parse(normalized.content)
        const ideas = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.ideas)
            ? parsed.ideas
            : parsed?.idea
              ? [parsed.idea]
              : []

        if (ideas.length !== requestedCount) {
          lastError = `Expected ${requestedCount} ideas for ${segment.pillar} batch ${batchIndex + 1}, received ${ideas.length}.`
          continue
        }

        allIdeas.push(...ideas.map((idea: any) => ({ ...idea, pillar: segment.pillar })))
        break
      }

      const expectedCountSoFar =
        completedIdeasBeforeSegment + Math.min(segment.count, (batchIndex + 1) * configuredBatchSize)

      if (allIdeas.length < expectedCountSoFar) {
        throw new Error(
          `Content Calendar JSON failure | phase=${input.phase.id}:${input.phase.name} | activity=${input.activity.id}:${input.activity.name} | agent=${input.agent.id}:${input.agent.name} | expected=${getStructuredShape(input.activity)} | pillar=${segment.pillar} | batch=${batchIndex + 1}/${batchCount} | requested=${requestedCount} | tokenCap=${getGenerateIdeasBatchBudget(stageTokenBudget, requestedCount)} | responseLength=${lastResponse.length} | reason=${lastError || 'Unknown validation error'} | snippet=${truncate(lastResponse, 220)}`
        )
      }
    }
  }

  return JSON.stringify({ ideas: renumberIdeaIds(allIdeas) }, null, 2)
}

async function generateActivityOutput(input: {
  agent: RuntimeAgent
  request: string
  clientContext: string
  clientProfile: ClientProfileMap
  pipeline: PipelineLike
  phase: PipelinePhase
  activity: PipelineActivity
  previousOutputs: Record<string, string>
  qualityChecklist: string[]
  skillContext: string
  runtime: { provider: AIProvider; model: string }
  ollamaBaseUrl?: string
  ollamaContextWindow?: number
  geminiApiKey?: string
  maxTokens: number
  generateTextFn?: GenerateTextFn
}) {
  if (input.activity.id === 'generate-ideas') {
    return generateContentIdeasInBatches(input)
  }

  const structured = activityWantsJson(input.activity)
  const budget = getActivityTokenBudget(input.activity, input.maxTokens)
  let lastResponse = ''
  let lastError = ''

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prompt = buildActivityPrompt({
      agent: input.agent,
      request: input.request,
      clientContext: input.clientContext,
      clientProfile: input.clientProfile,
      pipeline: input.pipeline,
      phase: input.phase,
      activity: input.activity,
      previousOutputs: input.previousOutputs,
      qualityChecklist: input.qualityChecklist,
      skillContext: input.skillContext,
    })

    const repairSuffix =
      structured && attempt > 0
        ? `\n\nPrevious output was invalid JSON.\nValidation issue: ${lastError || 'Unknown JSON parse error.'}\nReturn the full corrected JSON only.`
        : ''

    const response = await (input.generateTextFn || generateText)({
      provider: input.runtime.provider,
      model: input.runtime.model,
      temperature: structured ? 0.2 : 0.45,
      maxTokens: budget,
      messages: [{ role: 'system', content: `${prompt}${repairSuffix}` }],
      ollamaBaseUrl: input.ollamaBaseUrl,
      ollamaContextWindow: input.ollamaContextWindow,
      geminiApiKey: input.geminiApiKey,
    })

    lastResponse = response
    const normalized = validateAndRepairJson(response, input.activity)
    if (normalized.ok) return normalized.content
    lastError = normalized.error || 'Invalid structured output.'

    if (structured) {
      const repairResponse = await (input.generateTextFn || generateText)({
        provider: input.runtime.provider,
        model: input.runtime.model,
        temperature: 0.05,
        maxTokens: budget,
        messages: [
          {
            role: 'system',
            content: buildJsonRepairPrompt({
              activity: input.activity,
              basePrompt: prompt,
              failedResponse: response,
              parseError: lastError,
            }),
          },
        ],
        ollamaBaseUrl: input.ollamaBaseUrl,
        ollamaContextWindow: input.ollamaContextWindow,
        geminiApiKey: input.geminiApiKey,
      })

      lastResponse = repairResponse
      const repaired = validateAndRepairJson(repairResponse, input.activity)
      if (repaired.ok) return repaired.content
      lastError = repaired.error || lastError
    }
  }

  throw new Error(
    `Structured stage failure | phase=${input.phase.id}:${input.phase.name} | activity=${input.activity.id}:${input.activity.name} | agent=${input.agent.id}:${input.agent.name} | expected=${getStructuredShape(input.activity)} | tokenCap=${budget} | responseLength=${lastResponse.length} | reason=${lastError || 'Invalid JSON after retries'} | snippet=${truncate(lastResponse, 220)}`
  )
}

function buildSupportPrompt(input: {
  agent: RuntimeAgent
  request: string
  clientContext: string
  deliverableType: DeliverableType
  pipeline: PipelineLike | null
  qualityChecklist: string[]
  skillContext: string
}) {
  return [
    input.agent.systemPrompt || `You are ${input.agent.name}, ${input.agent.role}.`,
    `Your assigned role in this task: supporting specialist.`,
    `User request: ${truncate(input.request, 280)}`,
    `Deliverable type: ${input.deliverableType}`,
    input.clientContext ? `Client context:\n${truncate(input.clientContext, 700)}` : '',
    input.pipeline
      ? `Relevant pipeline: ${input.pipeline.name}\nPhases:\n${(input.pipeline.phases || []).slice(0, 5).map((phase) => `- ${phase.name}`).join('\n')}`
      : '',
    `Assigned skills and tools:\n${input.skillContext}`,
    `Quality checkpoints:\n- ${input.qualityChecklist.join('\n- ')}`,
    'Return a concise specialist handoff with these sections only:',
    '## Specialist Angle',
    '## Recommendations',
    '## Quality Risks',
    '## Inputs for Lead Agent',
    'Be concrete and useful. Do not produce the final deliverable.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildLeadPrompt(input: {
  agent: RuntimeAgent
  request: string
  clientContext: string
  deliverableType: DeliverableType
  executionPrompt: string
  pipeline: PipelineLike | null
  qualityChecklist: string[]
  skillContext: string
  supportHandoffs: ArtifactExecutionStep[]
  pipelineOutputs: Record<string, string>
}) {
  return [
    input.agent.systemPrompt || `You are ${input.agent.name}, ${input.agent.role}.`,
    `You are the lead agent responsible for producing the final deliverable.`,
    `Assigned skills and tools:\n${input.skillContext}`,
    input.clientContext ? `Client context:\n${truncate(input.clientContext, 700)}` : '',
    input.pipeline
      ? `Pipeline in use: ${input.pipeline.name}\nPhase sequence:\n${(input.pipeline.phases || []).slice(0, 5).map((phase) => `- ${phase.name}`).join('\n')}`
      : '',
    `Quality checklist:\n- ${input.qualityChecklist.join('\n- ')}`,
    Object.keys(input.pipelineOutputs).length
      ? `Pipeline activity outputs:\n${summarizeOutputs(input.pipelineOutputs)}`
      : '',
    input.supportHandoffs.length
      ? `Supporting agent handoffs:\n${input.supportHandoffs.map((step) => `### ${step.agentName}\n${truncate(step.summary, 320)}`).join('\n\n')}`
      : 'Supporting agent handoffs: none',
    `Final deliverable instructions:\n${truncate(input.executionPrompt, 1800)}`,
    'Use the supporting handoffs and pipeline outputs, but produce one clean final deliverable.',
    'Do not mention routing, internal workflow, or task management language.',
    'Do not say what you will do later. Deliver the output now.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function runPipelineExecution(input: {
  request: string
  provider: AIProvider
  model: string
  ollamaBaseUrl?: string
  ollamaContextWindow?: number
  geminiApiKey?: string
  clientContext: string
  clientProfile: ClientProfileMap
  agents: RuntimeAgent[]
  pipeline: PipelineLike
  qualityChecklist: string[]
  skillLookup: Map<string, SkillRef>
  selectedSkillsByAgent?: Record<string, string[]>
  maxTokens: number
  hooks?: ExecutionHooks
}) {
  const executionSteps: ArtifactExecutionStep[] = []
  const outputRegister: Record<string, string> = {}
  const phases = input.pipeline.phases || []
  const totalActivities = phases.reduce((sum, phase) => sum + (phase.activities?.length || 0), 0) || 1
  let completedActivities = 0

  for (const phase of phases) {
    await input.hooks?.onPhaseStart?.({
      phase,
      progress: Math.max(5, Math.round((completedActivities / totalActivities) * 75)),
    })
    for (const activity of phase.activities || []) {
      const assignedAgent = getAgentForRole(input.agents, activity.assignedRole) || input.agents.find((agent) => agent.id === 'iris')
      if (!assignedAgent) continue

      const selectedSkills = input.selectedSkillsByAgent?.[assignedAgent.id] || assignedAgent.skills || []
      const skillContext = agentSkillsContextFromIds(assignedAgent, input.skillLookup, selectedSkills)
      const runtime = resolveAgentRuntime(assignedAgent, input)
      let summary = ''
      try {
        summary = await generateActivityOutput({
          agent: assignedAgent,
          request: input.request,
          clientContext: input.clientContext,
          clientProfile: input.clientProfile,
          pipeline: input.pipeline,
          phase,
          activity,
          previousOutputs: outputRegister,
          qualityChecklist: input.qualityChecklist,
          skillContext,
          runtime,
          ollamaBaseUrl: input.ollamaBaseUrl,
          ollamaContextWindow: input.ollamaContextWindow,
          geminiApiKey: input.geminiApiKey,
          maxTokens: input.maxTokens,
        })
      } catch (error) {
        const progress = Math.max(5, Math.round((completedActivities / totalActivities) * 85))
        const message = error instanceof Error ? error.message : 'Activity execution failed.'
        await input.hooks?.onActivityFailure?.({
          phase,
          activity,
          agent: assignedAgent,
          runtime,
          progress,
          error: message,
          outputPayload: {
            expected: getStructuredShape(activity),
            tokenCap: getActivityTokenBudget(activity, input.maxTokens),
            outputFormat: activity.outputFormat || null,
            totalItems: extractItemCount(activity),
            batchSize: activity.batching?.batchSize || null,
          },
        })
        throw error
      }

      for (const outputId of activity.outputs || []) {
        outputRegister[outputId] = summary
      }
      completedActivities += 1
      const progress = Math.max(5, Math.round((completedActivities / totalActivities) * 85))
      await input.hooks?.onActivityComplete?.({
        phase,
        activity,
        agent: assignedAgent,
        runtime,
        summary,
        outputIds: activity.outputs || [],
        progress,
      })

      executionSteps.push({
        id: `${activity.id}-${Date.now()}-${executionSteps.length}`,
        agentId: assignedAgent.id,
        agentName: assignedAgent.name,
        role: assignedAgent.id === 'iris' ? 'quality' : 'support',
        title: `${phase.name} · ${activity.name}`,
        summary: truncate(summary, 1600),
        status: 'completed',
        phaseId: phase.id,
        phaseName: phase.name,
        activityId: activity.id,
        outputIds: activity.outputs || [],
        provider: runtime.provider,
        model: runtime.model,
        skillsUsed: selectedSkills.slice(0, 5),
      })
    }
  }

  return { executionSteps, outputRegister }
}

export async function executeAutonomousTask(input: {
  request: string
  provider: AIProvider
  model: string
  temperature: number
  maxTokens: number
  ollamaBaseUrl?: string
  ollamaContextWindow?: number
  geminiApiKey?: string
  deliverableType: DeliverableType
  executionPrompt: string
  clientContext: string
  clientProfile?: ClientProfileMap
  agents: RuntimeAgent[]
  leadAgentId: string
  collaboratorAgentIds: string[]
  selectedSkillsByAgent?: Record<string, string[]>
  qualityChecklist: string[]
  pipeline: PipelineLike | null
  skillCategories: any[]
  hooks?: ExecutionHooks
}) {
  const skillLookup = buildSkillLookup(input.skillCategories)
  const agentMap = new Map(input.agents.map((agent) => [agent.id, agent]))
  const executionSteps: ArtifactExecutionStep[] = []
  const pipelineOutputs: Record<string, string> = {}
  const clientProfile = buildClientProfileMap(input.clientContext, input.clientProfile)

  if (input.pipeline?.phases?.length) {
    const pipelineRun = await runPipelineExecution({
      request: input.request,
      provider: input.provider,
      model: input.model,
      ollamaBaseUrl: input.ollamaBaseUrl,
      ollamaContextWindow: input.ollamaContextWindow,
      geminiApiKey: input.geminiApiKey,
      clientContext: input.clientContext,
      clientProfile,
      agents: input.agents,
      pipeline: input.pipeline,
      qualityChecklist: input.qualityChecklist,
      skillLookup,
      selectedSkillsByAgent: input.selectedSkillsByAgent,
      maxTokens: input.maxTokens,
      hooks: input.hooks,
    })
    executionSteps.push(...pipelineRun.executionSteps)
    Object.assign(pipelineOutputs, pipelineRun.outputRegister)
  } else {
    for (const collaboratorId of input.collaboratorAgentIds) {
      const agent = agentMap.get(collaboratorId)
      if (!agent) continue

      const selectedSkills = input.selectedSkillsByAgent?.[agent.id] || agent.skills || []
      const skillContext = agentSkillsContextFromIds(agent, skillLookup, selectedSkills)
      const runtime = resolveAgentRuntime(agent, input)
      const summary = await generateText({
        provider: runtime.provider,
        model: runtime.model,
        temperature: 0.45,
        maxTokens: Math.min(input.maxTokens, 900),
        messages: [
          {
            role: 'system',
            content: buildSupportPrompt({
              agent,
              request: input.request,
              clientContext: input.clientContext,
              deliverableType: input.deliverableType,
              pipeline: input.pipeline,
              qualityChecklist: input.qualityChecklist,
              skillContext,
            }),
          },
        ],
        ollamaBaseUrl: input.ollamaBaseUrl,
        ollamaContextWindow: input.ollamaContextWindow,
        geminiApiKey: input.geminiApiKey,
      })

      executionSteps.push({
        id: `${collaboratorId}-${Date.now()}-${executionSteps.length}`,
        agentId: collaboratorId,
        agentName: agent.name,
        role: 'support',
        title: `${agent.name} handoff`,
        summary: truncate(summary, 1600),
        skillsUsed: selectedSkills.slice(0, 5),
      })
    }
  }

  const leadAgent = agentMap.get(input.leadAgentId) || agentMap.get('iris') || {
    id: 'iris',
    name: 'Iris',
    role: 'Operations Lead',
  }
  const leadSelectedSkills = input.selectedSkillsByAgent?.[leadAgent.id] || leadAgent.skills || []
  const leadSkillContext = agentSkillsContextFromIds(leadAgent, skillLookup, leadSelectedSkills)
  const leadRuntime = resolveAgentRuntime(leadAgent, input)

  let response = await generateText({
    provider: leadRuntime.provider,
    model: leadRuntime.model,
    temperature: input.temperature,
    maxTokens: Math.min(input.maxTokens, 2200),
    messages: [
      {
        role: 'system',
        content: buildLeadPrompt({
          agent: leadAgent,
          request: input.request,
          clientContext: input.clientContext,
          deliverableType: input.deliverableType,
          executionPrompt: input.executionPrompt,
          pipeline: input.pipeline,
          qualityChecklist: input.qualityChecklist,
          skillContext: leadSkillContext,
          supportHandoffs: executionSteps,
          pipelineOutputs,
        }),
      },
    ],
    ollamaBaseUrl: input.ollamaBaseUrl,
    ollamaContextWindow: input.ollamaContextWindow,
    geminiApiKey: input.geminiApiKey,
  })

  if (isInvalidFinalDeliverable(response)) {
    response = await generateText({
      provider: leadRuntime.provider,
      model: leadRuntime.model,
      temperature: Math.min(input.temperature, 0.45),
      maxTokens: Math.min(input.maxTokens, 2200),
      messages: [
        {
          role: 'system',
          content: [
            buildLeadPrompt({
              agent: leadAgent,
              request: input.request,
              clientContext: input.clientContext,
              deliverableType: input.deliverableType,
              executionPrompt: input.executionPrompt,
              pipeline: input.pipeline,
              qualityChecklist: input.qualityChecklist,
              skillContext: leadSkillContext,
              supportHandoffs: executionSteps,
              pipelineOutputs,
            }),
            'Your previous answer was invalid because it used coordination or status language instead of the actual deliverable.',
            'Return only the final deliverable now.',
            'Do not mention routing, lead agent, status, delivery timing, or next steps.',
          ].join('\n\n'),
        },
      ],
      ollamaBaseUrl: input.ollamaBaseUrl,
      ollamaContextWindow: input.ollamaContextWindow,
      geminiApiKey: input.geminiApiKey,
    })
  }

  executionSteps.push({
    id: `${leadAgent.id}-${Date.now()}-lead`,
    agentId: leadAgent.id,
    agentName: leadAgent.name,
    role: 'lead',
    title: `${leadAgent.name} final assembly`,
    summary: 'Lead agent assembled the final deliverable from pipeline steps, skill-based handoffs, and client context.',
    status: 'completed',
    provider: leadRuntime.provider,
    model: leadRuntime.model,
    skillsUsed: leadSelectedSkills.slice(0, 5),
  })

  const qualityResult = validateDeliverableQuality(input.deliverableType, response, input.request)

  executionSteps.push({
    id: `quality-${Date.now()}`,
    agentId: 'iris',
    agentName: 'Iris',
    role: 'quality',
    title: 'Quality control pass',
    summary: qualityResult.ok
      ? `Quality gate passed (${qualityResult.score}/100). ${input.qualityChecklist.join(' | ')}`
      : `Quality gate flagged issues (${qualityResult.score}/100): ${qualityResult.issues.join(' | ')}`,
    status: qualityResult.ok ? 'completed' : 'warning',
    qualityIssues: qualityResult.issues,
  })

  if (isInvalidFinalDeliverable(response)) {
    response = buildFallbackDeliverable({
      request: input.request,
      deliverableType: input.deliverableType,
      leadAgentName: leadAgent.name,
      pipeline: input.pipeline,
      pipelineOutputs,
      executionSteps,
    })
  }

  return {
    response,
    executionSteps,
    qualityResult,
  }
}

export const __autonomousTaskTestables = {
  activityWantsJson,
  normalizeStructuredOutput,
  validateAndRepairJson,
  generateContentIdeasInBatches,
  extractItemCount,
  getActivityTokenBudget,
}
