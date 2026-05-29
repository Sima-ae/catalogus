import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { createImportSource, listImportSources } from '@/lib/import-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const sources = await listImportSources()
    return NextResponse.json(sources)
  } catch (error) {
    console.error('Import sources fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load import sources') },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const name = String(body.name || '').trim()
    const yupoo_category_url = String(body.yupoo_category_url || '').trim()
    const catalog_category_id = body.catalog_category_id
      ? String(body.catalog_category_id).trim()
      : null
    const catalog_brand_id = body.catalog_brand_id
      ? String(body.catalog_brand_id).trim()
      : null

    if (!name || !yupoo_category_url) {
      return NextResponse.json(
        { error: 'Name and Yupoo category URL are required' },
        { status: 400 }
      )
    }

    if (!catalog_category_id) {
      return NextResponse.json(
        { error: 'Catalog category is required' },
        { status: 400 }
      )
    }

    const source = await createImportSource({
      name,
      yupoo_category_url,
      catalog_category_id,
      catalog_brand_id,
    })

    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    console.error('Import source create error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to create import source') },
      { status: 503 }
    )
  }
}
