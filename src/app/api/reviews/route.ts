import { NextRequest, NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'

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

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('product_id')?.trim()

  try {
    if (productId) {
      const rows = await queryDb<ReviewRow[]>(
        `SELECT r.id, r.product_id, p.name AS product_name, r.user_name, r.rating,
                r.title, r.comment, r.status, r.verified_purchase, r.created_at
         FROM reviews r
         LEFT JOIN products p ON p.id = r.product_id
         WHERE r.product_id = ? AND (r.status IS NULL OR r.status = 'approved' OR r.status = 'published')
         ORDER BY r.created_at DESC`,
        [productId]
      )
      return NextResponse.json(rows)
    }

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
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load reviews') },
      { status: 503 }
    )
  }
}
