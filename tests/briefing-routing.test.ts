import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyBriefAnswer,
  composeBriefedRequest,
  createPendingBrief,
  getBriefQuestion,
  isBriefComplete,
} from '../src/lib/iris-briefing'
import { resolvePipelineSelection } from '../src/lib/server/ai'
import { resolveTaskRoutingBlueprint } from '../src/lib/server/task-channeling'
import { buildTaskExecutionPlan } from '../src/lib/task-output'

test('content-calendar briefing advances through required fields and composes final request', () => {
  let brief = createPendingBrief(
    'Create a content calendar for Victory Genomics focused on equine karyotyping.',
    'content-calendar'
  )

  assert.ok(brief)
  assert.equal(getBriefQuestion(brief!)?.field, 'objective')

  brief = applyBriefAnswer(brief!, 'Awareness')
  assert.equal(getBriefQuestion(brief!)?.field, 'platforms')

  brief = applyBriefAnswer(brief!, 'Instagram + LinkedIn')
  assert.equal(getBriefQuestion(brief!)?.field, 'timeframe')

  brief = applyBriefAnswer(brief!, '30 days')
  assert.equal(getBriefQuestion(brief!)?.field, 'cadence')

  brief = applyBriefAnswer(brief!, '3x per week')
  assert.equal(isBriefComplete(brief!), true)

  const request = composeBriefedRequest(brief!)
  assert.match(request, /Confirmed brief:/)
  assert.match(request, /objective: Awareness/i)
  assert.match(request, /platforms: Instagram, LinkedIn/i)
  assert.match(request, /timeframe: 30 days/i)
  assert.match(request, /cadence: 3x per week/i)
})

test('routing blueprint and execution plan stay aligned for short-form copy', () => {
  const request = 'Write a short WhatsApp description for Victory Genomics.'
  const agents = [
    { id: 'echo', name: 'Echo', role: 'Copy Lead', specialty: 'copy', skills: ['copywriting'] },
    { id: 'maya', name: 'Maya', role: 'Strategist', specialty: 'strategy', skills: ['positioning'] },
    { id: 'iris', name: 'Iris', role: 'Operations Lead', specialty: 'operations', skills: [] },
  ]

  const blueprint = resolveTaskRoutingBlueprint({
    request,
    deliverableType: 'short-form-copy',
    agents,
  })
  const executionPlan = buildTaskExecutionPlan({
    request,
    deliverableType: 'short-form-copy',
    routedAgentId: blueprint.leadAgentId,
  })

  assert.equal(blueprint.leadAgentId, executionPlan.leadAgentId)
  assert.deepEqual(blueprint.collaboratorAgentIds, executionPlan.collaboratorAgentIds)
})

test('pipeline selection stays consistent across preferred, inferred, and spec fallback inputs', () => {
  const pipelines = [
    {
      id: 'content-calendar',
      name: 'Content Calendar',
      description: 'Plan and generate social calendar deliverables.',
      phases: [{ name: 'Ideas' }],
      estimatedDuration: '30m',
      clientProfileFields: [],
    },
  ]

  const selected = resolvePipelineSelection({
    content: 'Create a content calendar for Victory Genomics.',
    deliverableType: 'content-calendar',
    pipelines,
  })

  assert.equal(selected.pipelineId, 'content-calendar')
  assert.equal(selected.pipeline?.name, 'Content Calendar')
  assert.equal(selected.hint?.id, 'content-calendar')
})
