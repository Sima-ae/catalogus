import { NextResponse } from 'next/server'
import { isCatalogModeEnabled } from '@/lib/catalog-mode'
import { getDbErrorMessage } from '@/lib/db-errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Public read — whether the storefront runs in catalog (browse-only) mode. */
export async function GET() {
  try {
    const catalogMode = await isCatalogModeEnabled()
    return NextResponse.json({ catalogMode })
  } catch (error) {
    console.error('Catalog mode fetch error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load catalog mode'), catalogMode: false },
      { status: 503 }
    )
  }
}
