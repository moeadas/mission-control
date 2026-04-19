import type { DeliverableType } from '@/lib/types'
import { getDeliverableSpec } from '@/lib/deliverables'

export type IrisBriefField =
  | 'objective'
  | 'platforms'
  | 'timeframe'
  | 'cadence'
  | 'format'
  | 'includeArtwork'

export type IrisBriefValue = string | string[] | boolean

export interface IrisPendingBrief {
  deliverableType: DeliverableType
  originalRequest: string
  values: Partial<Record<IrisBriefField, IrisBriefValue>>
}

export interface IrisBriefQuestion {
  field: IrisBriefField
  prompt: string
  helper: string
  options: string[]
  allowsFreeText?: boolean
}

const PLATFORM_OPTIONS = [
  'Instagram + LinkedIn',
  'Instagram',
  'LinkedIn',
  'Facebook + Instagram',
  'TikTok + Instagram',
  'Website + Email',
]

const OBJECTIVE_OPTIONS = [
  'Awareness',
  'Education',
  'Lead Generation',
  'Conversion',
  'Engagement',
  'Thought Leadership',
]

const TIMEFRAME_OPTIONS = [
  '7 days',
  '14 days',
  '30 days',
  'This month',
  'This quarter',
]

const CADENCE_OPTIONS = [
  '3x per week',
  '4x per week',
  '5x per week',
  'Daily',
]

const FORMAT_OPTIONS = [
  'Single posts',
  'Carousel posts',
  'Mixed formats',
  'Email sequence',
  'Document / report',
]

const BOOLEAN_OPTIONS = ['Yes', 'No']

const REQUIRED_BRIEF_FIELDS: Partial<Record<DeliverableType, IrisBriefField[]>> = {
  'content-calendar': ['objective', 'platforms', 'timeframe', 'cadence'],
  'campaign-copy': ['objective', 'platforms', 'format'],
  'email-campaign': ['objective'],
  'website-copy': ['objective'],
  'blog-article': ['objective'],
  'video-script': ['objective', 'platforms'],
  'presentation': ['objective'],
  'campaign-strategy': ['objective', 'platforms', 'timeframe'],
  'strategy-brief': ['objective'],
  'brand-guidelines': ['objective'],
  'research-brief': ['objective'],
  'seo-audit': ['objective'],
  'data-analysis': ['objective', 'timeframe'],
  'creative-asset': ['objective', 'platforms', 'format', 'includeArtwork'],
  'ui-audit': ['objective'],
  'client-brief': ['objective'],
  'pr-comms': ['objective'],
  'media-plan': ['objective', 'platforms', 'timeframe'],
  'event-plan': ['objective', 'timeframe'],
  'budget-sheet': ['objective', 'timeframe'],
  'kpi-forecast': ['objective', 'timeframe'],
}

function normalizeObjective(text: string) {
  const lower = text.toLowerCase()
  if (/\b(awareness|visibility|reach|brand awareness)\b/.test(lower)) return 'Awareness'
  if (/\b(education|educate|inform|explain)\b/.test(lower)) return 'Education'
  if (/\b(lead gen|lead generation|book|enquiry|inquiry|qualified leads)\b/.test(lower)) return 'Lead Generation'
  if (/\b(conversion|sales|purchase|buy|bookings)\b/.test(lower)) return 'Conversion'
  if (/\b(engagement|comments|shares|community)\b/.test(lower)) return 'Engagement'
  if (/\b(thought leadership|authority|credibility)\b/.test(lower)) return 'Thought Leadership'
  return null
}

function normalizePlatforms(text: string) {
  const lower = text.toLowerCase()
  const platforms = [
    /instagram/.test(lower) ? 'Instagram' : null,
    /linkedin/.test(lower) ? 'LinkedIn' : null,
    /facebook/.test(lower) ? 'Facebook' : null,
    /\b(x|twitter)\b/.test(lower) ? 'X' : null,
    /tiktok/.test(lower) ? 'TikTok' : null,
    /youtube/.test(lower) ? 'YouTube' : null,
    /email/.test(lower) ? 'Email' : null,
    /website|site|web/.test(lower) ? 'Website' : null,
  ].filter(Boolean) as string[]

  return platforms.length ? Array.from(new Set(platforms)) : null
}

function normalizeTimeframe(text: string) {
  const lower = text.toLowerCase().trim()
  if (/\b7\s*days?\b|\bone week\b|\bthis week\b/.test(lower)) return '7 days'
  if (/\b14\s*days?\b|\btwo weeks?\b/.test(lower)) return '14 days'
  if (/\b30\s*days?\b|\bone month\b|\bthis month\b|\bmonthly\b/.test(lower)) return '30 days'
  if (/\bthis quarter\b|\bnext quarter\b|\bq[1-4]\b/.test(lower)) return 'This quarter'
  return text.trim() || null
}

function normalizeCadence(text: string) {
  const lower = text.toLowerCase()
  if (/\b3x\b|\bthree times\b|\b3 per week\b/.test(lower)) return '3x per week'
  if (/\b4x\b|\bfour times\b|\b4 per week\b/.test(lower)) return '4x per week'
  if (/\b5x\b|\bfive times\b|\b5 per week\b/.test(lower)) return '5x per week'
  if (/\bdaily\b|\bevery day\b/.test(lower)) return 'Daily'
  return text.trim() || null
}

function normalizeFormat(text: string) {
  const lower = text.toLowerCase()
  if (/\bmixed\b/.test(lower)) return 'Mixed formats'
  if (/\bcarousel\b/.test(lower)) return 'Carousel posts'
  if (/\bsingle\b|\bcaption\b|\bpost\b/.test(lower)) return 'Single posts'
  if (/\bemail\b|\bsequence\b/.test(lower)) return 'Email sequence'
  if (/\bdocument\b|\breport\b|\bdeck\b/.test(lower)) return 'Document / report'
  return text.trim() || null
}

function normalizeBoolean(text: string) {
  const lower = text.toLowerCase().trim()
  if (/^(yes|yep|yeah|include|with artwork|with design|true)$/i.test(lower)) return true
  if (/^(no|nope|without|false)$/i.test(lower)) return false
  return null
}

export function getRequiredBriefFields(deliverableType: DeliverableType): IrisBriefField[] {
  return REQUIRED_BRIEF_FIELDS[deliverableType] || []
}

export function extractBriefValuesFromText(text: string): Partial<Record<IrisBriefField, IrisBriefValue>> {
  const values: Partial<Record<IrisBriefField, IrisBriefValue>> = {}
  const objective = normalizeObjective(text)
  const platforms = normalizePlatforms(text)
  const timeframe = normalizeTimeframe(text)
  const cadence = normalizeCadence(text)
  const format = normalizeFormat(text)
  const includeArtwork = normalizeBoolean(text)

  if (objective) values.objective = objective
  if (platforms?.length) values.platforms = platforms
  if (timeframe && timeframe !== text.trim()) values.timeframe = timeframe
  if (cadence && cadence !== text.trim()) values.cadence = cadence
  if (format && format !== text.trim()) values.format = format
  if (typeof includeArtwork === 'boolean') values.includeArtwork = includeArtwork

  return values
}

export function createPendingBrief(request: string, deliverableType: DeliverableType): IrisPendingBrief | null {
  const requiredFields = getRequiredBriefFields(deliverableType)
  if (!requiredFields.length) return null

  return {
    deliverableType,
    originalRequest: request,
    values: extractBriefValuesFromText(request),
  }
}

export function getNextMissingBriefField(brief: IrisPendingBrief): IrisBriefField | null {
  const requiredFields = getRequiredBriefFields(brief.deliverableType)
  return requiredFields.find((field) => {
    const value = brief.values[field]
    if (Array.isArray(value)) return value.length === 0
    return value === undefined || value === null || value === ''
  }) || null
}

export function isBriefComplete(brief: IrisPendingBrief) {
  return getNextMissingBriefField(brief) === null
}

export function getBriefQuestion(brief: IrisPendingBrief): IrisBriefQuestion | null {
  const field = getNextMissingBriefField(brief)
  if (!field) return null

  const label = getDeliverableSpec(brief.deliverableType).label.toLowerCase()

  switch (field) {
    case 'objective':
      return {
        field,
        prompt: `What is the main objective for this ${label}?`,
        helper: 'Choose the outcome Iris should optimize for.',
        options: OBJECTIVE_OPTIONS,
      }
    case 'platforms':
      return {
        field,
        prompt: `Which platforms should this ${label} cover?`,
        helper: 'You can click a preset or type a custom mix.',
        options: PLATFORM_OPTIONS,
        allowsFreeText: true,
      }
    case 'timeframe':
      return {
        field,
        prompt: `What timeframe should Iris plan for?`,
        helper: 'This helps scope the output and pacing.',
        options: TIMEFRAME_OPTIONS,
        allowsFreeText: true,
      }
    case 'cadence':
      return {
        field,
        prompt: `What posting cadence do you want?`,
        helper: 'Pick the publishing rhythm for the calendar.',
        options: CADENCE_OPTIONS,
        allowsFreeText: true,
      }
    case 'format':
      return {
        field,
        prompt: `What format should this ${label} use?`,
        helper: 'Pick the output shape Iris should create.',
        options: FORMAT_OPTIONS,
        allowsFreeText: true,
      }
    case 'includeArtwork':
      return {
        field,
        prompt: 'Should Iris include artwork or visual direction?',
        helper: 'This controls whether visual asset guidance is part of the deliverable.',
        options: BOOLEAN_OPTIONS,
      }
  }
}

export function applyBriefAnswer(
  brief: IrisPendingBrief,
  answer: string,
  fieldOverride?: IrisBriefField
): IrisPendingBrief {
  const field = fieldOverride || getNextMissingBriefField(brief)
  if (!field) return brief

  const trimmed = answer.trim()
  const values = { ...brief.values }

  switch (field) {
    case 'objective':
      values.objective = normalizeObjective(trimmed) || trimmed
      break
    case 'platforms':
      values.platforms = normalizePlatforms(trimmed) || trimmed.split(/[,+/]| and /i).map((item) => item.trim()).filter(Boolean)
      break
    case 'timeframe':
      values.timeframe = normalizeTimeframe(trimmed) || trimmed
      break
    case 'cadence':
      values.cadence = normalizeCadence(trimmed) || trimmed
      break
    case 'format':
      values.format = normalizeFormat(trimmed) || trimmed
      break
    case 'includeArtwork': {
      const normalized = normalizeBoolean(trimmed)
      values.includeArtwork = typeof normalized === 'boolean' ? normalized : trimmed
      break
    }
  }

  return {
    ...brief,
    values,
  }
}

export function composeBriefedRequest(brief: IrisPendingBrief) {
  const summaryLines = getRequiredBriefFields(brief.deliverableType)
    .map((field) => {
      const value = brief.values[field]
      if (value === undefined || value === null || value === '') return null
      return `${field}: ${Array.isArray(value) ? value.join(', ') : String(value)}`
    })
    .filter(Boolean)

  return `${brief.originalRequest}\n\nConfirmed brief:\n${summaryLines.join('\n')}`
}

export const __irisBriefingTestables = {
  normalizeObjective,
  normalizePlatforms,
  normalizeTimeframe,
  normalizeCadence,
  normalizeFormat,
  normalizeBoolean,
}
