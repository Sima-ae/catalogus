import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { parseBrandBody } from '@/lib/admin-brands'
import { serializeBrandWithCategories } from '@/lib/brand-serialize'
import { getDbErrorMessage } from '@/lib/db-errors'
import { loadBrandById, removeBrand, saveBrand } from '@/lib/brands-persistence'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await verifyAdminActor(request)
    if (!auth.ok) {
      return jsonError(auth.error, auth.status)
    }

    const row = await loadBrandById(params.id)
    if (!row) {
      return jsonError('Brand not found', 404)
    }
    return NextResponse.json(await serializeBrandWithCategories(row as Record<string, unknown>))
  } catch (error) {
    console.error('Brand GET error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to load brand'), 503)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await verifyAdminActor(request)
    if (!auth.ok) {
      return jsonError(auth.error, auth.status)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError('Invalid JSON body', 400)
    }

    const input = parseBrandBody(body as Record<string, unknown>)
    if (!input.name || !input.slug) {
      return jsonError('Name and slug are required', 400)
    }

    const result = await saveBrand(params.id, input)
    if (!result.ok) {
      return jsonError(result.error, result.status)
    }

    return NextResponse.json(
      await serializeBrandWithCategories(result.row as Record<string, unknown>)
    )
  } catch (error) {
    console.error('Brand PATCH error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to save brand'), 503)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await verifyAdminActor(request)
    if (!auth.ok) {
      return jsonError(auth.error, auth.status)
    }

    if (!auth.actor.isSuperAdmin) {
      return jsonError('Only super admin can delete brands', 403)
    }

    const result = await removeBrand(params.id)
    if (!result.ok) {
      return jsonError(result.error, result.status)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Brand DELETE error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to delete brand'), 503)
  }
}
