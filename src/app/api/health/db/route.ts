import { NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await queryDb('SELECT 1 AS ok')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DB health check failed:', error)
    return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 500 })
  }
}
