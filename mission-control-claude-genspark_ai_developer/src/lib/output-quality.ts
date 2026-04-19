import { DeliverableType } from '@/lib/types'

export interface DeliverableQualityResult {
  ok: boolean
  score: number
  issues: string[]
}

function hasSection(text: string, section: string) {
  return new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im').test(text)
}

export function validateDeliverableQuality(deliverableType: DeliverableType, content: string): DeliverableQualityResult {
  const issues: string[] = []
  const trimmed = content.trim()

  if (!trimmed) {
    return { ok: false, score: 0, issues: ['Output is empty.'] }
  }

  if (!/^#\s+.+/m.test(trimmed)) {
    issues.push('Missing primary H1 title.')
  }

  // Only flag routing/management boilerplate in the first 300 characters to avoid
  // false positives on legitimate "Next Steps" sections in real deliverables.
  const head = trimmed.toLowerCase().slice(0, 300)
  const genericIssues = [
    ['task routed to', 'Output still contains routing boilerplate.'],
    ['lead agent:', 'Output still contains internal lead-agent language.'],
    ['status: in progress', 'Output still contains internal status language.'],
  ] as const

  for (const [needle, issue] of genericIssues) {
    if (head.includes(needle)) issues.push(issue)
  }

  const requiredSections: Record<DeliverableType, string[]> = {
    'campaign-copy': ['Objective', 'Audience', 'Core Message'],
    'content-calendar': ['Strategy Summary', 'Content Pillars', 'Calendar'],
    'media-plan': ['Objective', 'Channel Mix', 'Budget Allocation', 'KPI Framework'],
    'budget-sheet': ['Objective', 'Budget Allocation'],
    'kpi-forecast': ['Objective', 'KPI Framework'],
    'strategy-brief': ['Objective', 'Situation / Context', 'Recommendations'],
    'campaign-strategy': ['Objective', 'Situation / Context', 'Recommendations'],
    'seo-audit': ['Executive Summary', 'Key Findings', 'Recommended Actions'],
    'research-brief': ['Executive Summary', 'Key Findings', 'Recommended Actions'],
    'creative-asset': ['Creative Objective', 'Concept Direction', 'Image-Generation Prompt'],
    'client-brief': ['Objective', 'Situation / Context'],
    'status-report': [],
  }

  for (const section of requiredSections[deliverableType] || []) {
    if (!hasSection(trimmed, section)) {
      issues.push(`Missing required section: ${section}.`)
    }
  }

  // Content-type-specific substantive checks
  if (deliverableType === 'content-calendar') {
    if (!/\|.+\|.+\|/.test(trimmed)) {
      issues.push('Content calendar is missing a table layout.')
    }
    // Check that at least some numbered ideas or post entries are present
    const postCount = (trimmed.match(/\bpost\s+#?\d+/gi) || []).length
    const ideaCount = (trimmed.match(/\bidea\s+#?\d+/gi) || []).length
    const dayCount = (trimmed.match(/\|\s*\d{1,2}\s*\|/g) || []).length
    if (postCount + ideaCount + dayCount < 5) {
      issues.push('Content calendar appears to have fewer than 5 entries — may be incomplete.')
    }
  }

  if (deliverableType === 'campaign-copy') {
    // Should have at least one hook or headline and a CTA
    if (!/\b(hook|headline|cta|call to action)\b/i.test(trimmed)) {
      issues.push('Campaign copy is missing hooks/headlines or CTA labels.')
    }
  }

  if (deliverableType === 'media-plan') {
    // Should contain numeric budget figures
    if (!/\$[\d,]+|\d+%/.test(trimmed)) {
      issues.push('Media plan appears to have no numeric budget or percentage figures.')
    }
  }

  if (deliverableType === 'kpi-forecast') {
    // Should contain at least some numbers/metrics
    if (!/\d/.test(trimmed)) {
      issues.push('KPI forecast contains no numeric data.')
    }
  }

  if (deliverableType === 'seo-audit' || deliverableType === 'research-brief') {
    // Should have findings (numbered list or bullet points)
    if (!/(^\d+\.|^-\s|^\*\s)/m.test(trimmed)) {
      issues.push('Report appears to have no structured findings list.')
    }
  }

  const score = Math.max(0, 100 - issues.length * 15)
  return {
    ok: issues.length === 0,
    score,
    issues,
  }
}
