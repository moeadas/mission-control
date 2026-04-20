import type { AuthContext } from '@/lib/supabase/auth'
import { insertTaskRun, loadTaskExecutionState, runTaskExecution } from '@/lib/server/task-execution'

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
}

const EXECUTION_JOB_STAGE = 'execution-job'

function isExecutionJobRun(run: any) {
  return run?.stage === EXECUTION_JOB_STAGE
}

function mapRunToJobState(run: any): QueueJobState | null {
  if (!run || !isExecutionJobRun(run)) return null

  const payload = {
    ...(run.input_payload || {}),
    ...(run.output_payload || {}),
  }

  return {
    taskId: run.task_id,
    action: payload.action === 'resume' ? 'resume' : 'retry',
    status: run.status === 'in_progress' ? 'running' : run.status,
    startedBy: payload.startedBy || payload.userId || 'unknown',
    queuedAt: payload.queuedAt || run.created_at,
    startedAt: payload.startedAt || run.started_at || undefined,
    completedAt: payload.completedAt || run.completed_at || undefined,
    error: run.error_message || payload.error || undefined,
  }
}

async function recordExecutionJob(
  taskId: string,
  auth: AuthContext,
  action: 'retry' | 'resume',
  status: QueueStatus,
  extra: Partial<QueueJobState> = {}
) {
  const timestamp = new Date().toISOString()
  const outputPayload = {
    action,
    startedBy: auth.userId,
    queuedAt: extra.queuedAt || timestamp,
    startedAt: extra.startedAt,
    completedAt: extra.completedAt,
    status,
    error: extra.error,
  }

  return insertTaskRun({
    taskId,
    stage: EXECUTION_JOB_STAGE,
    status: status === 'running' ? 'in_progress' : status,
    inputPayload: {
      action,
      startedBy: auth.userId,
      queuedAt: extra.queuedAt || timestamp,
    },
    outputPayload,
    errorMessage: extra.error || null,
    startedAt: status === 'running' ? extra.startedAt || timestamp : null,
    completedAt:
      status === 'completed' || status === 'failed'
        ? extra.completedAt || timestamp
        : null,
  })
}

export async function getExecutionJobState(taskId: string, auth: AuthContext) {
  const state = await loadTaskExecutionState(taskId, auth)
  if (!state) return null

  const latestJobRun = (state.runs || []).find((run) => isExecutionJobRun(run))
  return mapRunToJobState(latestJobRun)
}

async function runQueuedTask(taskId: string, auth: AuthContext, action: 'retry' | 'resume', queuedAt: string) {
  const startedAt = new Date().toISOString()
  await recordExecutionJob(taskId, auth, action, 'running', { queuedAt, startedAt })

  try {
    await runTaskExecution(taskId, auth, action)
    await recordExecutionJob(taskId, auth, action, 'completed', {
      queuedAt,
      startedAt,
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    await recordExecutionJob(taskId, auth, action, 'failed', {
      queuedAt,
      startedAt,
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Task execution failed.',
    })
  }
}

export async function queueTaskExecution(taskId: string, auth: AuthContext, action: 'retry' | 'resume' = 'retry') {
  const existing = await getExecutionJobState(taskId, auth)
  if (existing && (existing.status === 'queued' || existing.status === 'running')) {
    return existing
  }

  const queuedAt = new Date().toISOString()
  const job: QueueJobState = {
    taskId,
    action,
    status: 'queued',
    startedBy: auth.userId,
    queuedAt,
  }

  await recordExecutionJob(taskId, auth, action, 'queued', { queuedAt })
  void Promise.resolve().then(() => runQueuedTask(taskId, auth, action, queuedAt))

  return job
}
