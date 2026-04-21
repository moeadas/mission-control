import { loadEnvConfig } from '@next/env'

async function main() {
  const result = loadEnvConfig(process.cwd())
  console.log('LOAD_ENV_RESULT', JSON.stringify({ combinedEnvKeys: Object.keys(result.combinedEnv).filter((k) => k.includes('SUPABASE')).sort() }))
  console.log('HAS_URL', Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL))
  console.log('HAS_SECRET', Boolean(process.env.SUPABASE_SECRET_KEY))

  const mod = await import('@/lib/server/execution-queue')
  console.log('IMPORTED_QUEUE_KEYS', Object.keys(mod))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
