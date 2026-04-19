import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'
import { loadConfigSkillCategories, mergeDbSkillsWithConfig } from '@/lib/server/skills-catalog'

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

async function buildFallbackSkills() {
  const categories = await loadConfigSkillCategories()
  return categories.flatMap((category) => category.skills)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseServerClient()
    const agencyId = await getAgencyId()
    if (!supabase || !agencyId) return NextResponse.json(await buildFallbackSkills())

    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('agency_id', agencyId)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    const categories = await mergeDbSkillsWithConfig(data || [])
    return NextResponse.json(categories.flatMap((category) => category.skills))
  } catch (error) {
    console.error('Failed to load skills:', error)
    return NextResponse.json({ error: 'Failed to load skills' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth || auth.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const skill = await request.json()
    if (!skill.id || !skill.name) {
      return NextResponse.json({ error: 'Skill id and name are required' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()
    const agencyId = await getAgencyId()
    if (!supabase || !agencyId) return NextResponse.json({ error: 'Supabase not available' }, { status: 503 })

    const payload = {
      id: skill.id,
      agency_id: agencyId,
      name: skill.name,
      category: skill.category,
      description: skill.description || '',
      prompts: skill.prompts || { en: '' },
      checklist: skill.checklist || [],
      examples: skill.examples || [],
      metadata: {
        ...(skill.metadata || {}),
        difficulty: skill.difficulty || 'intermediate',
        freedom: skill.freedom || 'medium',
        variables: skill.variables || [],
        inputs: skill.inputs || [],
        outputs: skill.outputs || [],
        workflow: skill.workflow || { steps: [] },
        tools: skill.tools || [],
        agents: skill.agents || [],
        pipelines: skill.pipelines || [],
      },
      source: 'app',
    }

    const { error } = await supabase.from('skills').upsert(payload, { onConflict: 'id' })
    if (error) throw error

    return NextResponse.json({ success: true, skill })
  } catch (error) {
    console.error('Failed to save skill:', error)
    return NextResponse.json({ error: 'Failed to save skill' }, { status: 500 })
  }
}
