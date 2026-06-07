import { NextRequest, NextResponse } from 'next/server'
import { superAdminDenial, verifyAdminActor } from '@/lib/admin-api-auth'
import { parseImportSourceBody, validateImportSourceInput } from '@/lib/admin-import'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  deleteImportSource,
  getImportSource,
  toImportSourcePublic,
  updateImportSource,
} from '@/lib/import-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  const denied = superAdminDenial(auth)
  if (denied) return denied

  try {
    const existing = await getImportSource(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Import source not found' }, { status: 404 })
    }

    const body = await request.json()
    const input = parseImportSourceBody(body)
    if (!input) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const validationError = validateImportSourceInput(input)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const source = await updateImportSource(params.id, {
      name: input.name,
      source_type: input.source_type,
      yupoo_category_url: input.yupoo_category_url || null,
      ...(input.yupoo_access_password_provided
        ? {
            yupoo_access_password: input.yupoo_access_password,
            clear_yupoo_access_password: !input.yupoo_access_password,
          }
        : {}),
      woocommerce_store_url: input.woocommerce_store_url || null,
      woocommerce_category_slug: input.woocommerce_category_slug || null,
      catalog_list_url: input.catalog_list_url || null,
      catalog_category_id: input.catalog_category_id,
      catalog_brand_id: input.catalog_brand_id || null,
    })

    return NextResponse.json(source ? toImportSourcePublic(source) : null)
  } catch (error) {
    console.error('Import source update error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to update import source') },
      { status: 503 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  const denied = superAdminDenial(auth)
  if (denied) return denied

  try {
    const existing = await getImportSource(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Import source not found' }, { status: 404 })
    }

    const deleted = await deleteImportSource(params.id)
    if (!deleted) {
      return NextResponse.json({ error: 'Import source not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Import source delete error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to delete import source') },
      { status: 503 }
    )
  }
}
