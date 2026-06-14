import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { findProductTitleDuplicateGroups } from '@/lib/product-title-duplicates'
import { listProductsForDuplicateScan } from '@/lib/products-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const includeTrash = request.nextUrl.searchParams.get('includeTrash') === '1'
    const products = await listProductsForDuplicateScan({ includeTrash })
    const result = findProductTitleDuplicateGroups(products)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Duplicate title scan error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to scan for duplicate titles') },
      { status: 503 }
    )
  }
}
