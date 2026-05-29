import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { mapDbCategoriesToAdminRows, parseCategoryBody } from '@/lib/admin-categories'
import { serializeCategory } from '@/lib/category-serialize'
import { createCategory, loadAllCategories } from '@/lib/categories-persistence'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Admin + super admin: list all database categories. */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminActor(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { rows } = await loadAllCategories()
    return NextResponse.json(mapDbCategoriesToAdminRows(rows))
  } catch (error) {
    console.error('Admin categories fetch error:', error)
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
  }
}

/** Admin + super admin: create category. */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const input = parseCategoryBody(body as Record<string, unknown>)

    if (!input.name || !input.slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const { row } = await createCategory({
      name: input.name,
      slug: input.slug,
      description: input.description,
    })

    return NextResponse.json(serializeCategory(row as Record<string, unknown>), {
      status: 201,
    })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 })
    }
    console.error('Admin category create error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
