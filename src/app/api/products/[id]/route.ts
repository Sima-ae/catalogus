import { NextRequest, NextResponse } from 'next/server'
import {
  deleteProductById,
  bulkMoveProductsToTrash,
  DuplicateSkuError,
  getProductById,
  MissingSkuError,
  type ProductInput,
  PublicShareUnavailableError,
  UnknownBrandError,
  UnknownCategoryError,
  updateProduct,
} from '@/lib/products-db'
import {
  isProductImageOrderPatch,
  parseProductPatchBody,
  parseProductImageOrderBody,
} from '@/lib/product-body'
import { getDbErrorMessage } from '@/lib/db-errors'
import { applyStorefrontSoldOutFromPlatformPricelist } from '@/lib/pricelist-db'
import { omitProductInternalPricing } from '@/lib/product-serialize'
import {
  applySellerProductInput,
  type ProductOwnershipRow,
  requireProductWrite,
  resolveCatalogAccess,
  sellerOwnsProductOrForbidden,
} from '@/lib/product-api-auth'
import {
  checkAndMarkYupooSourceUnavailable,
  markProductsSoldOutUnavailable,
} from '@/lib/mark-source-unavailable'
import {
  getSiteUnlockStateFromRequest,
  resolvePublicProductAccess,
} from '@/lib/public-product-access'

function ownershipOf(product: Record<string, unknown>): ProductOwnershipRow {
  return {
    author_id: product.author_id != null ? String(product.author_id) : undefined,
    author: product.author != null ? String(product.author) : undefined,
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveCatalogAccess(request)
    const includePurchasePrice = access.kind === 'admin'
    const storageImages = access.kind === 'admin' || access.kind === 'seller'
    const product = await getProductById(params.id, { includePurchasePrice, storageImages })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (access.kind === 'seller') {
      const allowed = sellerOwnsProductOrForbidden(access, ownershipOf(product))
      if (!allowed.ok) {
        return NextResponse.json({ error: allowed.error }, { status: allowed.status })
      }
    } else if (access.kind === 'public') {
      const unlock = await getSiteUnlockStateFromRequest(request)
      const shareAccess = await resolvePublicProductAccess(params.id, unlock)
      if (!shareAccess.allowed) {
        if (shareAccess.reason === 'locked') {
          return NextResponse.json(
            { error: 'Site access password required' },
            { status: 401 }
          )
        }
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      const status = String(product.status || 'active')
      if (status === 'draft' || status === 'inactive' || status === 'trash') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
    }

    let payload = includePurchasePrice ? product : omitProductInternalPricing(product)
    if (access.kind === 'public') {
      ;[payload] = await applyStorefrontSoldOutFromPlatformPricelist([payload])
      const shareFlag = (payload as { public_share?: unknown }).public_share
      const publicShare =
        shareFlag === true || shareFlag === 1 || shareFlag === '1'
      // Hide sold-out from the normal shop PDP — but public share links must still load.
      if (Boolean(payload.sold_out) && !publicShare) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
    }

    // Re-check Yupoo albums on PDP load so deleted supplier pages go OOS
    // without waiting for the batch scanner / image-proxy hit.
    if (access.kind === 'public') {
      const sourceUrl =
        payload.source_url != null ? String(payload.source_url) : ''
      const imageUrl = payload.image_url != null ? String(payload.image_url) : ''
      const galleryRaw = payload.gallery_images
      const galleryText =
        typeof galleryRaw === 'string'
          ? galleryRaw
          : Array.isArray(galleryRaw)
            ? galleryRaw.map(String).join('\n')
            : ''
      const isYupoo =
        /yupoo\.com/i.test(sourceUrl) ||
        /yupoo\.com/i.test(imageUrl) ||
        /yupoo\.com/i.test(galleryText) ||
        imageUrl.includes('/api/yupoo-image') ||
        galleryText.includes('/api/yupoo-image')
      const alreadySoldOut = Boolean(payload.sold_out)
      const stillHasYupooImages =
        /yupoo\.com/i.test(imageUrl) ||
        /yupoo\.com/i.test(galleryText) ||
        imageUrl.includes('/api/yupoo-image') ||
        galleryText.includes('/api/yupoo-image')

      if (isYupoo && sourceUrl && /yupoo\.com/i.test(sourceUrl) && !alreadySoldOut) {
        void checkAndMarkYupooSourceUnavailable(
          String(payload.id),
          sourceUrl,
          'product_view'
        )
      } else if (isYupoo && alreadySoldOut && stillHasYupooImages) {
        void markProductsSoldOutUnavailable(
          [String(payload.id)],
          'clear_sold_out_yupoo_images'
        )
      }
    }

    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to load product') },
      { status: 503 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireProductWrite(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const existing = await getProductById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (auth.access.kind === 'seller') {
      const allowed = sellerOwnsProductOrForbidden(auth.access, ownershipOf(existing))
      if (!allowed.ok) {
        return NextResponse.json({ error: allowed.error }, { status: allowed.status })
      }
    }

    const body = (await request.json()) as Record<string, unknown>
    const imageOnly = isProductImageOrderPatch(body)
    let input: Partial<ProductInput> = imageOnly
      ? parseProductImageOrderBody(body)
      : parseProductPatchBody(body)
    if (!imageOnly && auth.access.kind === 'seller') {
      input = applySellerProductInput(input as ProductInput, auth.access.actor)
    }

    const product = await updateProduct(params.id, input)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json(
      auth.access.kind === 'admin' ? product : omitProductInternalPricing(product)
    )
  } catch (error) {
    if (error instanceof UnknownCategoryError || error instanceof UnknownBrandError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof PublicShareUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof MissingSkuError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof DuplicateSkuError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('Product update error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to update product') },
      { status: 503 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireProductWrite(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const existing = await getProductById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (auth.access.kind === 'seller') {
      const allowed = sellerOwnsProductOrForbidden(auth.access, ownershipOf(existing))
      if (!allowed.ok) {
        return NextResponse.json({ error: allowed.error }, { status: allowed.status })
      }
    }

    if (auth.access.kind === 'admin') {
      await bulkMoveProductsToTrash([params.id])
    } else {
      await deleteProductById(params.id)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Product delete error:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Failed to delete product') },
      { status: 503 }
    )
  }
}
