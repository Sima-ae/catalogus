import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { publishImportProduct } from '@/lib/import-db'
import { getProductById } from '@/lib/products-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const product = await getProductById(params.productId)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (String(product.status) !== 'draft' || !product.source_album_id) {
      return NextResponse.json(
        { error: 'Only draft import products can be published from this queue' },
        { status: 400 }
      )
    }

    await publishImportProduct(params.productId)
    const updated = await getProductById(params.productId)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Import publish error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to publish product') },
      { status: 503 }
    )
  }
}
