import { NextRequest, NextResponse } from 'next/server'

import { exportArtifactToFile } from '@/lib/server/artifact-export'
import { Artifact, ArtifactExport } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const artifact = body?.artifact as Artifact | undefined
    const format = body?.format as ArtifactExport['format'] | undefined

    if (!artifact || !artifact.id || !artifact.title || !artifact.deliverableType) {
      return NextResponse.json({ error: 'A valid artifact payload is required.' }, { status: 400 })
    }

    if (!format || !['docx', 'pdf', 'xlsx'].includes(format)) {
      return NextResponse.json({ error: 'A supported export format is required.' }, { status: 400 })
    }

    const exportRecord = await exportArtifactToFile({
      artifact,
      format,
      clientName: body?.clientName,
      missionTitle: body?.missionTitle,
      agentName: body?.agentName,
    })

    return NextResponse.json({ exportRecord })
  } catch (error) {
    console.error('Artifact export error', error)
    return NextResponse.json({ error: 'Unable to generate export for this artifact.' }, { status: 500 })
  }
}
