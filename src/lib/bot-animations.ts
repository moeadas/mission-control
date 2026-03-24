import { BotAnimation } from './types'

export const BOT_ANIMATIONS: Record<BotAnimation, string> = {
  idle: 'animate-bot-idle',
  working: 'animate-bot-working',
  thinking: 'animate-bot-thinking',
  resting: 'animate-bot-resting',
  alert: 'animate-bot-alert',
}

export const AGENT_ACCENT_COLORS: Record<string, string> = {
  blue: '#4f8ef7',
  purple: '#9b6dff',
  cyan: '#00d4aa',
  orange: '#ff7c42',
  pink: '#ff5fa0',
  yellow: '#ffd166',
}

export const SPECIALTY_LABELS: Record<string, string> = {
  strategy: 'Brand Strategy',
  creative: 'Creative',
  design: 'Design',
  copy: 'Content & Copy',
  'project-management': 'Traffic Management',
  'client-services': 'Client Services',
  client: 'Client Services',
  'media-planning': 'Media Planning',
  performance: 'Performance Ops',
  seo: 'SEO & Search',
  research: 'Research',
}

export const DIVISION_LABELS: Record<string, string> = {
  orchestration: 'Mission Control',
  'client-services': 'Client Services',
  creative: 'Creative',
  media: 'Media',
  research: 'Research',
}

export const DELIVERABLE_LABELS: Record<string, string> = {
  'client-brief': 'Client Brief',
  'strategy-brief': 'Strategy Brief',
  'campaign-strategy': 'Campaign Strategy',
  'content-calendar': 'Content Calendar',
  'campaign-copy': 'Campaign Copy',
  'creative-asset': 'Creative Asset',
  'media-plan': 'Media Plan',
  'budget-sheet': 'Budget Sheet',
  'kpi-forecast': 'KPI Forecast',
  'seo-audit': 'SEO Audit',
  'research-brief': 'Research Brief',
  'status-report': 'Status Report',
}

export const TOOL_OPTIONS = [
  { id: 'web-search', label: 'Web Search' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'code', label: 'Code Execution' },
  { id: 'image-gen', label: 'Image Generation' },
  { id: 'document', label: 'Document Writing' },
  { id: 'social', label: 'Social Media' },
]

export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return d.toLocaleDateString()
}
