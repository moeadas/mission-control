import { NextRequest, NextResponse } from 'next/server'
import { verifyProvider } from '@/lib/server/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await verifyProvider(body)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Verification failed.' }, { status: 400 })
  }
}
