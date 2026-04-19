import { DeliverableType } from '@/lib/types'
import { getDeliverableSpec } from '@/lib/deliverables'

export interface DeliverableQualityResult {
  ok: boolean
  score: number
  issues: string[]
}

function isSimpleSocialPostRequest(request: string) {
  const lower = request.toLowerCase()
  return (
    /(instagram post|linkedin post|social post|single post|caption)/.test(lower) &&
    !/(carousel|slide by slide|slide-by-slide|content calendar|campaign strategy|media plan|audit|brief|visual direction|design)/.test(lower)
  )
}

function hasSection(text: string, section: string) {
  return new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im').test(text)
}

function extractSectionBodies(text: string) {
  const sections = Array.from(text.matchAll(/^##\s+(.+?)\s*$/gm))
  return sections.map((section, index) => {
    const start = (section.index || 0) + section[0].length
    const end = index + 1 < sections.length ? sections[index + 1].index || text.length : text.length
    return {
      title: section[1].trim(),
      body: text.slice(start, end).trim(),
    }
  })
}

export function validateDeliverableQuality(
  deliverableType: DeliverableType,
  content: string,
  request?: string
): DeliverableQualityResult {
  const issues: string[] = []
  const trimmed = content.trim()

  if (!trimmed) {
    return { ok: false, score: 0, issues: ['Output is empty.'] }
  }

  if (!/^#\s+.+/m.test(trimmed)) {
    issues.push('Missing primary H1 title.')
  }

  const genericIssues = [
    ['task routed to', 'Output still contains routing boilerplate.'],
    ['lead agent', 'Output still contains internal lead-agent language.'],
    ['next steps:', 'Output still contains project-management status language.'],
    ['status: in progress', 'Output still contains internal status language.'],
  ] as const

  for (const [needle, issue] of genericIssues) {
    if (trimmed.toLowerCase().includes(needle)) issues.push(issue)
  }

  const requiredSections: Record<DeliverableType, string[]> = {
    'short-form-copy': ['Objective', 'Primary Option', 'Character Check'],
    'email-campaign': ['Objective', 'Email Structure', 'Body Copy', 'CTA'],
    'blog-article': ['Objective', 'Working Title', 'Article Draft'],
    'website-copy': ['Objective', 'Hero', 'Value Proposition', 'CTA'],
    'video-script': ['Objective', 'Hook', 'Script'],
    presentation: ['Objective', 'Narrative Arc', 'Slide Outline'],
    'campaign-copy': request && isSimpleSocialPostRequest(request)
      ? ['Objective', 'Post Copy', 'CTA']
      : ['Objective', 'Audience', 'Core Message'],
    'content-calendar': ['Strategy Summary', 'Content Pillars', 'Calendar'],
    'media-plan': ['Objective', 'Channel Mix', 'Budget Allocation', 'KPI Framework'],
    'budget-sheet': ['Objective', 'Budget Allocation'],
    'kpi-forecast': ['Objective', 'KPI Framework'],
    'strategy-brief': ['Objective', 'Situation / Context', 'Recommendations'],
    'campaign-strategy': ['Objective', 'Situation / Context', 'Recommendations'],
    'brand-guidelines': ['Brand Core', 'Visual System', 'Tone of Voice'],
    'seo-audit': ['Executive Summary', 'Key Findings', 'Recommended Actions'],
    'ui-audit': ['Executive Summary', 'Key UX Findings', 'Priority Fixes'],
    'research-brief': ['Executive Summary', 'Key Findings', 'Recommended Actions'],
    'data-analysis': ['Executive Summary', 'Key Findings', 'Recommended Actions'],
    'creative-asset': ['Creative Objective', 'Concept Direction', 'Image-Generation Prompt'],
    'client-brief': ['Objective', 'Core Narrative', 'Draft'],
    'pr-comms': ['Objective', 'Core Narrative', 'Draft'],
    'event-plan': ['Objective', 'Event Concept', 'Run of Show'],
    'general-task': [],
    'status-report': [],
  }

  for (const section of requiredSections[deliverableType] || []) {
    if (!hasSection(trimmed, section)) {
      issues.push(`Missing required section: ${section}.`)
    }
  }

  if (/\b(tbd|to be determined|placeholder|lorem ipsum)\b/i.test(trimmed)) {
    issues.push('Output still contains placeholder copy such as TBD or lorem ipsum.')
  }

  if (/\{\{[^}]+\}\}/.test(trimmed)) {
    issues.push('Output still contains unreplaced template variables.')
  }

  if (/\[(insert|add|replace|client name|brand name)[^\]]*\]/i.test(trimmed)) {
    issues.push('Output still contains bracketed template instructions.')
  }

  const sections = extractSectionBodies(trimmed)
  const spec = getDeliverableSpec(deliverableType)
  if (spec.complexity === 'high') {
    const thinSection = sections.find((section) => section.body.replace(/\s+/g, ' ').trim().length < 80)
    if (thinSection) {
      issues.push(`Section "${thinSection.title}" is too thin for a high-complexity deliverable.`)
    }
  }

  if (deliverableType === 'content-calendar' && !/\|.+\|.+\|/.test(trimmed)) {
    issues.push('Content calendar is missing a table layout.')
  }

  if (deliverableType === 'short-form-copy' && trimmed.length > 900) {
    issues.push('Short-form copy output is too long for the intended use case.')
  }

  const score = Math.max(0, 100 - issues.length * 12)
  return {
    ok: issues.length === 0,
    score,
    issues,
  }
}
