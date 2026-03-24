import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export interface SkillDefinition {
  id: string
  name: string
  description: string
  category: string
  prompts: {
    en?: string
    ar?: string
  }
  variables?: string[]
  inputs?: string[]
  outputs?: string[]
  checklist?: string[]
  examples?: {
    input: string
    output: string
  }[]
  metadata?: {
    author?: string
    version?: string
    tags?: string[]
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
  }
}

export interface SkillCategory {
  id: string
  name: string
  skills: SkillDefinition[]
}

interface SkillsState {
  categories: SkillCategory[]
  skillsMap: Record<string, SkillDefinition> // flat map for quick lookup
  isLoaded: boolean

  loadSkills: () => Promise<void>
  getSkill: (id: string) => SkillDefinition | undefined
  getSkillsByCategory: (categoryId: string) => SkillDefinition[]
  addSkill: (skill: SkillDefinition) => void
  updateSkill: (id: string, updates: Partial<SkillDefinition>) => void
  deleteSkill: (id: string) => void
  addCategory: (category: Omit<SkillCategory, 'skills'>) => void
  getAllSkills: () => SkillDefinition[]
}

export const useSkillsStore = create<SkillsState>()(
  persist(
    (set, get) => ({
      categories: [],
      skillsMap: {},
      isLoaded: false,

      loadSkills: async () => {
        if (get().isLoaded) return
        try {
          // Dynamically load all skill JSON files
          const skillIds = [
            // Strategy & Planning
            'brand-strategy', 'campaign-planning', 'go-to-market-strategy', 'competitive-analysis',
            'market-segmentation', 'audience-persona-creation', 'consumer-journey-mapping',
            'value-proposition', 'positioning-framework', 'swot-analysis', 'porter-five-forces',
            'category-design', 'differentiation-strategy', 'insight-mining', 'trend-analysis',
            'strategic-planning',
            // Creative & Copy
            'creative-concept-development', 'art-direction', 'visual-leadership', 'brand-consistency',
            'creative-briefing', 'cross-channel-adaptation', 'creative-quality', 'concept-testing',
            'creative-iteration', 'design-systems', 'brand-guidelines', 'visual-storytelling',
            'creative-strategy', 'typography', 'color-theory', 'composition',
            'campaign-copywriting', 'brand-voice', 'direct-response-copy', 'content-calendars',
            'platform-native-content', 'seo-copywriting', 'headline-writing', 'cta-optimization',
            'long-form-copy', 'short-form-copy', 'social-copy', 'email-copy', 'ad-copy',
            'landing-page-copy', 'tone-adaptation', 'persuasion-writing',
            // Project & Traffic Management
            'task-triaging', 'workflow-design', 'cross-functional-coordination', 'priority-management',
            'brief-synthesis', 'timeline-planning', 'risk-assessment', 'stakeholder-communication',
            'delegation', 'status-reporting', 'agenda-setting', 'meeting-facilitation',
            'resource-optimization', 'bottleneck-identification', 'escalation-management',
            'project-scheduling', 'traffic-coordination', 'resource-allocation', 'capacity-planning',
            'scope-management', 'change-control', 'critical-path-analysis', 'deadline-management',
            'quality-assurance', 'workflow-optimization', 'agile-scrum', 'waterfall-planning',
            'burndown-tracking', 'stakeholder-management',
            // Media & Advertising
            'media-strategy', 'channel-selection', 'budget-allocation', 'audience-targeting',
            'campaign-setup', 'bid-management', 'pacing-optimization', 'cross-channel',
            'attribution-modeling', 'roas-optimization', 'programmatic', 'display-advertising',
            'video-advertising', 'social-advertising', 'search-advertising', 'connected-tv',
            'performance-analysis', 'ab-test-design', 'statistical-analysis', 'roi-calculation',
            'dashboard-creation', 'trend-identification', 'conversion-optimization', 'funnel-analysis',
            'cohort-analysis', 'predictive-analytics', 'optimization-strategy',
            // Research & Insights
            'market-research', 'competitive-intelligence', 'consumer-insights', 'seo-research',
            'seo-audit', 'keyword-research', 'data-synthesis', 'survey-design',
            'industry-landscape', 'benchmarking', 'data-visualization', 'audience-research',
            'brand-equity', 'category-analysis', 'report-writing', 'hypothesis-testing',
            // Client Services & Account Management
            'client-relationship-management', 'strategic-account-planning', 'presentation-design',
            'public-speaking', 'negotiation', 'expectation-management', 'scope-management',
            'contract-discussion', 'stakeholder-mapping', 'upselling', 'client-onboarding',
            'client-offboarding', 'feedback-synthesis', 'rapport-building', 'account-health',
            // Operations & Productivity
            'account-management-framework', 'operations-management', 'tool-integration',
            'documentation', 'knowledge-management', 'process-improvement',
          ]

          const categories: SkillCategory[] = [
            { id: 'strategy', name: 'Strategy & Planning', skills: [] },
            { id: 'creative', name: 'Creative & Copy', skills: [] },
            { id: 'project-management', name: 'Project & Traffic Management', skills: [] },
            { id: 'media', name: 'Media & Advertising', skills: [] },
            { id: 'research', name: 'Research & Insights', skills: [] },
            { id: 'client-services', name: 'Client Services & Account Management', skills: [] },
            { id: 'operations', name: 'Operations & Productivity', skills: [] },
          ]

          const skillsMap: Record<string, SkillDefinition> = {}
          const categoryMap: Record<string, SkillCategory> = {}
          for (const cat of categories) categoryMap[cat.id] = cat

          // Load from the big library file first
          try {
            const lib = await import('@/config/skills/skills-library.json')
            for (const cat of lib.default.skillCategories) {
              const targetCat = categories.find(c => c.id === cat.id)
              if (targetCat) {
                targetCat.skills = cat.skills.map((s: any) => {
                  const skill: SkillDefinition = {
                    id: s.id,
                    name: s.name,
                    description: s.description,
                    category: targetCat.id,
                    prompts: { en: '' },
                    variables: [],
                    inputs: [],
                    outputs: [],
                  }
                  skillsMap[s.id] = skill
                  return skill
                })
              }
            }
          } catch (e) {
            // No library file, fall back to individual files
          }

          // Override/merge with individual skill files if they exist
          for (const id of skillIds) {
            try {
              const mod = await import(`@/config/skills/${id}.json`)
              const skill: SkillDefinition = mod.default
              skillsMap[skill.id] = skill
              const cat = categoryMap[skill.category]
              if (cat) {
                const existing = cat.skills.findIndex(s => s.id === skill.id)
                if (existing >= 0) {
                  cat.skills[existing] = skill
                } else {
                  cat.skills.push(skill)
                }
              }
            } catch {
              // Individual file doesn't exist, keep from library
            }
          }

          set({ categories, skillsMap, isLoaded: true })
        } catch (error) {
          console.error('Failed to load skills:', error)
          set({ isLoaded: true })
        }
      },

      getSkill: (id) => get().skillsMap[id],

      getSkillsByCategory: (categoryId) => {
        const cat = get().categories.find(c => c.id === categoryId)
        return cat?.skills || []
      },

      addSkill: (skill) => {
        const { categories, skillsMap } = get()
        let cat = categories.find(c => c.id === skill.category)
        if (!cat) {
          cat = { id: skill.category, name: skill.category, skills: [] }
          categories.push(cat)
        }
        cat.skills.push(skill)
        skillsMap[skill.id] = skill
        set({ categories: [...categories], skillsMap: { ...skillsMap } })
      },

      updateSkill: (id, updates) => {
        const { categories, skillsMap } = get()
        const skill = skillsMap[id]
        if (!skill) return
        const updated = { ...skill, ...updates }
        skillsMap[id] = updated
        const cat = categories.find(c => c.id === updated.category)
        if (cat) {
          const idx = cat.skills.findIndex(s => s.id === id)
          if (idx >= 0) cat.skills[idx] = updated
        }
        set({ categories: [...categories], skillsMap: { ...skillsMap } })
      },

      deleteSkill: (id) => {
        const { categories, skillsMap } = get()
        const skill = skillsMap[id]
        if (!skill) return
        delete skillsMap[id]
        const cat = categories.find(c => c.id === skill.category)
        if (cat) {
          cat.skills = cat.skills.filter(s => s.id !== id)
        }
        set({ categories: [...categories], skillsMap: { ...skillsMap } })
      },

      addCategory: (category) => {
        set(state => ({
          categories: [...state.categories, { ...category, skills: [] }]
        }))
      },

      getAllSkills: () => Object.values(get().skillsMap),
    }),
    {
      name: 'mission-control-skills',
      version: 1,
    }
  )
)
