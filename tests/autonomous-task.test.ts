import test from 'node:test'
import assert from 'node:assert/strict'

import { __autonomousTaskTestables } from '../src/lib/server/autonomous-task'

test('relevant outputs prefer declared activity inputs', () => {
  const previousOutputs = {
    'approved-profile': 'Approved profile details',
    'selected-ideas': 'Selected content ideas',
    hooks: 'Hook library',
    unrelated: 'Do not prioritize this',
  }

  const relevant = __autonomousTaskTestables.getRelevantOutputs(
    {
      id: 'draft-posts',
      name: 'Draft Posts',
      inputs: ['selected-ideas', 'hooks'],
      outputs: ['drafted-posts'],
    } as any,
    previousOutputs
  )

  assert.deepEqual(relevant, {
    'selected-ideas': 'Selected content ideas',
    hooks: 'Hook library',
  })
})

test('relevant output summary falls back safely when no explicit inputs exist', () => {
  const summary = __autonomousTaskTestables.summarizeRelevantOutputs(
    {
      id: 'review-posts',
      name: 'Review Posts',
      outputs: ['approved-posts'],
    } as any,
    {
      'drafted-posts': 'Draft body',
      hooks: 'Hook body',
    }
  )

  assert.match(summary, /Summary of prior pipeline outputs:/)
  assert.match(summary, /### drafted-posts/)
  assert.match(summary, /### hooks/)
})

test('calendar post count follows cadence hints instead of always using full idea volume', () => {
  const count = __autonomousTaskTestables.estimateCalendarPostCount({
    posting_frequency: '3x per week',
    campaign_duration: '30 days',
  } as any)

  assert.equal(count, 12)
})

test('auto select ideas balances pillars and trims to requested cadence volume', () => {
  const ideas = {
    ideas: Array.from({ length: 15 }, (_, index) => ({
      id: `idea_${String(index + 1).padStart(2, '0')}`,
      title: `Idea ${index + 1}`,
      pillar: ['Educational', 'Storytelling', 'Engagement', 'Authority', 'Promotional'][index % 5],
      description: `Description ${index + 1}`,
      platform: 'Instagram',
      format: 'Carousel',
      difficulty: 'medium',
    })),
  }

  const selected = JSON.parse(
    __autonomousTaskTestables.autoSelectIdeas(JSON.stringify(ideas), {
      posting_frequency: '2x per week',
      campaign_duration: '30 days',
    } as any)
  )

  assert.equal(selected.selectedIdeas.length, 8)
  assert.ok(selected.selectedIdeas.every((idea: any) => idea.selected === true))
})

test('auto select ideas caps large calendars at 12 ideas to keep downstream drafting practical', () => {
  const ideas = {
    ideas: Array.from({ length: 24 }, (_, index) => ({
      id: `idea_${String(index + 1).padStart(2, '0')}`,
      title: `Idea ${index + 1}`,
      pillar: ['Educational', 'Storytelling', 'Engagement', 'Authority', 'Promotional'][index % 5],
      description: `Description ${index + 1}`,
      platform: 'Instagram',
      format: 'Carousel',
      difficulty: 'medium',
    })),
  }

  const selected = JSON.parse(
    __autonomousTaskTestables.autoSelectIdeas(JSON.stringify(ideas), {
      posting_frequency: '5x per week',
      campaign_duration: '60 days',
    } as any)
  )

  assert.equal(selected.selectedIdeas.length, 12)
})

test('review-posts auto approval passes drafted posts through unchanged', () => {
  const approved = __autonomousTaskTestables.autoApproveStage({
    activity: {
      id: 'review-posts',
      name: 'Review & Adjust Posts',
    } as any,
    previousOutputs: {
      'drafted-posts': '# Drafted posts',
    },
    clientProfile: {} as any,
  })

  assert.equal(approved, '# Drafted posts')
})

test('markdown post sections split on post headings for downstream batching', () => {
  const sections = __autonomousTaskTestables.splitMarkdownPostSections(`
# Title

### POST 3A-01: First
Body one

### POST 3A-02: Second
Body two
`)

  assert.equal(sections.length, 2)
  assert.match(sections[0], /POST 3A-01/)
  assert.match(sections[1], /POST 3A-02/)
})

test('draft-posts falls back to a synthetic draft when batch model call throws', async () => {
  const result = await __autonomousTaskTestables.generateActivityOutput({
    agent: { id: 'echo', name: 'Echo', role: 'copy' },
    request: 'Create a content calendar',
    clientContext: 'Victory Genomics',
    clientProfile: {
      brand_name: 'Victory Genomics',
      content_goal: 'Awareness',
    } as any,
    pipeline: { id: 'content-calendar', name: 'Content Calendar' } as any,
    phase: { id: 'drafting', name: 'Post Drafting' } as any,
    activity: {
      id: 'draft-posts',
      name: 'Draft Full Posts',
      batching: { batchSize: 5 },
    } as any,
    previousOutputs: {
      'selected-ideas': JSON.stringify({
        selectedIdeas: [
          {
            id: 'idea_01',
            title: 'What Is Karyotyping?',
            pillar: 'Educational',
            description: 'Explain equine karyotyping basics',
            platform: 'Instagram',
            format: 'Carousel',
          },
          {
            id: 'idea_02',
            title: 'Why Breeders Need It',
            pillar: 'Authority',
            description: 'Explain breeding value',
            platform: 'LinkedIn',
            format: 'Post',
          },
        ],
      }),
      hooks: `## Idea 1: What Is Karyotyping?\n**Format:** Instagram Carousel | **Pillar:** Educational\n| # | Formula | Hook |\n|---|---------|------|\n| 1 | Curiosity Gap | Most horse owners have never heard of this test. |\n\n## Idea 2: Why Breeders Need It\n**Format:** LinkedIn Post | **Pillar:** Authority\n| # | Formula | Hook |\n|---|---------|------|\n| 1 | Direct You | Breeders who skip chromosome screening risk expensive surprises. |`,
    },
    qualityChecklist: [],
    skillContext: 'copy',
    runtime: { provider: 'ollama', model: 'minimax-m2.7:cloud' },
    maxTokens: 4096,
    generateTextFn: async () => {
      throw new Error('Model call timed out after 120s.')
    },
  } as any)

  assert.match(result, /Victory Genomics — Draft Posts/)
  assert.match(result, /What Is Karyotyping\?/)
})

test('draft-posts synthesizes output directly from selected ideas and hooks', async () => {
  const result = await __autonomousTaskTestables.generateActivityOutput({
    agent: { id: 'echo', name: 'Echo', role: 'copy' },
    request: 'Create a content calendar',
    clientContext: 'Victory Genomics',
    clientProfile: {
      brand_name: 'Victory Genomics',
      content_goal: 'Awareness',
    } as any,
    pipeline: { id: 'content-calendar', name: 'Content Calendar' } as any,
    phase: { id: 'drafting', name: 'Post Drafting' } as any,
    activity: {
      id: 'draft-posts',
      name: 'Draft Full Posts',
      batching: { batchSize: 5 },
    } as any,
    previousOutputs: {
      'selected-ideas': JSON.stringify({
        selectedIdeas: [
          {
            id: 'idea_01',
            title: 'What Is Karyotyping?',
            pillar: 'Educational',
            description: 'Explain equine karyotyping basics',
            platform: 'Instagram',
            format: 'Carousel',
          },
        ],
      }),
      hooks: `## Idea 1: What Is Karyotyping?\n**Format:** Instagram Carousel | **Pillar:** Educational\n| # | Formula | Hook |\n|---|---------|------|\n| 1 | Curiosity Gap | Most horse owners have never heard of this test. |`,
    },
    qualityChecklist: [],
    skillContext: 'copy',
    runtime: { provider: 'ollama', model: 'minimax-m2.7:cloud' },
    maxTokens: 4096,
    generateTextFn: async () => {
      throw new Error('This should not be called for synthesized draft-posts.')
    },
  } as any)

  assert.match(result, /Victory Genomics — Draft Posts/)
  assert.match(result, /\*\*Hook used:\*\*/)
})

test('generate-hooks synthesizes hook output directly from selected ideas', async () => {
  const result = await __autonomousTaskTestables.generateActivityOutput({
    agent: { id: 'echo', name: 'Echo', role: 'copy' },
    request: 'Create a content calendar',
    clientContext: 'Victory Genomics',
    clientProfile: {
      brand_name: 'Victory Genomics',
      niche: 'equine karyotyping',
    } as any,
    pipeline: { id: 'content-calendar', name: 'Content Calendar' } as any,
    phase: { id: 'hooks', name: 'Hook Generation' } as any,
    activity: {
      id: 'generate-hooks',
      name: 'Generate Hooks per Idea',
    } as any,
    previousOutputs: {
      'selected-ideas': JSON.stringify({
        selectedIdeas: [
          {
            id: 'idea_01',
            title: 'What Is Equine Karyotyping?',
            pillar: 'Educational',
            description: 'Explain the science clearly',
            platform: 'Instagram',
            format: 'Carousel',
          },
        ],
      }),
    },
    qualityChecklist: [],
    skillContext: 'copy',
    runtime: { provider: 'ollama', model: 'minimax-m2.7:cloud' },
    maxTokens: 4096,
    generateTextFn: async () => {
      throw new Error('This should not be called for synthesized generate-hooks.')
    },
  } as any)

  assert.match(result, /## Hook Generation Output/)
  assert.match(result, /Victory Genomics \| equine karyotyping Content Calendar/)
  assert.match(result, /Curiosity Gap/)
})

test('generate-ideas synthesizes compact structured ideas without model calls', async () => {
  const result = await __autonomousTaskTestables.generateActivityOutput({
    agent: { id: 'echo', name: 'Echo', role: 'content-strategist' },
    request: 'Create a content calendar',
    clientContext: 'Victory Genomics',
    clientProfile: {
      brand_name: 'Victory Genomics',
      niche: 'equine karyotyping',
      platforms: 'Instagram, LinkedIn',
    } as any,
    pipeline: { id: 'content-calendar', name: 'Content Calendar' } as any,
    phase: { id: 'ideas', name: 'Content Ideas' } as any,
    activity: {
      id: 'generate-ideas',
      name: 'Generate 30 Content Ideas',
    } as any,
    previousOutputs: {},
    qualityChecklist: [],
    skillContext: 'content strategy',
    runtime: { provider: 'ollama', model: 'minimax-m2.7:cloud' },
    maxTokens: 4096,
    generateTextFn: async () => {
      throw new Error('This should not be called for synthesized generate-ideas.')
    },
  } as any)

  assert.match(result, /\"ideas\": \[/)
  assert.match(result, /Victory Genomics Lab Process/)
})

test('assemble-calendar synthesizes a structured schedule from approved posts', async () => {
  const result = await __autonomousTaskTestables.generateActivityOutput({
    agent: { id: 'echo', name: 'Echo', role: 'content-strategist' },
    request: 'Create a content calendar',
    clientContext: 'Victory Genomics',
    clientProfile: {
      brand_name: 'Victory Genomics',
      content_goal: 'Awareness',
    } as any,
    pipeline: { id: 'content-calendar', name: 'Content Calendar' } as any,
    phase: { id: 'assembly', name: 'Calendar Assembly' } as any,
    activity: {
      id: 'assemble-calendar',
      name: 'Build 30-Day Calendar',
    } as any,
    previousOutputs: {
      'approved-posts': `# Victory Genomics — Draft Posts

### POST 01: What Is Equine Karyotyping?
**Platform:** Instagram
**Format:** Carousel
**Hook used:** What if chromosome insight changed your next breeding decision?

**Draft Caption:**
> What if chromosome insight changed your next breeding decision?
> Explain the science clearly for breeders.

CTA: Invite the audience to learn more about Victory Genomics and equine karyotyping.`,
    },
    qualityChecklist: [],
    skillContext: 'content strategy',
    runtime: { provider: 'ollama', model: 'minimax-m2.7:cloud' },
    maxTokens: 4096,
    generateTextFn: async () => {
      throw new Error('This should not be called for synthesized assemble-calendar.')
    },
  } as any)

  assert.match(result, /\"date\":/)
  assert.match(result, /"title": "What Is Equine Karyotyping\?"/)
})

test('client profile map infers brand name from freeform request context', () => {
  const profile = __autonomousTaskTestables.buildClientProfileMap(
    'Create a content calendar for Victory Genomics focused on equine karyotyping.'
  )

  assert.equal(profile.brand_name, 'Victory Genomics')
})

test('content calendar final deliverable can be assembled directly from pipeline outputs', () => {
  const result = __autonomousTaskTestables.buildCalendarDeliverableFromPipelineOutputs({
    clientProfile: {
      brand_name: 'Victory Genomics',
      platforms: 'Instagram, LinkedIn',
      content_goal: 'Awareness',
    } as any,
    pipelineOutputs: {
      'selected-ideas': JSON.stringify({
        selectedIdeas: [
          { id: 'idea_01', pillar: 'Educational' },
          { id: 'idea_02', pillar: 'Storytelling' },
        ],
      }),
      calendar: JSON.stringify([
        {
          date: '2026-04-01',
          platform: 'Instagram',
          pillar: 'Educational',
          title: 'What Is Karyotyping?',
          hook: 'What if your horse DNA holds the missing clue?',
          cta: 'Book a consultation',
          format: 'Carousel',
          objective: 'Awareness',
        },
      ]),
      'adapted-posts': '# Cross-Platform Adaptations',
      hashtags: '# Hashtags & Keywords',
      'visual-briefs': '[]',
    },
  })

  assert.match(result, /^# Victory Genomics Content Calendar/m)
  assert.match(result, /^## Strategy Summary$/m)
  assert.match(result, /^\| Week\/Date \| Channel \| Theme \| Post Idea \| Hook \| CTA \| Asset Type \| Objective \|$/m)
  assert.match(result, /Cross-platform adaptations prepared/)
})
