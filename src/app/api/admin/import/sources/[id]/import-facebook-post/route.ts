import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { buildImportWorkerCommand } from '@/lib/admin-import'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  createSingleFacebookPostImportJob,
  getImportSource,
  isFacebookImportSource,
} from '@/lib/import-db'
import { normalizeFacebookPostUrl } from '@/lib/facebook/parse-url'
import type { FacebookManualImportFields, FacebookManualImportInput } from '@/lib/facebook/types'
import { resolveCategoryById, generateUniqueNumericSku } from '@/lib/products-db'
import { categoryStorageLabel } from '@/lib/product-taxonomy'
import { buildCategoryPickerOptions } from '@/lib/category-picker'
import { loadActiveCategories } from '@/lib/categories-persistence'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

function parseManualBody(body: unknown): FacebookManualImportInput | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request body' }
  }
  const raw = body as Record<string, unknown>
  const price = Number(raw.price)
  const category_id = String(raw.category_id ?? raw.catalog_category_id ?? '').trim()
  const brandRaw = String(raw.brand ?? '').trim()

  if (!Number.isFinite(price) || price < 0) {
    return { error: 'Valid price is required' }
  }
  if (!category_id) {
    return { error: 'Category is required' }
  }
  if (!brandRaw) {
    return { error: 'Brand is required' }
  }

  return {
    price,
    category_id,
    category: String(raw.category ?? '').trim(),
    brand: brandRaw || null,
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const source = await getImportSource(params.id)
    if (!source) {
      return NextResponse.json({ error: 'Import source not found' }, { status: 404 })
    }

    if (!isFacebookImportSource(source)) {
      return NextResponse.json(
        { error: 'Facebook post import is only available for Facebook sources' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    const postUrl = String((body as { postUrl?: string })?.postUrl ?? '').trim()
    if (!postUrl) {
      return NextResponse.json({ error: 'postUrl is required' }, { status: 400 })
    }

    const manualParsed = parseManualBody(body)
    if ('error' in manualParsed) {
      return NextResponse.json({ error: manualParsed.error }, { status: 400 })
    }

    normalizeFacebookPostUrl(postUrl)

    let categoryLabel = manualParsed.category
    if (!categoryLabel) {
      const categoryRow = await resolveCategoryById(manualParsed.category_id)
      if (!categoryRow) {
        return NextResponse.json({ error: 'Category not found' }, { status: 400 })
      }
      const categories = buildCategoryPickerOptions(await loadActiveCategories())
      const option = categories.find((c) => c.id === manualParsed.category_id)
      categoryLabel = option ? categoryStorageLabel(option) : categoryRow.name
    }

    const manual: FacebookManualImportFields = {
      ...manualParsed,
      category: categoryLabel,
      sku: await generateUniqueNumericSku(),
    }

    const job = await createSingleFacebookPostImportJob(source, postUrl, manual)

    return NextResponse.json(
      {
        kind: 'import-facebook-post' as const,
        job,
        postUrl,
        sku: manual.sku,
        workerCommand: buildImportWorkerCommand(job.id, ['--refresh']),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Import Facebook post error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to queue Facebook post import') },
      { status: 503 }
    )
  }
}
