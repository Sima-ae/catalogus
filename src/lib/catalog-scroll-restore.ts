const STORAGE_KEY = 'catalogus_catalog_scroll'

export type CatalogScrollState = {
  key: string
  scrollY: number
  productId?: string
}

export function saveCatalogScrollState(key: string, productId?: string): void {
  if (typeof window === 'undefined') return
  try {
    const state: CatalogScrollState = {
      key,
      scrollY: window.scrollY,
      productId,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private mode */
  }
}

export function consumeCatalogScrollState(key: string): CatalogScrollState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(STORAGE_KEY)
    const state = JSON.parse(raw) as CatalogScrollState
    if (!state?.key || state.key !== key) return null
    return state
  } catch {
    return null
  }
}

export function restoreCatalogScroll(state: CatalogScrollState): void {
  if (state.productId) {
    const el = document.querySelector(`[data-product-id="${CSS.escape(state.productId)}"]`)
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'instant' })
      return
    }
  }
  window.scrollTo({ top: state.scrollY, left: 0, behavior: 'instant' })
}
