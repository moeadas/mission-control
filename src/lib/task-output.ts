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

  if (deliverableType === 'campaign-copy') {
    if (lower.includes('carousel') || lower.includes('instagram')) {
      return [
        'Produce the final client-ready social deliverable, not a brief.',
        'Write with scientific clarity, strong hooks, and platform-native structure.',
        'Output sections in this exact order:',
        '1. Objective',
        '2. Audience',
        '3. Core message',
        '4. Hook options (3)',
        '5. Carousel cover headline',
        '6. Slide-by-slide carousel copy with Slide 1 onward',
        '7. Caption',
        '8. CTA',
        '9. Hashtag suggestions',
        '10. Design direction notes',
        'Make every slide concise and readable on mobile.',
      ].join('\n')
    }

    return [
      'Produce the final copy deliverable, not a brief.',
      'Output sections in this exact order:',
      '1. Objective',
      '2. Audience',
      '3. Key message',
      '4. Hook options (3)',
      '5. Primary copy',
      '6. Supporting variants',
      '7. CTA',
    ].join('\n')
  }

  if (deliverableType === 'content-calendar') {
    return [
      'Produce a complete content calendar, not a planning note.',
      'Start with a one-paragraph strategy summary.',
      'Then create a table-like schedule with at least 10 content entries.',
      'Each row must include: Week/Date, Channel, Theme, Post Idea, Hook, CTA, Asset Type, Objective.',
      'Make the calendar realistic for the client industry and buying cycle.',
    ].join('\n')
  }

  if (deliverableType === 'media-plan' || deliverableType === 'budget-sheet' || deliverableType === 'kpi-forecast') {
    return [
      'Produce the actual planning output, not a brief.',
      'Include sections in this order:',
      '1. Objective',
      '2. Audience and targeting logic',
      '3. Channel mix',
      '4. Budget allocation',
      '5. Flighting / schedule',
      '6. KPI framework',
      '7. Risks and watchouts',
      'Use concrete numbers when useful, but keep them positioned as planning assumptions.',
    ].join('\n')
  }

  if (deliverableType === 'campaign-strategy' || deliverableType === 'strategy-brief') {
    return [
      'Produce a strategist-grade output that can be reviewed directly by the client team.',
      'Include sections in this order:',
      '1. Objective',
      '2. Situation / context',
      '3. Audience insight',
      '4. Strategic tension or opportunity',
      '5. Positioning / message direction',
      '6. Recommendations',
      '7. Immediate next moves',
    ].join('\n')
  }

  if (deliverableType === 'seo-audit' || deliverableType === 'research-brief') {
    return [
      'Produce the actual audit or research output.',
      'Include: Executive summary, key findings, implications, recommended actions, and priority order.',
      'Be specific and commercially useful.',
    ].join('\n')
  }

  if (deliverableType === 'creative-asset') {
    return [
      'Produce a complete creative production pack, not a project status note.',
      'Include sections in this order:',
      '1. Creative objective',
      '2. Audience',
      '3. Concept direction',
      '4. Visual composition',
      '5. Copy overlays',
      '6. Image-generation prompt',
      '7. Variations',
      '8. Production notes',
    ].join('\n')
  }

  return 'Produce the actual draft deliverable itself, with clear sections and no routing boilerplate.'
}
