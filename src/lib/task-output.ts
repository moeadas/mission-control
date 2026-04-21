import { DeliverableType } from '@/lib/types'
import { getDeliverableSpec } from '@/lib/deliverables'
import { resolveTaskRoutingBlueprint } from '@/lib/server/task-channeling'

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

  const prefix = getDeliverableSpec(deliverableType).label || 'Task'

  return cleaned.length > 72 ? `${prefix}: ${cleaned.slice(0, 69)}...` : `${prefix}: ${cleaned}`
}

export function getDeliverableOutputSpec(deliverableType: DeliverableType, request: string) {
  const lower = request.toLowerCase()
  const isSimpleSocialPost =
    /(instagram post|linkedin post|social post|single post|caption)/.test(lower) &&
    !/(carousel|slide by slide|slide-by-slide|content calendar|campaign strategy|media plan|audit|brief|visual direction|design)/.test(lower)
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
    if (lower.includes('carousel') || lower.includes('slide by slide') || lower.includes('slide-by-slide')) {
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

    if (isSimpleSocialPost) {
      return [
        formatRules,
        'Produce a short ready-to-publish social post, not a strategy brief.',
        'Keep it tight, platform-native, and client-ready.',
        'Output sections in this exact order:',
        '## Objective',
        '## Post Copy',
        '## CTA',
        '## Hashtags',
        'Do not include audience analysis, hook option lists, supporting variants, or design-direction sections unless the user explicitly asked for them.',
        'Keep the main post copy concise enough for a single post, not a carousel.',
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

  if (deliverableType === 'short-form-copy') {
    return [
      formatRules,
      'Produce concise client-ready business copy for a short profile or description surface.',
      'Output sections in this exact order:',
      '## Objective',
      '## Primary Option',
      '## Alternate Options',
      '## Character Check',
      'Keep the primary option tight, distinctive, and usable without further editing.',
    ].join('\n')
  }

  if (deliverableType === 'email-campaign') {
    return [
      formatRules,
      'Produce the email deliverable itself, not a planning note.',
      'Output sections in this exact order:',
      '## Objective',
      '## Audience',
      '## Email Structure',
      '## Subject Line Options',
      '## Body Copy',
      '## CTA',
      '## Follow-Up Notes',
      'If the request implies a sequence, number the emails clearly.',
    ].join('\n')
  }

  if (deliverableType === 'website-copy') {
    return [
      formatRules,
      'Produce website-ready copy organised by page section.',
      'Output sections in this exact order:',
      '## Objective',
      '## Audience',
      '## Hero',
      '## Value Proposition',
      '## Supporting Sections',
      '## CTA',
      'Keep the copy conversion-focused and scan-friendly.',
    ].join('\n')
  }

  if (deliverableType === 'blog-article') {
    return [
      formatRules,
      'Produce the actual article draft, not a blog plan.',
      'Output sections in this exact order:',
      '## Objective',
      '## Working Title',
      '## Meta Description',
      '## Article Draft',
      '## CTA',
    ].join('\n')
  }

  if (deliverableType === 'video-script') {
    return [
      formatRules,
      'Produce a script that can be handed directly into production.',
      'Output sections in this exact order:',
      '## Objective',
      '## Format',
      '## Hook',
      '## Script',
      '## On-Screen Text',
      '## Production Notes',
    ].join('\n')
  }

  if (deliverableType === 'presentation') {
    return [
      formatRules,
      'Produce a slide-by-slide deck outline ready for presentation drafting.',
      'Output sections in this exact order:',
      '## Objective',
      '## Audience',
      '## Narrative Arc',
      '## Slide Outline',
      '## Speaker Notes',
      '## Visual Direction',
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

  if (deliverableType === 'brand-guidelines') {
    return [
      formatRules,
      'Produce a usable brand guide, not a high-level note.',
      'Include sections in this order:',
      '## Brand Core',
      '## Visual System',
      '## Tone of Voice',
      '## Do / Do Not',
      '## Application Notes',
    ].join('\n')
  }

  if (deliverableType === 'seo-audit' || deliverableType === 'research-brief' || deliverableType === 'data-analysis') {
    return [
      formatRules,
      'Produce the actual audit or research output.',
      'Include sections: ## Executive Summary, ## Key Findings, ## Implications, ## Recommended Actions, ## Priority Order.',
      'Be specific and commercially useful.',
    ].join('\n')
  }

  if (deliverableType === 'ui-audit') {
    return [
      formatRules,
      'Produce a browser-backed UI audit, not a vague critique.',
      'Include sections in this order:',
      '## Executive Summary',
      '## Scope',
      '## Key UX Findings',
      '## Accessibility Findings',
      '## Messaging / Conversion Findings',
      '## Priority Fixes',
      '## Evidence Needed',
      'Rank findings by severity and keep recommendations concrete.',
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

  if (deliverableType === 'pr-comms' || deliverableType === 'client-brief') {
    return [
      formatRules,
      'Produce a communications-ready draft that can be reviewed directly with minimal cleanup.',
      'Include sections in this order:',
      '## Objective',
      '## Audience',
      '## Core Narrative',
      '## Draft',
      '## Delivery Notes',
    ].join('\n')
  }

  if (deliverableType === 'event-plan') {
    return [
      formatRules,
      'Produce the event plan itself, not a generic overview.',
      'Include sections in this order:',
      '## Objective',
      '## Audience',
      '## Event Concept',
      '## Run of Show',
      '## Promotion Plan',
      '## Logistics',
      '## Risks and Watchouts',
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
  const { leadAgentId, collaboratorAgentIds } = resolveTaskRoutingBlueprint({
    request: input.request,
    deliverableType: input.deliverableType,
    routedAgentId: input.routedAgentId,
    agents: [],
  })

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

  if (deliverableType === 'campaign-copy' && (lowerRequest.includes('carousel') || lowerRequest.includes('slide by slide') || lowerRequest.includes('slide-by-slide'))) {
    return [
      '1. Confirm objective, audience, and client message hierarchy',
      '2. Build hook and cover-slide angle',
      '3. Draft slide-by-slide copy with scientific clarity',
      '4. Add caption, CTA, and hashtags',
      '5. Review tone, readability, and claim safety',
      '6. Add design direction for production handoff',
    ]
  }

  if (deliverableType === 'campaign-copy' && /(instagram post|linkedin post|social post|single post|caption)/.test(lowerRequest)) {
    return [
      '1. Confirm the post objective and target tone',
      '2. Draft one concise platform-native post',
      '3. Add a clear CTA and relevant hashtags',
      '4. Review for brevity, readability, and brand fit',
    ]
  }

  if (deliverableType === 'short-form-copy') {
    return [
      '1. Confirm the audience, surface, and character limit',
      '2. Draft a concise primary line with sharp brand fit',
      '3. Generate 2-3 alternates with slightly different tone angles',
      '4. Review for brevity, memorability, and character compliance',
    ]
  }

  if (deliverableType === 'email-campaign') {
    return [
      '1. Confirm objective, audience, and send context',
      '2. Draft the email structure and message hierarchy',
      '3. Write subject lines, body copy, and CTA',
      '4. Review for scannability, clarity, and conversion logic',
    ]
  }

  if (deliverableType === 'website-copy' || deliverableType === 'blog-article' || deliverableType === 'video-script') {
    return [
      '1. Confirm the user journey and audience intent',
      '2. Draft the core narrative with the right structure for the format',
      '3. Add a strong hook, message hierarchy, and CTA',
      '4. Review for clarity, flow, and brand voice',
    ]
  }

  if (deliverableType === 'presentation' || deliverableType === 'client-brief') {
    return [
      '1. Confirm the stakeholder audience and meeting objective',
      '2. Build the narrative arc and strongest proof points',
      '3. Draft the slide or briefing structure',
      '4. Review for persuasion, clarity, and executive readability',
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

  if (deliverableType === 'brand-guidelines') {
    return [
      '1. Confirm the core brand promise and audience impression to create',
      '2. Define visual and verbal system rules',
      '3. Add do / do not examples and application guidance',
      '4. Review for consistency and usability across teams',
    ]
  }

  if (deliverableType === 'seo-audit' || deliverableType === 'research-brief' || deliverableType === 'data-analysis') {
    return [
      '1. Confirm the audit or research scope and evidence sources',
      '2. Gather and group findings into clear themes',
      '3. Translate findings into commercial implications',
      '4. Prioritize actions by urgency and impact',
      '5. Package the output into a client-ready report',
    ]
  }

  if (deliverableType === 'ui-audit') {
    return [
      '1. Confirm the page or flow scope and audit objective',
      '2. Review navigation, hierarchy, and usability friction',
      '3. Check accessibility, responsiveness, and interaction states',
      '4. Translate issues into severity-ranked findings',
      '5. Recommend fixes with clear rationale and evidence requirements',
    ]
  }

  if (deliverableType === 'creative-asset' || deliverableType === 'pr-comms' || deliverableType === 'event-plan') {
    return [
      '1. Confirm brief, audience, and execution context',
      '2. Draft the primary concept or structure',
      '3. Add production, delivery, or rollout notes where relevant',
      '4. Review for quality, clarity, and readiness',
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
    `Deliverable mode: ${getDeliverableSpec(input.deliverableType).label}.`,
    `Original request focus: ${input.request}`,
  ].join(' ')
}
