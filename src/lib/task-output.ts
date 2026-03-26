import { DeliverableType } from '@/lib/types'

export function buildTaskTitleFromRequest(request: string, deliverableType: DeliverableType) {
  const trimmed = request.trim()
  if (!trimmed) return 'New Task'

  const cleaned = trimmed
    .replace(/^please\s+/i, '')
    .replace(/^i need\s+/i, '')
    .replace(/^create\s+/i, '')
    .replace(/^draft\s+/i, '')
    .replace(/^write\s+/i, '')
    .replace(/^build\s+/i, '')
    .replace(/^make\s+/i, '')
    .trim()

  const prefix = {
    'client-brief': 'Client Brief',
    'strategy-brief': 'Strategy Task',
    'campaign-strategy': 'Campaign Strategy',
    'content-calendar': 'Content Calendar',
    'campaign-copy': 'Content Task',
    'creative-asset': 'Creative Task',
    'media-plan': 'Media Plan',
    'budget-sheet': 'Budget Sheet',
    'kpi-forecast': 'KPI Forecast',
    'seo-audit': 'SEO Audit',
    'research-brief': 'Research Task',
    'status-report': 'Task',
  }[deliverableType]

  return cleaned.length > 72 ? `${prefix}: ${cleaned.slice(0, 69)}...` : `${prefix}: ${cleaned}`
}

export function getDeliverableOutputSpec(deliverableType: DeliverableType, request: string) {
  const lower = request.toLowerCase()
  const formatRules = [
    'Format the final output for direct rendering in the app.',
    'Use this exact structure style:',
    '- First line must be a single H1 in the form "# [Deliverable Title]".',
    '- Every major section must use "## Section Name".',
    '- Use bullets for concise lists and pipe tables when a schedule, plan, or calendar is more useful.',
    '- Do not wrap the answer in code fences.',
    '- Do not use internal notes, analysis labels, or project-management boilerplate.',
  ].join('\n')

  if (deliverableType === 'campaign-copy') {
    if (lower.includes('carousel') || lower.includes('instagram')) {
      return [
        formatRules,
        'Produce the final client-ready social deliverable, not a brief.',
        'Write with scientific clarity, strong hooks, and platform-native structure.',
        'Output sections in this exact order:',
        '## Objective',
        '## Audience',
        '## Core Message',
        '## Hook Options',
        '## Carousel Cover Headline',
        '## Slide-by-Slide Carousel Copy',
        '## Caption',
        '## CTA',
        '## Hashtag Suggestions',
        '## Design Direction Notes',
        'Make every slide concise and readable on mobile.',
      ].join('\n')
    }

    return [
      formatRules,
      'Produce the final copy deliverable, not a brief.',
      'Output sections in this exact order:',
      '## Objective',
      '## Audience',
      '## Key Message',
      '## Hook Options',
      '## Primary Copy',
      '## Supporting Variants',
      '## CTA',
    ].join('\n')
  }

  if (deliverableType === 'content-calendar') {
    return [
      formatRules,
      'Produce a complete content calendar, not a planning note.',
      'Use these sections in order:',
      '## Strategy Summary',
      '## Content Pillars',
      '## Calendar',
      '## Production Notes',
      'The Calendar section must be a pipe table with at least 10 content entries.',
      'Each row must include: Week/Date, Channel, Theme, Post Idea, Hook, CTA, Asset Type, Objective.',
      'Make the calendar realistic for the client industry and buying cycle.',
    ].join('\n')
  }

  if (deliverableType === 'media-plan' || deliverableType === 'budget-sheet' || deliverableType === 'kpi-forecast') {
    return [
      formatRules,
      'Produce the actual planning output, not a brief.',
      'Include sections in this order:',
      '## Objective',
      '## Audience and Targeting Logic',
      '## Channel Mix',
      '## Budget Allocation',
      '## Flighting / Schedule',
      '## KPI Framework',
      '## Risks and Watchouts',
      'Use at least one pipe table for spend, timing, or KPI planning.',
      'Use concrete numbers when useful, but keep them positioned as planning assumptions.',
    ].join('\n')
  }

  if (deliverableType === 'campaign-strategy' || deliverableType === 'strategy-brief') {
    return [
      formatRules,
      'Produce a strategist-grade output that can be reviewed directly by the client team.',
      'Include sections in this order:',
      '## Objective',
      '## Situation / Context',
      '## Audience Insight',
      '## Strategic Tension or Opportunity',
      '## Positioning / Message Direction',
      '## Recommendations',
      '## Immediate Next Moves',
    ].join('\n')
  }

  if (deliverableType === 'seo-audit' || deliverableType === 'research-brief') {
    return [
      formatRules,
      'Produce the actual audit or research output.',
      'Include sections: ## Executive Summary, ## Key Findings, ## Implications, ## Recommended Actions, ## Priority Order.',
      'Be specific and commercially useful.',
    ].join('\n')
  }

  if (deliverableType === 'creative-asset') {
    return [
      formatRules,
      'Produce a complete creative production pack, not a project status note.',
      'Include sections in this order:',
      '## Creative Objective',
      '## Audience',
      '## Concept Direction',
      '## Visual Composition',
      '## Copy Overlays',
      '## Image-Generation Prompt',
      '## Variations',
      '## Production Notes',
    ].join('\n')
  }

  return `${formatRules}\nProduce the actual draft deliverable itself, with clear sections and no routing boilerplate.`
}

export interface TaskExecutionPlan {
  leadAgentId: string
  collaboratorAgentIds: string[]
  assignedAgentIds: string[]
  qualityChecklist: string[]
  handoffNotes: string
}

function uniqueIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export function buildTaskExecutionPlan(input: {
  deliverableType: DeliverableType
  request: string
  routedAgentId?: string
  pipelinePhases?: string[]
}) : TaskExecutionPlan {
  const lower = input.request.toLowerCase()

  let leadAgentId = input.routedAgentId || 'iris'
  let collaboratorAgentIds: string[] = []

  switch (input.deliverableType) {
    case 'campaign-copy':
      leadAgentId = 'echo'
      collaboratorAgentIds = lower.includes('carousel') || lower.includes('instagram')
        ? ['maya', 'lyra']
        : ['maya']
      break
    case 'content-calendar':
      leadAgentId = 'echo'
      collaboratorAgentIds = ['maya', 'lyra']
      break
    case 'strategy-brief':
    case 'campaign-strategy':
      leadAgentId = 'maya'
      collaboratorAgentIds = ['sage', 'atlas']
      break
    case 'creative-asset':
      leadAgentId = 'lyra'
      collaboratorAgentIds = ['finn', 'echo']
      break
    case 'media-plan':
      leadAgentId = 'nova'
      collaboratorAgentIds = ['dex', 'maya']
      break
    case 'budget-sheet':
    case 'kpi-forecast':
      leadAgentId = 'dex'
      collaboratorAgentIds = ['nova']
      break
    case 'seo-audit':
    case 'research-brief':
      leadAgentId = 'atlas'
      collaboratorAgentIds = ['maya']
      break
    case 'client-brief':
      leadAgentId = 'sage'
      collaboratorAgentIds = ['maya', 'piper']
      break
    default:
      collaboratorAgentIds = []
      break
  }

  const qualityChecklist =
    input.pipelinePhases?.length
      ? input.pipelinePhases.map((phase, index) => `${index + 1}. ${phase}`)
      : getDefaultQualityChecklist(input.deliverableType, lower)

  const assignedAgentIds = uniqueIds(['iris', leadAgentId, ...collaboratorAgentIds])
  const handoffNotes = buildHandoffNotes({ deliverableType: input.deliverableType, leadAgentId, collaboratorAgentIds, request: input.request })

  return {
    leadAgentId,
    collaboratorAgentIds,
    assignedAgentIds,
    qualityChecklist,
    handoffNotes,
  }
}

function getDefaultQualityChecklist(deliverableType: DeliverableType, lowerRequest: string) {
  if (deliverableType === 'content-calendar') {
    return [
      '1. Validate client brief, audience, platforms, and posting goal',
      '2. Define content pillars and monthly narrative arc',
      '3. Generate content ideas mapped to funnel stages',
      '4. Write hooks and post angles',
      '5. Draft captions / post content',
      '6. Add visual direction and asset type per entry',
      '7. Review cadence, balance, and platform mix',
      '8. Final QA for brand fit, clarity, and conversion logic',
    ]
  }

  if (deliverableType === 'campaign-copy' && (lowerRequest.includes('carousel') || lowerRequest.includes('instagram'))) {
    return [
      '1. Confirm objective, audience, and client message hierarchy',
      '2. Build hook and cover-slide angle',
      '3. Draft slide-by-slide copy with scientific clarity',
      '4. Add caption, CTA, and hashtags',
      '5. Review tone, readability, and claim safety',
      '6. Add design direction for production handoff',
    ]
  }

  if (deliverableType === 'media-plan' || deliverableType === 'budget-sheet' || deliverableType === 'kpi-forecast') {
    return [
      '1. Confirm objective and budget assumptions',
      '2. Define audience and channel strategy',
      '3. Draft spend allocation and timing',
      '4. Add KPI framework and forecasting assumptions',
      '5. Review operational feasibility and pacing logic',
      '6. Prepare export-ready planning file',
    ]
  }

  if (deliverableType === 'strategy-brief' || deliverableType === 'campaign-strategy') {
    return [
      '1. Confirm business objective and category context',
      '2. Extract audience and market insight',
      '3. Define positioning or campaign angle',
      '4. Draft strategic recommendation',
      '5. Review for clarity, differentiation, and client readiness',
    ]
  }

  return [
    '1. Confirm brief and business context',
    '2. Draft the core deliverable',
    '3. Review quality, clarity, and client fit',
    '4. Prepare output for export or delivery',
  ]
}

function buildHandoffNotes(input: {
  deliverableType: DeliverableType
  leadAgentId: string
  collaboratorAgentIds: string[]
  request: string
}) {
  const collaboratorText = input.collaboratorAgentIds.length
    ? `Supporting agents align on message, quality, and specialist checks before output is marked ready: ${input.collaboratorAgentIds.join(', ')}.`
    : 'No supporting specialists are required for this task.'

  return [
    `Lead agent owns the draft and final assembly: ${input.leadAgentId}.`,
    collaboratorText,
    `Original request focus: ${input.request}`,
  ].join(' ')
}
