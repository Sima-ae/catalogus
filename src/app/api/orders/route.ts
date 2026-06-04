import { NextRequest, NextResponse } from 'next/server'
import {
  getOrdersAggregateSummary,
  listOrdersPaginated,
  listOrdersRecent,
} from '@/lib/orders-db'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    if (searchParams.get('summary') === '1') {
      const summary = await getOrdersAggregateSummary()
      return NextResponse.json(summary)
    }

    const limitRaw = parseInt(searchParams.get('limit') || '0', 10)
    const pageRaw = parseInt(searchParams.get('page') || '0', 10)

    if (pageRaw > 0) {
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50
      const result = await listOrdersPaginated(pageRaw, limit)
      return NextResponse.json(result)
    }

    if (limitRaw > 0) {
      const items = await listOrdersRecent(limitRaw)
      return NextResponse.json(items)
    }

    const items = await listOrdersRecent(50)
    return NextResponse.json(items)
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load orders') },
      { status: 503 }
    )
  }
}
