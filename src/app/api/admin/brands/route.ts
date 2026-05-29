import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { mapDbBrandsToAdminRows, parseBrandBody } from '@/lib/admin-brands'
import { serializeBrandWithCategories } from '@/lib/brand-serialize'
import { listBrandsWithCategoryLinks } from '@/lib/brands-db'
import { createBrand } from '@/lib/brands-persistence'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const rows = await listBrandsWithCategoryLinks()
    return NextResponse.json(mapDbBrandsToAdminRows(rows))
  } catch (error) {
    console.error('Admin brands fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load brands') },
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
    const body = await request.json()
    const input = parseBrandBody(body as Record<string, unknown>)

    if (!input.name || !input.slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const row = await createBrand({
      name: input.name,
      slug: input.slug,
      description: input.description,
      categoryIds: input.categoryIds,
    })

    return NextResponse.json(await serializeBrandWithCategories(row as Record<string, unknown>), {
      status: 201,
    })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A brand with this slug already exists' }, { status: 409 })
    }
    console.error('Admin brand create error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to create brand') },
      { status: 503 }
    )
  }
}
