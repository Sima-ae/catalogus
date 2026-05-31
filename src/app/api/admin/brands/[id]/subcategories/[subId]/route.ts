import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  deleteBrandSubcategoryById,
  getBrandSubcategoryById,
  parseBrandSubcategoryBody,
  serializeBrandSubcategory,
  updateBrandSubcategoryById,
} from '@/lib/brand-subcategories-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string; subId: string } }

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await verifyAdminActor(request)
    if (!auth.ok) return jsonError(auth.error, auth.status)

    const existing = await getBrandSubcategoryById(params.id, params.subId)
    if (!existing) return jsonError('Subcategory not found', 404)

    const body = await request.json()
    const input = parseBrandSubcategoryBody(body as Record<string, unknown>)
    if (!input.name) return jsonError('Name is required', 400)

    const row = await updateBrandSubcategoryById(params.id, params.subId, input)
    if (!row) return jsonError('Subcategory not found', 404)

    return NextResponse.json(serializeBrandSubcategory(row))
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'ER_DUP_ENTRY') {
      return jsonError('A subcategory with this slug already exists for this brand', 409)
    }
    console.error('Brand subcategory PATCH error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to save subcategory'), 503)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await verifyAdminActor(request)
    if (!auth.ok) return jsonError(auth.error, auth.status)

    if (!auth.actor.isSuperAdmin) {
      return jsonError('Only super admin can delete brand subcategories', 403)
    }

    const ok = await deleteBrandSubcategoryById(params.id, params.subId)
    if (!ok) return jsonError('Subcategory not found', 404)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Brand subcategory DELETE error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to delete subcategory'), 503)
  }
}
