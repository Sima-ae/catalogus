import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { findProductImageDuplicateGroups } from '@/lib/product-image-duplicates'
import { listProductsForImageDuplicateScan } from '@/lib/products-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const includeTrash = request.nextUrl.searchParams.get('includeTrash') === '1'
    const products = await listProductsForImageDuplicateScan({ includeTrash })
    const result = findProductImageDuplicateGroups(products)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Duplicate image scan error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to scan for duplicate images') },
      { status: 503 }
    )
  }
}
