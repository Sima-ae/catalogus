import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { getProductById } from '@/lib/products-db'
import { getSiteAccessConfig } from '@/lib/site-access'
import {
  SITE_ACCESS_COOKIE,
  readUnlockCookie,
  verifyUnlockToken,
} from '@/lib/site-access-cookie'
import {
  resolveRequestHostname,
  siteAccessAppliesToHost,
} from '@/lib/store-host'

export type PublicProductAccessResult =
  | { allowed: true; unlocked: boolean; publicShare: boolean }
  | { allowed: false; reason: 'not_found' | 'locked' | 'unavailable' }

async function isSiteUnlockedFromCookie(
  unlockCookie: string | undefined,
  hostname?: string | null
): Promise<{ required: boolean; unlocked: boolean }> {
  if (hostname != null && !siteAccessAppliesToHost(hostname)) {
    return { required: false, unlocked: true }
  }
  const config = await getSiteAccessConfig()
  if (!config.required) {
    return { required: false, unlocked: true }
  }
  const unlocked = await verifyUnlockToken(unlockCookie, config.version)
  return { required: true, unlocked }
}

/** Site unlock from Next.js server cookies() (RSC / route handlers). */
export async function getSiteUnlockState(): Promise<{
  required: boolean
  unlocked: boolean
}> {
  const jar = cookies()
  const host = resolveRequestHostname(headers())
  return isSiteUnlockedFromCookie(jar.get(SITE_ACCESS_COOKIE)?.value, host)
}

/** Site unlock from an incoming request (API routes). */
export async function getSiteUnlockStateFromRequest(
  request: NextRequest | Request
): Promise<{ required: boolean; unlocked: boolean }> {
  const cookieHeader =
    'headers' in request ? request.headers.get('cookie') : null
  const host =
    'headers' in request
      ? resolveRequestHostname(request.headers)
      : undefined
  return isSiteUnlockedFromCookie(readUnlockCookie(cookieHeader), host)
}

function isFlagOn(value: unknown): boolean {
  return value === true || value === 1 || value === '1'
}

function isStorefrontVisibleProduct(
  product: Record<string, unknown>,
  options?: { allowSoldOut?: boolean }
): boolean {
  const status = String(product.status || 'active')
  if (status === 'draft' || status === 'inactive' || status === 'trash') {
    return false
  }
  // Public share links must still open when the item is sold out (show OOS state).
  if (isFlagOn(product.sold_out) && !options?.allowSoldOut) return false
  return true
}

/**
 * Whether a locked visitor (or social crawler) may view this product page/API.
 * Unlocked visitors are always allowed when the product exists and is storefront-visible.
 * Locked visitors may open products with public_share (including sold-out).
 */
export async function resolvePublicProductAccess(
  productId: string,
  options?: { unlocked?: boolean; required?: boolean }
): Promise<PublicProductAccessResult & { product?: Record<string, unknown> }> {
  const unlock =
    options?.unlocked != null && options?.required != null
      ? { required: options.required, unlocked: options.unlocked }
      : await getSiteUnlockState()

  const product = (await getProductById(productId)) as Record<string, unknown> | null
  if (!product) {
    return { allowed: false, reason: 'not_found' }
  }

  const publicShare = isFlagOn(product.public_share)

  if (!isStorefrontVisibleProduct(product, { allowSoldOut: publicShare })) {
    return { allowed: false, reason: 'unavailable', product }
  }

  if (!unlock.required || unlock.unlocked) {
    return { allowed: true, unlocked: unlock.unlocked, publicShare, product }
  }

  // Locked visitor: only public_share products.
  if (!publicShare) {
    return { allowed: false, reason: 'locked', product }
  }

  return { allowed: true, unlocked: false, publicShare: true, product }
}
