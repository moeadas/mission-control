// Pipeline Loader - Loads predefined pipelines from config
import pipelinesJson from '@/config/pipelines/pipelines.json'
import contentCalendar from '@/config/pipelines/content-calendar.json'
import adCreative from '@/config/pipelines/ad-creative.json'
import campaignBrief from '@/config/pipelines/campaign-brief.json'
import competitorResearch from '@/config/pipelines/competitor-research.json'
import mediaPlan from '@/config/pipelines/media-plan.json'
import seoAudit from '@/config/pipelines/seo-audit.json'

export interface PipelineActivity {
  id: string
  name: string
  description: string
  assignedRole: string
  inputs: string[]
  outputs: string[]
  checklist: string[]
}

export interface PipelinePhase {
  id: string
  name: string
  color: string
  activities: PipelineActivity[]
}

export interface Pipeline {
  id: string
  name: string
  description: string
  version: string
  isDefault: boolean
  estimatedDuration: string
  phases: PipelinePhase[]
}

const CONFIG_PIPELINE_OVERRIDES = [
  contentCalendar,
  adCreative,
  campaignBrief,
  competitorResearch,
  mediaPlan,
  seoAudit,
] as const

export function getConfigPipelines(): Pipeline[] {
  const basePipelines = Array.isArray(pipelinesJson.pipelines) ? [...pipelinesJson.pipelines] : []
  const merged = new Map<string, any>(basePipelines.map((pipeline: any) => [pipeline.id, pipeline]))

  for (const override of CONFIG_PIPELINE_OVERRIDES) {
    const current = merged.get(override.id) || {}
    merged.set(override.id, {
      ...current,
      ...override,
      clientProfileFields: override.clientProfileFields || current.clientProfileFields || [],
      phases: override.phases || current.phases || [],
    })
  }

  return Array.from(merged.values()) as Pipeline[]
}

export function mergeDatabasePipelines(dbPipelines: any[]): Pipeline[] {
  const merged = new Map<string, any>((Array.isArray(dbPipelines) ? dbPipelines : []).map((pipeline: any) => [pipeline.id, pipeline]))

  for (const configPipeline of getConfigPipelines()) {
    const current = merged.get(configPipeline.id) || {}
    merged.set(configPipeline.id, {
      ...current,
      ...configPipeline,
      clientProfileFields: (configPipeline as any).clientProfileFields || current.clientProfileFields || [],
      phases: configPipeline.phases || current.phases || [],
    })
  }

  return Array.from(merged.values()) as Pipeline[]
}

// Dynamic import style preserved for callers expecting async
export async function loadPipelines(): Promise<Pipeline[]> {
  try {
    return getConfigPipelines()
  } catch (error) {
    console.error('Failed to load pipelines:', error)
    return []
  }
}

export async function getPipelineById(id: string): Promise<Pipeline | null> {
  const pipelines = await loadPipelines()
  return pipelines.find(p => p.id === id) || null
}

export async function getDefaultPipelines(): Promise<Pipeline[]> {
  const pipelines = await loadPipelines()
  return pipelines.filter(p => p.isDefault)
}
