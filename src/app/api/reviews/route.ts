import { NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export type ReviewRow = {
  id: string
  product_id: string
  product_name?: string | null
  user_name: string
  rating: number
  title: string | null
  comment: string | null
  status: string | null
  verified_purchase: number
  created_at: string
}

export async function GET() {
  try {
    const rows = await queryDb<ReviewRow[]>(
      `SELECT r.id, r.product_id, p.name AS product_name, r.user_name, r.rating,
              r.title, r.comment, r.status, r.verified_purchase, r.created_at
       FROM reviews r
       LEFT JOIN products p ON p.id = r.product_id
       ORDER BY r.created_at DESC`
    )
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Reviews fetch error:', error)
    if (isDevDataFallbackEnabled()) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 })
  }
}
