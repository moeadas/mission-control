import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ClientProfileField {
  id: string
  label: string
  type: string
  required: boolean
  options?: string[]
}

export interface Activity {
  id: string
  name: string
  description: string
  assignedRole: string
  inputs: string[]
  outputs: string[]
  checklist: string[]
  prompts?: {
    en: string
    ar?: string
  }
  batching?: {
    batchSize: number
    parallel: boolean
  }
}

export interface Phase {
  id: string
  name: string
  color: string
  activities: Activity[]
}

export interface Pipeline {
  id: string
  name: string
  description: string
  version: string
  isDefault: boolean
  estimatedDuration: string
  clientProfileFields: ClientProfileField[]
  weeklyArc?: string
  phases: Phase[]
}

interface PipelinesState {
  pipelines: Pipeline[]
  isLoaded: boolean
  loadPipelines: () => Promise<void>
  getPipeline: (id: string) => Pipeline | undefined
  addPipeline: (pipeline: Pipeline) => void
  updatePipeline: (id: string, updates: Partial<Pipeline>) => void
  deletePipeline: (id: string) => void
}

export const usePipelinesStore = create<PipelinesState>()(
  persist(
    (set, get) => ({
      pipelines: [],
      isLoaded: false,

      loadPipelines: async () => {
        if (get().isLoaded) return
        try {
          const modules = await import('@/config/pipelines/pipelines.json')
          set({ pipelines: modules.default.pipelines, isLoaded: true })
        } catch (error) {
          console.error('Failed to load pipelines:', error)
          set({ isLoaded: true })
        }
      },

      getPipeline: (id) => get().pipelines.find(p => p.id === id),

      addPipeline: (pipeline) => {
        set(state => ({ pipelines: [...state.pipelines, pipeline] }))
      },

      updatePipeline: (id, updates) => {
        set(state => ({
          pipelines: state.pipelines.map(p => p.id === id ? { ...p, ...updates } : p)
        }))
      },

      deletePipeline: (id) => {
        set(state => ({ pipelines: state.pipelines.filter(p => p.id !== id) }))
      },
    }),
    {
      name: 'mission-control-pipelines',
      version: 1,
    }
  )
)
