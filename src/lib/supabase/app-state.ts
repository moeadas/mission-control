import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { AppPersistenceSnapshot } from '@/lib/agents-store'
import { syncSnapshotToRelationalTables } from '@/lib/supabase/relational-sync'

const APP_STATE_TABLE = 'mission_control_state'
const DEFAULT_AGENCY_ID = 'default-agency'

interface SupabaseStateRow {
  agency_id: string
  state: AppPersistenceSnapshot
  updated_at?: string
}

export async function loadSharedAppState(agencyId = DEFAULT_AGENCY_ID): Promise<SupabaseStateRow | null> {
  const supabase = getSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from(APP_STATE_TABLE)
    .select('agency_id, state, updated_at')
    .eq('agency_id', agencyId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as SupabaseStateRow | null) || null
}

export async function saveSharedAppState(
  state: AppPersistenceSnapshot,
  agencyId = DEFAULT_AGENCY_ID
): Promise<SupabaseStateRow | null> {
  const supabase = getSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from(APP_STATE_TABLE)
    .upsert(
      {
        agency_id: agencyId,
        state,
      },
      { onConflict: 'agency_id' }
    )
    .select('agency_id, state, updated_at')
    .single()

  if (error) {
    throw error
  }

  await syncSnapshotToRelationalTables(state)

  return data as SupabaseStateRow
}
