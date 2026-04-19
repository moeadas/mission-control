import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'
import skillsLibrary from '@/config/skills/skills-library.json'

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

function buildFallbackSkills() {
  const categories = Array.isArray(skillsLibrary.skillCategories) ? skillsLibrary.skillCategories : []
  return categories.flatMap((category: any) =>
    (Array.isArray(category.skills) ? category.skills : []).map((skill: any) => ({
      id: skill.id,
      name: skill.name || skill.id,
      description: skill.description || '',
      category: category.id,
      difficulty: 'intermediate',
      freedom: 'medium',
      prompts: {
        en: {
          trigger: '',
          context: '',
          instructions: '',
          output_template: '',
        },
      },
      variables: [],
      inputs: [],
      outputs: [],
      workflow: { steps: [] },
      tools: [],
      agents: [],
      pipelines: [],
      checklist: [],
      examples: [],
      metadata: {
        author: 'Mission Control',
        version: '1.0',
        lastUpdated: new Date().toISOString().split('T')[0],
        difficulty: 'intermediate',
      },
    }))
  )
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseServerClient()
    const agencyId = await getAgencyId()
    if (!supabase || !agencyId) return NextResponse.json(buildFallbackSkills())

    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('agency_id', agencyId)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(
      (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        category: row.category,
        difficulty: row.metadata?.difficulty || 'intermediate',
        freedom: row.metadata?.freedom || 'medium',
        prompts: row.prompts || {
          en: {
            trigger: '',
            context: '',
            instructions: '',
            output_template: '',
          },
        },
        variables: row.metadata?.variables || [],
        inputs: row.metadata?.inputs || [],
        outputs: row.metadata?.outputs || [],
        workflow: row.metadata?.workflow || { steps: [] },
        tools: row.metadata?.tools || [],
        agents: row.metadata?.agents || [],
        pipelines: row.metadata?.pipelines || [],
        checklist: Array.isArray(row.checklist) ? row.checklist : [],
        examples: Array.isArray(row.examples) ? row.examples : [],
        metadata: row.metadata || {},
      }))
    )
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
