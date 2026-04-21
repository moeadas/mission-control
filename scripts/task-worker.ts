import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const idleDelayMs = Number(process.env.MISSION_CONTROL_WORKER_IDLE_MS || 1500)
const errorDelayMs = Number(process.env.MISSION_CONTROL_WORKER_ERROR_MS || 5000)

let shuttingDown = false

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  const { buildExecutionWorkerId, processNextExecutionJob } = await import('../src/lib/server/execution-queue')
  const workerId = buildExecutionWorkerId()

  console.log(`[task-worker] started ${workerId}`)

  while (!shuttingDown) {
    try {
      const job = await processNextExecutionJob(workerId)
      if (!job) {
        await sleep(idleDelayMs)
      }
    } catch (error) {
      console.error('[task-worker] loop error', error)
      await sleep(errorDelayMs)
    }
  }

  console.log(`[task-worker] stopped ${workerId}`)
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    shuttingDown = true
  })
}

void run()
