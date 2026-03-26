import { NextRequest, NextResponse } from 'next/server'

import { normalizeAgentPhotoUrl, setAgentPhoto, syncAgentPhotoToDatabase } from '@/lib/server/agent-photos'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const photoUrl = typeof body.photoUrl === 'string' && body.photoUrl.trim()
      ? normalizeAgentPhotoUrl(body.photoUrl.trim())
      : undefined

    await setAgentPhoto(id, photoUrl)
    await syncAgentPhotoToDatabase(id, photoUrl)

    return NextResponse.json({ success: true, photoUrl: photoUrl || null })
  } catch (error) {
    console.error('Failed to save agent photo reference:', error)
    return NextResponse.json({ error: 'Failed to save agent photo reference' }, { status: 500 })
  }
}
