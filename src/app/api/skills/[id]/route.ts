import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const SKILLS_DIR = join(process.cwd(), 'src/config/skills')

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Try exact match first
    let filepath = join(SKILLS_DIR, `${id}.json`)
    
    try {
      const content = await readFile(filepath, 'utf-8')
      const skill = JSON.parse(content)
      return NextResponse.json(skill)
    } catch {
      // Try without .json extension in case id already has it
      if (id.endsWith('.json')) {
        filepath = join(SKILLS_DIR, id)
        const content = await readFile(filepath, 'utf-8')
        const skill = JSON.parse(content)
        return NextResponse.json(skill)
      }
    }
    
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  } catch (error) {
    console.error('Failed to load skill:', error)
    return NextResponse.json({ error: 'Failed to load skill' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const skill = await req.json()
    
    // Use the id from params, or from skill.name
    const filename = `${id}.json`
    const filepath = join(SKILLS_DIR, filename)
    
    // Update metadata
    skill.metadata = {
      ...skill.metadata,
      lastUpdated: new Date().toISOString().split('T')[0],
    }
    
    await writeFile(filepath, JSON.stringify(skill, null, 2), 'utf-8')
    
    return NextResponse.json({ success: true, skill })
  } catch (error) {
    console.error('Failed to save skill:', error)
    return NextResponse.json({ error: 'Failed to save skill' }, { status: 500 })
  }
}
