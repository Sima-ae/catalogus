import { NextRequest, NextResponse } from 'next/server'
import { superAdminDenial, verifyAdminActor } from '@/lib/admin-api-auth'
import { parseImportSourceBody, validateImportSourceInput } from '@/lib/admin-import'
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
  const denied = superAdminDenial(auth)
  if (denied) return denied

  try {
    const body = await request.json()
    const input = parseImportSourceBody(body)
    if (!input) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const validationError = validateImportSourceInput(input)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const source = await createImportSource({
      name: input.name,
      yupoo_category_url: input.yupoo_category_url,
      catalog_category_id: input.catalog_category_id,
      catalog_brand_id: input.catalog_brand_id || null,
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
