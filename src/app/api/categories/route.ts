import { NextRequest, NextResponse } from 'next/server'
import {
  createDevCategory,
  devModeEnabled,
  listDevCategories,
} from '@/lib/dev-store'
import { insertCategory, listCategories } from '@/lib/products-db'
import { useDevDataFallback } from '@/lib/dev-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const rows = await listCategories()
    return NextResponse.json(rows)
  } catch (error) {
    if (useDevDataFallback()) {
      return NextResponse.json(listDevCategories())
    }
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = String(body.name || '').trim()
    const slug = String(body.slug || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    const description = body.description ? String(body.description).trim() : undefined

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    try {
      const category = await insertCategory({ name, slug, description })
      return NextResponse.json(category, { status: 201 })
    } catch (dbError) {
      if (devModeEnabled()) {
        const category = createDevCategory({ name, slug, description })
        return NextResponse.json(category, { status: 201 })
      }
      throw dbError
    }
  } catch (error) {
    console.error('Category create error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
