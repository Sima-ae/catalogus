import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import { getBrandById } from '@/lib/brands-db'
import {
  insertBrandSubcategory,
  listBrandSubcategories,
  parseBrandSubcategoryBody,
  serializeBrandSubcategory,
} from '@/lib/brand-subcategories-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await verifyAdminActor(request)
    if (!auth.ok) return jsonError(auth.error, auth.status)

    const brand = await getBrandById(params.id)
    if (!brand) return jsonError('Brand not found', 404)

    const rows = await listBrandSubcategories(params.id, false)
    return NextResponse.json(rows.map(serializeBrandSubcategory))
  } catch (error) {
    console.error('Brand subcategories GET error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to load subcategories'), 503)
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await verifyAdminActor(request)
    if (!auth.ok) return jsonError(auth.error, auth.status)

    const brand = await getBrandById(params.id)
    if (!brand) return jsonError('Brand not found', 404)

    const body = await request.json()
    const input = parseBrandSubcategoryBody(body as Record<string, unknown>)
    if (!input.name) return jsonError('Name is required', 400)

    const row = await insertBrandSubcategory(params.id, input)
    return NextResponse.json(serializeBrandSubcategory(row), { status: 201 })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'ER_DUP_ENTRY') {
      return jsonError('A subcategory with this slug already exists for this brand', 409)
    }
    console.error('Brand subcategory POST error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to create subcategory'), 503)
  }
}
