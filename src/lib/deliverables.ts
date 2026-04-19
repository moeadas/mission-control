import type { DeliverableCategory, DeliverableComplexity, DeliverableType } from '@/lib/types'

export interface DeliverableSpec {
  id: DeliverableType
  label: string
  category: DeliverableCategory
  patterns: RegExp[]
  defaultLead: string
  defaultCollaborators: string[]
  pipelineId: string | null
  pipelineKeywords: string[]
  complexity: DeliverableComplexity
  priority: number
}

export interface DeliverableAgentDefaults {
  leadAgentId: string
  collaboratorAgentIds: string[]
}

export interface DeliverableChannelingProfile extends DeliverableAgentDefaults {
  id: DeliverableType
  complexity: DeliverableComplexity
  skillBoostPatterns: RegExp[]
  skillPenaltyPatterns: RegExp[]
  simpleVariantPatterns?: RegExp[]
}

export const DELIVERABLE_REGISTRY: DeliverableSpec[] = [
  {
    id: 'content-calendar',
    label: 'Content Calendar',
    category: 'content',
    patterns: [
      /\b(content calendar|editorial calendar|30[- ]?day content|monthly content|weekly content plan|content schedule|posting schedule|content plan)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'nova', 'lyra'],
    pipelineId: 'content-calendar',
    pipelineKeywords: ['content calendar', 'posting schedule', 'editorial calendar', '30 day content', 'monthly content plan'],
    complexity: 'high',
    priority: 90,
  },
  {
    id: 'short-form-copy',
    label: 'Short-Form Copy',
    category: 'content',
    patterns: [
      /\b(whatsapp description|whatsapp bio|bio|profile description|short description|company description|brand description|tagline|one-liner|elevator pitch|slogan|meta description|app store description)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya'],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'low',
    priority: 86,
  },
  {
    id: 'campaign-copy',
    label: 'Campaign Copy',
    category: 'content',
    patterns: [
      /\b(facebook post|instagram post|linkedin post|social post|single post|caption|carousel post|campaign copy|campaign content|post copy|tweet|thread)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya'],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'medium',
    priority: 80,
  },
  {
    id: 'email-campaign',
    label: 'Email Campaign',
    category: 'content',
    patterns: [
      /\b(email campaign|email sequence|email template|newsletter|drip campaign|email marketing|welcome email|onboarding email|email flow|email series|email blast|edm)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'nova'],
    pipelineId: null,
    pipelineKeywords: ['email campaign', 'email sequence', 'drip campaign', 'newsletter'],
    complexity: 'medium',
    priority: 78,
  },
  {
    id: 'website-copy',
    label: 'Website Copy',
    category: 'content',
    patterns: [
      /\b(website copy|web copy|landing page|homepage copy|about page|product page|service page|hero copy|website content|page copy|site copy)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'lyra'],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'medium',
    priority: 74,
  },
  {
    id: 'blog-article',
    label: 'Blog / Article',
    category: 'content',
    patterns: [
      /\b(blog post|blog article|article|thought leadership|op-?ed|long-?form content|guest post|pillar page|how-?to guide|listicle|write an article|write a blog)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['atlas', 'maya'],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'medium',
    priority: 72,
  },
  {
    id: 'video-script',
    label: 'Video / Script',
    category: 'content',
    patterns: [
      /\b(video script|script for|youtube script|reel script|tiktok script|podcast script|voiceover|voice over|screenplay|storyboard script|explainer video|ad script|commercial script)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['lyra', 'maya'],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'medium',
    priority: 70,
  },
  {
    id: 'presentation',
    label: 'Presentation / Deck',
    category: 'content',
    patterns: [
      /\b(presentation|slide deck|pitch deck|keynote|powerpoint|pptx|investor deck|sales deck|stakeholder deck|board deck|proposal deck|slides)\b/,
    ],
    defaultLead: 'sage',
    defaultCollaborators: ['maya', 'lyra', 'echo'],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'high',
    priority: 68,
  },
  {
    id: 'campaign-strategy',
    label: 'Campaign Strategy',
    category: 'strategy',
    patterns: [/\b(campaign strategy|campaign plan|launch plan|launch strategy|promotion strategy|campaign brief|integrated campaign|omnichannel campaign)\b/],
    defaultLead: 'maya',
    defaultCollaborators: ['nova', 'echo', 'atlas'],
    pipelineId: 'campaign-brief',
    pipelineKeywords: ['campaign strategy', 'campaign plan', 'launch plan', 'campaign brief'],
    complexity: 'high',
    priority: 66,
  },
  {
    id: 'strategy-brief',
    label: 'Strategy Brief',
    category: 'strategy',
    patterns: [
      /\b(strategy|strategic|positioning|messaging|message pillars|value proposition|go-?to-?market|gtm|brand strategy|brand positioning|growth strategy|marketing strategy|digital strategy|comms strategy)\b/,
      /\b(why they are not buying|why they're not buying|what do they want|what value are they seeking|sales issue|sales problem|conversion issue)\b/,
    ],
    defaultLead: 'maya',
    defaultCollaborators: ['atlas', 'sage'],
    pipelineId: 'strategy-brief',
    pipelineKeywords: ['strategy brief', 'brand strategy', 'messaging strategy', 'positioning', 'go-to-market'],
    complexity: 'high',
    priority: 64,
  },
  {
    id: 'brand-guidelines',
    label: 'Brand Guidelines',
    category: 'strategy',
    patterns: [/\b(brand guidelines|brand book|style guide|brand identity|visual identity|brand manual|brand standards|design system|brand kit)\b/],
    defaultLead: 'lyra',
    defaultCollaborators: ['maya', 'echo'],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'high',
    priority: 60,
  },
  {
    id: 'seo-audit',
    label: 'SEO Audit',
    category: 'technical',
    patterns: [/\b(seo audit|technical seo|search audit|keyword research|keyword analysis|seo report|seo strategy|search engine|serp|backlink audit|on-?page seo|off-?page seo|site audit)\b/],
    defaultLead: 'atlas',
    defaultCollaborators: ['echo', 'nova'],
    pipelineId: 'seo-audit',
    pipelineKeywords: ['seo audit', 'technical seo', 'keyword research', 'seo report'],
    complexity: 'high',
    priority: 58,
  },
  {
    id: 'research-brief',
    label: 'Research Brief',
    category: 'research',
    patterns: [/\b(market analysis|audience research|customer insight|target audience|competitor|competitive analysis|market research|consumer research|industry analysis|benchmark|benchmarking|trend analysis|trend report|landscape analysis)\b/],
    defaultLead: 'atlas',
    defaultCollaborators: ['maya', 'echo'],
    pipelineId: 'competitor-research',
    pipelineKeywords: ['competitor research', 'competitive analysis', 'market research', 'audience research'],
    complexity: 'high',
    priority: 56,
  },
  {
    id: 'ui-audit',
    label: 'UI/UX Audit',
    category: 'technical',
    patterns: [/\b(ui audit|ux audit|website audit|page audit|usability audit|accessibility audit|heuristic evaluation|design review|ux review|cro audit|conversion audit)\b/],
    defaultLead: 'finn',
    defaultCollaborators: ['lyra', 'echo', 'dex'],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'high',
    priority: 55,
  },
  {
    id: 'data-analysis',
    label: 'Data / Analytics Report',
    category: 'analytics',
    patterns: [/\b(data analysis|analytics report|performance report|dashboard|kpi report|metrics|roi analysis|attribution|conversion rate|funnel analysis|analytics audit|data audit|reporting)\b/],
    defaultLead: 'dex',
    defaultCollaborators: ['atlas', 'nova'],
    pipelineId: null,
    pipelineKeywords: ['analytics report', 'performance report', 'dashboard', 'reporting'],
    complexity: 'high',
    priority: 54,
  },
  {
    id: 'creative-asset',
    label: 'Creative Asset',
    category: 'creative',
    patterns: [/\b(image|visual|artwork|design|creative asset|mockup|poster|hero image|ad creative|text over|text overlay|headline on image|post image|generate image|create image|infographic|social graphic|banner|display ad)\b/],
    defaultLead: 'lyra',
    defaultCollaborators: ['echo', 'finn'],
    pipelineId: 'ad-creative',
    pipelineKeywords: ['creative asset', 'ad creative', 'banner', 'display ad'],
    complexity: 'medium',
    priority: 77,
  },
  {
    id: 'client-brief',
    label: 'Client Brief',
    category: 'communications',
    patterns: [/\b(client brief|briefing document|intake brief|onboarding brief|client onboarding|project brief|creative brief)\b/],
    defaultLead: 'sage',
    defaultCollaborators: ['maya', 'echo'],
    pipelineId: 'client-brief',
    pipelineKeywords: ['client brief', 'briefing document', 'onboarding brief', 'creative brief'],
    complexity: 'medium',
    priority: 62,
  },
  {
    id: 'pr-comms',
    label: 'PR / Communications',
    category: 'communications',
    patterns: [/\b(press release|pr strategy|media release|public relations|media kit|press kit|media pitch|crisis comms|crisis communication|pr plan|media outreach|earned media|spokesperson)\b/],
    defaultLead: 'sage',
    defaultCollaborators: ['echo', 'maya'],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'medium',
    priority: 57,
  },
  {
    id: 'media-plan',
    label: 'Media Plan',
    category: 'operations',
    patterns: [/\b(media plan|channel plan|budget allocation|forecast|media budget|media mix|paid media|organic media|media strategy|ad spend|advertising plan|media allocation)\b/],
    defaultLead: 'nova',
    defaultCollaborators: ['dex', 'maya'],
    pipelineId: 'media-plan',
    pipelineKeywords: ['media plan', 'channel plan', 'media strategy', 'ad spend', 'budget allocation'],
    complexity: 'high',
    priority: 53,
  },
  {
    id: 'event-plan',
    label: 'Event Plan',
    category: 'operations',
    patterns: [/\b(event plan|event strategy|conference|webinar|workshop|summit|meetup|event brief|activation|experiential|launch event|virtual event|hybrid event)\b/],
    defaultLead: 'nova',
    defaultCollaborators: ['maya', 'sage', 'echo'],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'high',
    priority: 52,
  },
  {
    id: 'budget-sheet',
    label: 'Budget Sheet',
    category: 'operations',
    patterns: [/\b(budget sheet|budget breakdown|cost estimate|cost breakdown|budget template|financial plan|spend tracker)\b/],
    defaultLead: 'dex',
    defaultCollaborators: ['nova', 'maya'],
    pipelineId: null,
    pipelineKeywords: ['budget sheet', 'budget breakdown', 'cost estimate'],
    complexity: 'medium',
    priority: 51,
  },
  {
    id: 'kpi-forecast',
    label: 'KPI Forecast',
    category: 'analytics',
    patterns: [/\b(kpi forecast|kpi projection|performance forecast|growth forecast|target setting|goal setting|okr)\b/],
    defaultLead: 'dex',
    defaultCollaborators: ['atlas', 'nova'],
    pipelineId: null,
    pipelineKeywords: ['kpi forecast', 'kpi projection', 'performance forecast'],
    complexity: 'medium',
    priority: 50,
  },
  {
    id: 'general-task',
    label: 'General Task',
    category: 'operations',
    patterns: [],
    defaultLead: 'maya',
    defaultCollaborators: ['atlas'],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'medium',
    priority: 0,
  },
  {
    id: 'status-report',
    label: 'Status Report',
    category: 'operations',
    patterns: [],
    defaultLead: 'iris',
    defaultCollaborators: [],
    pipelineId: null,
    pipelineKeywords: [],
    complexity: 'low',
    priority: 0,
  },
]

export function getDeliverableSpec(id: string): DeliverableSpec {
  return DELIVERABLE_REGISTRY.find((spec) => spec.id === id) || DELIVERABLE_REGISTRY.find((spec) => spec.id === 'status-report')!
}

export function getDeliverableAgentDefaults(id: DeliverableType): DeliverableAgentDefaults {
  const spec = getDeliverableSpec(id)
  return {
    leadAgentId: spec.defaultLead,
    collaboratorAgentIds: [...spec.defaultCollaborators],
  }
}

const DELIVERABLE_CHANNELING_OVERRIDES: Partial<
  Record<
    DeliverableType,
    Pick<DeliverableChannelingProfile, 'skillBoostPatterns' | 'skillPenaltyPatterns' | 'simpleVariantPatterns'>
  >
> = {
  'content-calendar': {
    skillBoostPatterns: [/calendar|content|platform-native|social|campaign|copywriting|headline|scheduling/],
    skillPenaltyPatterns: [/operations|documentation|knowledge|resource|capacity|waterfall|meeting|delegation|scope|process/],
  },
  'campaign-copy': {
    skillBoostPatterns: [/copywriting|copy|headline|content|social|email|landing-page|cta|brand-voice|tone-adaptation|persuasion|caption|campaign/],
    skillPenaltyPatterns: [/operations|quality|documentation|knowledge|resource|capacity|waterfall|meeting|delegation|scope|process/],
    simpleVariantPatterns: [/\b(linkedin post|instagram post|social post|single post|caption)\b/],
  },
  'short-form-copy': {
    skillBoostPatterns: [/short-form|headline|cta|tagline|brand-voice|tone|copywriting/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|media|budget/],
  },
  'email-campaign': {
    skillBoostPatterns: [/email|campaign-copywriting|headline|cta|automation|journey|sequence|drip/],
    skillPenaltyPatterns: [/operations|documentation|waterfall|meeting|delegation/],
  },
  'blog-article': {
    skillBoostPatterns: [/content|copywriting|headline|long-form|narrative|seo|keyword|research|thought/],
    skillPenaltyPatterns: [/operations|scheduling|media|budget|calendar/],
  },
  'website-copy': {
    skillBoostPatterns: [/copywriting|headline|cta|web|landing|conversion|ux|persuasion|brand-voice/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling/],
  },
  'video-script': {
    skillBoostPatterns: [/narrative|storytelling|copywriting|script|video|storyboard|hook/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|budget/],
  },
  presentation: {
    skillBoostPatterns: [/stakeholder|narrative|presentation|communication|strategy|positioning|messaging|visual|design|headline|copywriting/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo/],
  },
  'strategy-brief': {
    skillBoostPatterns: [/strategy|positioning|value-proposition|market-segmentation|go-to-market|brand|messaging|persona|audience|campaign-planning|deep-research/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo|keyword/],
  },
  'campaign-strategy': {
    skillBoostPatterns: [/campaign-planning|strategy|positioning|audience|messaging|channel|media|organic-social|paid|calendar|deep-research/],
    skillPenaltyPatterns: [/operations|documentation|waterfall|meeting|delegation/],
  },
  'brand-guidelines': {
    skillBoostPatterns: [/visual|design|brand|identity|storytelling|positioning|messaging|tone|voice|art-direction|brand-consistency/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo|media|budget/],
  },
  'research-brief': {
    skillBoostPatterns: [/deep-research|research|insight|seo|competitive|market|consumer|audience|benchmark|trend|analysis/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling/],
  },
  'seo-audit': {
    skillBoostPatterns: [/seo|keyword|research|report|competitive|insight|technical|audit|search|content/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|visual|design/],
  },
  'data-analysis': {
    skillBoostPatterns: [/research|data|analysis|insight|market|competitive|performance|analytics|reporting|kpi/],
    skillPenaltyPatterns: [/operations|documentation|calendar|copywriting|visual|design/],
  },
  'creative-asset': {
    skillBoostPatterns: [/visual|design|art-direction|creative|reference-image|template|brand-template|brand-guidelines|brand-consistency|illustration/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo|keyword|budget/],
  },
  'ui-audit': {
    skillBoostPatterns: [/ux|ui|design|visual|quality|copy|conversion|audit|usability|accessibility|heuristic/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo|keyword|budget|media/],
  },
  'client-brief': {
    skillBoostPatterns: [/stakeholder|narrative|communication|briefing|onboarding|presentation|strategy|positioning/],
    skillPenaltyPatterns: [/operations|scheduling|seo|keyword|budget|media/],
  },
  'pr-comms': {
    skillBoostPatterns: [/stakeholder|narrative|communication|negotiation|presentation|media|press|public-relations|crisis/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo|keyword|budget/],
  },
  'media-plan': {
    skillBoostPatterns: [/media|channel|budget|reach|frequency|kpi|paid|organic|allocation|forecast|performance/],
    skillPenaltyPatterns: [/operations|documentation|calendar|copywriting|visual|design/],
  },
  'event-plan': {
    skillBoostPatterns: [/channel|media|calendar|planning|event|scheduling|stakeholder|communication|content|copywriting/],
    skillPenaltyPatterns: [/seo|keyword|ui|ux|design|visual/],
  },
  'budget-sheet': {
    skillBoostPatterns: [/budget|forecast|kpi|pacing|spreadsheet|data|financial|allocation|analytics/],
    skillPenaltyPatterns: [/copywriting|visual|design|narrative|seo/],
  },
  'kpi-forecast': {
    skillBoostPatterns: [/kpi|forecast|projection|data|analytics|performance|metric|benchmark|reporting/],
    skillPenaltyPatterns: [/copywriting|visual|design|narrative|seo|calendar/],
  },
  'general-task': {
    skillBoostPatterns: [/strategy|positioning|messaging|audience|research|insight/],
    skillPenaltyPatterns: [],
  },
  'status-report': {
    skillBoostPatterns: [/task|workflow|coordination|priority/],
    skillPenaltyPatterns: [],
  },
}

export function getDeliverableChannelingProfile(id: DeliverableType): DeliverableChannelingProfile {
  const spec = getDeliverableSpec(id)
  const overrides = DELIVERABLE_CHANNELING_OVERRIDES[id] || DELIVERABLE_CHANNELING_OVERRIDES['general-task']!

  return {
    id: spec.id,
    leadAgentId: spec.defaultLead,
    collaboratorAgentIds: [...spec.defaultCollaborators],
    complexity: spec.complexity,
    skillBoostPatterns: overrides.skillBoostPatterns,
    skillPenaltyPatterns: overrides.skillPenaltyPatterns,
    simpleVariantPatterns: overrides.simpleVariantPatterns,
  }
}

export function isSubstantiveRequest(message: string): boolean {
  const lower = message.toLowerCase().trim()
  if (lower.length < 20) return false

  const actionVerbs = /\b(create|draft|write|build|make|generate|prepare|design|plan|develop|analyse|analyze|audit|review|research|outline|summarize|summarise|propose|recommend|evaluate|compare|assess|optimize|optimise|refactor|launch|execute|schedule|configure|brainstorm|ideate|produce|compose|compile|format|rework|revamp|update|refresh|rephrase|rewrite|improve|enhance|craft)\b/
  const needVerbs = /\b(i need|we need|i want|can you|could you|please|help me|let's|lets|i'd like|we'd like|would you)\b/
  const deliverableNouns = /\b(report|brief|calendar|plan|strategy|audit|analysis|deck|proposal|copy|content|script|template|guide|framework|roadmap|presentation|newsletter|campaign|email|post|article|blog|page|asset|design|mockup|wireframe|diagram)\b/

  if (actionVerbs.test(lower)) return true
  if (needVerbs.test(lower) && lower.length > 30) return true
  if (lower.length > 60 && lower.includes('?')) return true
  if (deliverableNouns.test(lower) && lower.length > 30) return true

  return lower.length > 50
}

export function inferDeliverableTypeFromText(message: string): DeliverableType {
  const lower = message.toLowerCase()
  const strategySignals = [
    'target audience', 'audience research', 'market analysis', 'customer insight',
    'value proposition', 'what value are they seeking', 'what do they want',
    'why they are not buying', "why they're not buying", 'message pillars',
    'messaging', 'positioning', 'go-to-market', 'brand strategy', 'growth strategy',
  ].filter((signal) => lower.includes(signal)).length

  const researchSignals = [
    'research', 'analysis', 'competitor', 'benchmark', 'data', 'insight', 'trend', 'landscape', 'audit', 'report',
  ].filter((signal) => lower.includes(signal)).length

  if (strategySignals >= 3 && researchSignals < strategySignals) return 'strategy-brief'
  if (strategySignals >= 2 && researchSignals >= 2) return 'research-brief'

  let bestId: DeliverableType = 'status-report'
  let bestScore = 0

  for (const spec of [...DELIVERABLE_REGISTRY].filter((item) => item.patterns.length > 0).sort((a, b) => b.priority - a.priority)) {
    let score = 0
    for (const pattern of spec.patterns) {
      const matches = lower.match(pattern)
      if (matches) {
        score += 10
        score += (matches[0]?.length || 0) * 0.5
      }
    }

    if (spec.id === 'creative-asset' && score > 0) {
      if (!/\b(post|caption|instagram|facebook|linkedin|social|ad|banner|display|poster)\b/.test(lower)) score *= 0.35
      if (strategySignals >= 2) score *= 0.3
    }

    if (spec.id === 'short-form-copy' && score > 0) score += 5
    if (spec.id === 'campaign-copy' && /\b(strategy|plan|planning|strategic)\b/.test(lower)) score *= 0.6
    if (spec.id === 'campaign-strategy' && /\b(write|draft|copy|caption|post)\b/.test(lower) && !/\b(strategy|plan|strategic)\b/.test(lower)) score *= 0.5

    if (score > bestScore) {
      bestScore = score
      bestId = spec.id
    }
  }

  if (bestScore < 5) {
    return isSubstantiveRequest(message) ? 'general-task' : 'status-report'
  }

  return bestId
}
