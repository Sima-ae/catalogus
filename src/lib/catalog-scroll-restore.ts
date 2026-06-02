import { parseCatalogPageParam } from '@/lib/shop-catalog-url'

const STORAGE_KEY = 'catalogus_catalog_nav'

export type CatalogNavState = {
  /** Path + query for scroll-restore matching (see catalogListingKey). */
  listingKey: string
  /** Full path + search to return to (includes ?page=). */
  returnUrl: string
  page: number
  scrollY: number
  productId?: string
}

export function saveCatalogNavState(
  listingKey: string,
  returnUrl: string,
  productId: string,
  page: number
): void {
  if (typeof window === 'undefined') return
  try {
    const state: CatalogNavState = {
      listingKey,
      returnUrl,
      page,
      scrollY: window.scrollY,
      productId,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private mode */
  }
}

export function getCatalogNavState(): CatalogNavState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as CatalogNavState
    if (!state?.listingKey || !state.returnUrl) return null
    return state
  } catch {
    return null
  }
}

export function consumeCatalogNavState(listingKey: string): CatalogNavState | null {
  const state = getCatalogNavState()
  if (!state || state.listingKey !== listingKey) return null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return state
}

export function restoreCatalogScroll(state: CatalogNavState): void {
  if (state.productId) {
    const el = document.querySelector(`[data-product-id="${CSS.escape(state.productId)}"]`)
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'instant' })
      return
    }
  }
  window.scrollTo({ top: state.scrollY, left: 0, behavior: 'instant' })
}

/** @deprecated Use saveCatalogNavState */
export function saveCatalogScrollState(key: string, productId?: string): void {
  if (typeof window === 'undefined') return
  const search = window.location.search
  const returnUrl = `${window.location.pathname}${search}`
  const page = parseCatalogPageParam(new URLSearchParams(search))
  saveCatalogNavState(key, returnUrl, productId ?? '', page)
}

/** @deprecated Use consumeCatalogNavState */
export function consumeCatalogScrollState(key: string): CatalogNavState | null {
  return consumeCatalogNavState(key)
}
