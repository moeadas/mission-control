import type { AuthContext } from '@/lib/supabase/auth'
import { resolveAuthContextFromUserId } from '@/lib/supabase/auth'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSuperAdminEmail } from '@/lib/supabase/auth'
import { loadTaskExecutionState, runTaskExecution } from '@/lib/server/task-execution'

type QueueStatus = 'queued' | 'running' | 'completed' | 'failed'

interface QueueJobState {
  taskId: string
  action: 'retry' | 'resume'
  status: QueueStatus
  startedBy: string
  queuedAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  runId?: string
  workerId?: string
  heartbeatAt?: string
}

interface PersistedJobRun {
  id: string
  task_id: string
  stage: string
  status: string
  agent_id?: string | null
  created_at: string
  started_at?: string | null
  completed_at?: string | null
  error_message?: string | null
  input_payload?: Record<string, any> | null
  output_payload?: Record<string, any> | null
}

const EXECUTION_JOB_STAGE = 'execution-job'
const JOB_HEARTBEAT_MS = 10_000
const JOB_STALE_MS = 15 * 60_000

function isExecutionJobRun(run: any) {
  return run?.stage === EXECUTION_JOB_STAGE
}

async function getAgencyId() {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null
  const { data, error } = await supabase.from('agencies').select('id').eq('slug', 'default-agency').maybeSingle()
  if (error) throw error
  return data?.id || null
}

function mapRunToJobState(run: PersistedJobRun | any): QueueJobState | null {
  if (!run || !isExecutionJobRun(run)) return null

  const payload = {
    ...(run.input_payload || {}),
    ...(run.output_payload || {}),
  }

  return {
    runId: run.id,
    taskId: run.task_id,
    action: payload.action === 'resume' ? 'resume' : 'retry',
    status: run.status === 'in_progress' ? 'running' : run.status,
    startedBy: payload.startedBy || payload.userId || 'unknown',
    queuedAt: payload.queuedAt || run.created_at,
    startedAt: payload.startedAt || run.started_at || undefined,
    completedAt: payload.completedAt || run.completed_at || undefined,
    error: run.error_message || payload.error || undefined,
    workerId: payload.workerId || undefined,
    heartbeatAt: payload.heartbeatAt || undefined,
  }
}

async function listExecutionJobRuns(statuses: Array<'queued' | 'in_progress'>, limit = 25) {
  const supabase = getSupabaseServerClient()
  const agencyId = await getAgencyId()
  if (!supabase || !agencyId) return []

  const { data, error } = await supabase
    .from('task_runs')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('stage', EXECUTION_JOB_STAGE)
    .in('status', statuses)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data || []) as PersistedJobRun[]
}

async function updateExecutionJobRun(
  runId: string,
  expectedStatus: 'queued' | 'in_progress',
  patch: {
    status?: 'queued' | 'in_progress' | 'completed' | 'failed'
    startedAt?: string | null
    completedAt?: string | null
    error?: string | null
    payloadPatch?: Record<string, any>
  }
) {
  const supabase = getSupabaseServerClient()
  const agencyId = await getAgencyId()
  if (!supabase || !agencyId) return null

  const { data: existing, error: existingError } = await supabase
    .from('task_runs')
    .select('id, status, output_payload, started_at')
    .eq('agency_id', agencyId)
    .eq('id', runId)
    .eq('stage', EXECUTION_JOB_STAGE)
    .eq('status', expectedStatus)
    .maybeSingle()

  if (existingError) throw existingError
  if (!existing) return null

  const nextOutputPayload = {
    ...(existing.output_payload || {}),
    ...(patch.payloadPatch || {}),
  }

  const { data, error } = await supabase
    .from('task_runs')
    .update({
      status: patch.status || existing.status,
      output_payload: nextOutputPayload,
      error_message: patch.error ?? null,
      started_at: patch.startedAt ?? existing.started_at ?? null,
      completed_at: patch.completedAt ?? null,
    })
    .eq('agency_id', agencyId)
    .eq('id', runId)
    .eq('status', expectedStatus)
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data as PersistedJobRun | null
}

async function insertQueuedExecutionJob(taskId: string, auth: AuthContext, action: 'retry' | 'resume', queuedAt: string) {
  const supabase = getSupabaseServerClient()
  const agencyId = await getAgencyId()
  if (!supabase || !agencyId) return null

  const { data, error } = await supabase
    .from('task_runs')
    .insert({
      agency_id: agencyId,
      task_id: taskId,
      stage: EXECUTION_JOB_STAGE,
      status: 'queued',
      input_payload: {
        action,
        startedBy: auth.userId,
        queuedAt,
      },
      output_payload: {
        action,
        startedBy: auth.userId,
        queuedAt,
        status: 'queued',
      },
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as PersistedJobRun
}

export async function getExecutionJobState(taskId: string, auth: AuthContext) {
  const state = await loadTaskExecutionState(taskId, auth)
  if (!state) return null

  const latestJobRun = (state.runs || []).find((run) => isExecutionJobRun(run))
  return mapRunToJobState(latestJobRun)
}

function isStaleHeartbeat(job: QueueJobState) {
  if (job.status !== 'running') return false
  const heartbeatAt = job.heartbeatAt || job.startedAt || job.queuedAt
  if (!heartbeatAt) return false
  return Date.now() - new Date(heartbeatAt).getTime() > JOB_STALE_MS
}

async function findNextRunnableJob() {
  const queuedRuns = await listExecutionJobRuns(['queued'], 25)
  const queuedJob = queuedRuns.map(mapRunToJobState).find(Boolean)
  if (queuedJob) return queuedJob

  const runningRuns = await listExecutionJobRuns(['in_progress'], 25)
  const staleRunningJob = runningRuns.map(mapRunToJobState).find((job) => Boolean(job && isStaleHeartbeat(job)))
  return staleRunningJob || null
}

async function claimExecutionJob(job: QueueJobState, workerId: string) {
  const now = new Date().toISOString()
  const expectedStatus = job.status === 'queued' ? 'queued' : 'in_progress'

  const claimed = await updateExecutionJobRun(job.runId!, expectedStatus, {
    status: 'in_progress',
    startedAt: job.startedAt || now,
    payloadPatch: {
      action: job.action,
      startedBy: job.startedBy,
      queuedAt: job.queuedAt,
      startedAt: job.startedAt || now,
      workerId,
      heartbeatAt: now,
      recoveredAt: job.status === 'running' ? now : undefined,
      status: 'running',
    },
  })

  return claimed ? mapRunToJobState(claimed) : null
}

async function heartbeatExecutionJob(runId: string, workerId: string) {
  await updateExecutionJobRun(runId, 'in_progress', {
    status: 'in_progress',
    payloadPatch: {
      workerId,
      heartbeatAt: new Date().toISOString(),
      status: 'running',
    },
  })
}

async function completeExecutionJob(job: QueueJobState, workerId: string) {
  await updateExecutionJobRun(job.runId!, 'in_progress', {
    status: 'completed',
    completedAt: new Date().toISOString(),
    payloadPatch: {
      workerId,
      heartbeatAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'completed',
    },
  })
}

async function failExecutionJob(job: QueueJobState, workerId: string, error: string) {
  await updateExecutionJobRun(job.runId!, 'in_progress', {
    status: 'failed',
    completedAt: new Date().toISOString(),
    error,
    payloadPatch: {
      workerId,
      heartbeatAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      error,
      status: 'failed',
    },
  })
}

export async function queueTaskExecution(taskId: string, auth: AuthContext, action: 'retry' | 'resume' = 'retry') {
  const existing = await getExecutionJobState(taskId, auth)
  if (existing && (existing.status === 'queued' || existing.status === 'running')) {
    return existing
  }

  const queuedAt = new Date().toISOString()
  const run = await insertQueuedExecutionJob(taskId, auth, action, queuedAt)
  return mapRunToJobState(run)!
}

export async function processNextExecutionJob(workerId: string) {
  const nextJob = await findNextRunnableJob()
  if (!nextJob) return null

  const claimedJob = await claimExecutionJob(nextJob, workerId)
  if (!claimedJob) return null

  const auth = await resolveAuthContextFromUserId(claimedJob.startedBy)
  if (!auth) {
    await failExecutionJob(claimedJob, workerId, 'Execution worker could not resolve the task owner session context.')
    return claimedJob
  }

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  try {
    heartbeatTimer = setInterval(() => {
      void heartbeatExecutionJob(claimedJob.runId!, workerId)
    }, JOB_HEARTBEAT_MS)

    await runTaskExecution(claimedJob.taskId, auth, claimedJob.action === 'resume' ? 'resume' : 'retry')
    await completeExecutionJob(claimedJob, workerId)
  } catch (error) {
    await failExecutionJob(
      claimedJob,
      workerId,
      error instanceof Error ? error.message : 'Task execution failed.'
    )
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
  }

  return claimedJob
}

export async function waitForIdleExecutionQueue(options?: { timeoutMs?: number; pollIntervalMs?: number }) {
  const timeoutMs = options?.timeoutMs ?? 120_000
  const pollIntervalMs = options?.pollIntervalMs ?? 1_000
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const nextJob = await findNextRunnableJob()
    if (!nextJob) return true
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  return false
}

export function buildExecutionWorkerId() {
  return `worker:${process.pid}:${Date.now()}`
}

export function getExecutionWorkerLabel() {
  return process.env.MISSION_CONTROL_EXECUTION_WORKER_NAME || getSuperAdminEmail()
}
