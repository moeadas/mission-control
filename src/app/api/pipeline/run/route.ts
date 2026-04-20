import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

import { buildTaskTitleFromRequest } from '@/lib/task-output'
import { getConfigPipelines, mergeDatabasePipelines } from '@/lib/pipeline-loader'
import { inferDeliverableType, inferRoutingContext } from '@/lib/server/ai'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'
import { getDeliverableSpec } from '@/lib/deliverables'
import { ensureTaskExecutionPersistence } from '@/lib/server/task-execution'
import { queueTaskExecution } from '@/lib/server/execution-queue'

export const dynamic = 'force-dynamic'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

async function getAgencyId() {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null
  const { data, error } = await supabase.from('agencies').select('id').eq('slug', 'default-agency').single()
  if (error) throw error
  return data.id as string
}

async function loadPipelines(agencyId: string) {
  const supabase = getSupabaseServerClient()
  if (!supabase) return getConfigPipelines()

  const { data, error } = await supabase
    .from('pipelines')
    .select('definition')
    .eq('agency_id', agencyId)
    .order('name', { ascending: true })

  if (error) throw error
  return mergeDatabasePipelines((data || []).map((row: any) => row.definition || {}).filter(Boolean))
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      description?: string
      clientId?: string
      language?: 'en' | 'ar'
      pipelineId?: string
    }

    const description = body.description?.trim()
    if (!description) {
      return NextResponse.json({ error: 'Task description is required.' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()
    const agencyId = await getAgencyId()
    if (!supabase || !agencyId) {
      return NextResponse.json({ error: 'Execution service unavailable.' }, { status: 503 })
    }

    const [{ data: agents, error: agentsError }, { data: clients, error: clientsError }, pipelines] = await Promise.all([
      supabase.from('agents').select('id, name, role, specialty, skills').eq('agency_id', agencyId).order('name', { ascending: true }),
      supabase.from('clients').select('id, name, industry').eq('agency_id', agencyId).order('name', { ascending: true }),
      loadPipelines(agencyId),
    ])

    if (agentsError) throw agentsError
    if (clientsError) throw clientsError

    const deliverableType = inferDeliverableType(description)
    const spec = getDeliverableSpec(deliverableType)
    const routing = inferRoutingContext({
      content: description,
      clientHints: (clients || []).map((client: any) => ({
        id: client.id,
        name: client.name || '',
        industry: client.industry || '',
      })),
      agents: (agents || []).map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        specialty: agent.specialty || '',
        role: agent.role || '',
        skills: Array.isArray(agent.skills) ? agent.skills : [],
      })),
    })

    const pipeline =
      (body.pipelineId ? pipelines.find((entry: any) => entry.id === body.pipelineId) : null) ||
      (routing.pipelineId ? pipelines.find((entry: any) => entry.id === routing.pipelineId) : null) ||
      (spec.pipelineId ? pipelines.find((entry: any) => entry.id === spec.pipelineId) : null) ||
      null

    const taskId = uuidv4()
    const assignedAgentIds = Array.from(
      new Set(['iris', routing.routedAgentId, ...routing.collaboratorAgentIds].filter(Boolean))
    )
    const executionMode = pipeline ? 'pipeline' : 'direct'

    await ensureTaskExecutionPersistence({
      taskId,
      auth,
      title: buildTaskTitleFromRequest(description, deliverableType),
      summary: description,
      deliverableType,
      ownerUserId: auth.userId,
      assignedBy: 'pipeline-runner',
      clientId: body.clientId || routing.clientId || null,
      leadAgentId: routing.routedAgentId,
      collaboratorAgentIds: routing.collaboratorAgentIds,
      assignedAgentIds,
      pipelineId: pipeline?.id || null,
      pipelineName: pipeline?.name || 'Direct Specialist Execution',
      orchestrationTrace: [
        pipeline
          ? `Pipeline Runner launched ${pipeline.name}.`
          : `Pipeline Runner launched direct specialist execution for ${spec.label.toLowerCase()} work.`,
        routing.routingReason,
      ],
      handoffNotes: pipeline
        ? `Pipeline Runner started ${pipeline.name} for ${spec.label.toLowerCase()} work.`
        : `Pipeline Runner started direct specialist execution for ${spec.label.toLowerCase()} work because no formal pipeline is wired yet.`,
      status: 'queued',
      priority: spec.complexity === 'high' ? 'high' : 'medium',
      progress: 0,
      complexity: spec.complexity,
      channelingConfidence: routing.confidence,
    })

    const job = await queueTaskExecution(taskId, auth, 'retry')

    return NextResponse.json(
      {
        ok: true,
        taskId,
        deliverableType,
        executionMode,
        pipeline: pipeline
          ? {
              id: pipeline.id,
              name: pipeline.name,
              phases: pipeline.phases || [],
            }
          : null,
        routing,
        job,
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('[POST /api/pipeline/run]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to launch pipeline run.',
      },
      { status: 500 }
    )
  }
}
