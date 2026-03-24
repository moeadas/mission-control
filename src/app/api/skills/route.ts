import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, readdir } from 'fs/promises'
import { join } from 'path'

const SKILLS_DIR = join(process.cwd(), 'src/config/skills')

export async function GET() {
  try {
    const files = await readdir(SKILLS_DIR)
    const skills = []
    
    for (const file of files) {
      if (file.endsWith('.json') && file !== 'skills-library.json') {
        const content = await readFile(join(SKILLS_DIR, file), 'utf-8')
        const skill = JSON.parse(content)
        skills.push(skill)
      }
    }
    
    return NextResponse.json(skills)
  } catch (error) {
    console.error('Failed to load skills:', error)
    return NextResponse.json({ error: 'Failed to load skills' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const skill = await req.json()
    
    if (!skill.name) {
      return NextResponse.json({ error: 'Skill name is required' }, { status: 400 })
    }
    
    const filename = `${skill.name}.json`
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
