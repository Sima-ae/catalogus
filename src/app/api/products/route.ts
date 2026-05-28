import { NextRequest, NextResponse } from 'next/server'
import { queryDb } from '@/lib/db'
import {
  createDevProduct,
  devModeEnabled,
  listDevProducts,
} from '@/lib/dev-store'
import { insertProduct, type ProductInput } from '@/lib/products-db'
import { APP_DEFAULT_AUTHOR, APP_DEFAULT_AUTHOR_ICON } from '@/lib/brand'
import { DEV_PRODUCTS } from '@/lib/dev-seed'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const rows = await queryDb('SELECT * FROM products ORDER BY created_at DESC')
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Products fetch error:', error)
    if (isDevDataFallbackEnabled()) {
      return NextResponse.json(listDevProducts())
    }
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = parseProductBody(body)

    if (!input.name || !input.description || !input.image_url || !input.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    try {
      const product = await insertProduct(input)
      return NextResponse.json(product, { status: 201 })
    } catch (dbError) {
      if (devModeEnabled()) {
        const product = createDevProduct(input)
        return NextResponse.json(product, { status: 201 })
      }
      throw dbError
    }
  } catch (error) {
    console.error('Product create error:', error)
    if (devModeEnabled()) {
      return NextResponse.json(
        { error: 'Failed to create product', devProducts: DEV_PRODUCTS.length },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

function parseProductBody(body: Record<string, unknown>): ProductInput {
  const tagsRaw = body.tags
  let tags: string[] | null = null
  if (typeof tagsRaw === 'string' && tagsRaw.trim()) {
    tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
  } else if (Array.isArray(tagsRaw)) {
    tags = tagsRaw.map(String)
  }

  return {
    name: String(body.name || '').trim(),
    description: String(body.description || '').trim(),
    short_description: body.short_description ? String(body.short_description).trim() : undefined,
    price: Number(body.price) || 0,
    original_price: body.original_price != null && body.original_price !== '' ? Number(body.original_price) : null,
    image_url: String(body.image_url || '').trim(),
    category: String(body.category || '').trim(),
    tags,
    author: String(body.author || APP_DEFAULT_AUTHOR).trim(),
    author_icon: String(body.author_icon || APP_DEFAULT_AUTHOR_ICON).trim(),
    sku: body.sku ? String(body.sku).trim() : null,
    status: String(body.status || 'active'),
    featured: body.featured === true || body.featured === 'true' || body.featured === 1,
    version: body.version ? String(body.version) : null,
    license_type: body.license_type ? String(body.license_type) : null,
    demo_url: body.demo_url ? String(body.demo_url) : null,
    documentation_url: body.documentation_url ? String(body.documentation_url) : null,
    download_url: body.download_url ? String(body.download_url) : null,
  }
}
