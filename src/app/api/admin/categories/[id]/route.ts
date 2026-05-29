import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { parseCategoryBody } from '@/lib/admin-categories'
import { serializeCategory } from '@/lib/category-serialize'
import { loadCategoryById, removeCategory, saveCategory } from '@/lib/categories-persistence'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/** Admin + super admin: get one category. */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await verifyAdminActor(request)
    if (!auth.ok) {
      return jsonError(auth.error, auth.status)
    }

    const { row } = await loadCategoryById(params.id)
    if (!row) {
      return jsonError('Category not found', 404)
    }
    return NextResponse.json(serializeCategory(row as Record<string, unknown>))
  } catch (error) {
    console.error('Category GET error:', error)
    return jsonError('Failed to load category', 500)
  }
}

/** Admin + super admin: update category. */
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

    const input = parseCategoryBody(body as Record<string, unknown>)
    if (!input.name || !input.slug) {
      return jsonError('Name and slug are required', 400)
    }

    const result = await saveCategory(params.id, input)
    if (!result.ok) {
      return jsonError(result.error, result.status)
    }

    return NextResponse.json(serializeCategory(result.row as Record<string, unknown>))
  } catch (error) {
    console.error('Category PATCH error:', error)
    return jsonError('Failed to save category', 500)
  }
}

/** Super admin only: delete category. */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await verifyAdminActor(request)
    if (!auth.ok) {
      return jsonError(auth.error, auth.status)
    }

    if (!auth.actor.isSuperAdmin) {
      return jsonError('Only super admin can delete categories', 403)
    }

    const result = await removeCategory(params.id)
    if (!result.ok) {
      return jsonError(result.error, result.status)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Category DELETE error:', error)
    return jsonError('Failed to delete category', 500)
  }
}
