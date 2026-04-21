import { loadEnvConfig } from '@next/env'

async function main() {
  loadEnvConfig(process.cwd())
  const { processNextExecutionJob, getExecutionJobState } = await import('@/lib/server/execution-queue')
  const { resolveAuthContextFromUserId } = await import('@/lib/supabase/auth')
  const auth = await resolveAuthContextFromUserId('510ae2a2-d954-46bb-ac14-0b5ff35672a8')
  console.log('AUTH', Boolean(auth), auth?.userId)
  if (auth) {
    const before = await getExecutionJobState('c614faf5-4825-45ea-bd32-1187f8ab5d8a', auth)
    console.log('BEFORE', JSON.stringify(before, null, 2))
  }
  const result = await processNextExecutionJob('debug-worker')
  console.log('RESULT', JSON.stringify(result, null, 2))
  if (auth) {
    const after = await getExecutionJobState('c614faf5-4825-45ea-bd32-1187f8ab5d8a', auth)
    console.log('AFTER', JSON.stringify(after, null, 2))
  }
}

main().catch((error) => {
  console.error('DEBUG_QUEUE_ERROR', error)
  process.exit(1)
})
