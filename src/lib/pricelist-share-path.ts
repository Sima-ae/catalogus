/** Shared pricelist share-link detection (skip site password gate). */
export function isPricelistSharePath(pathname: string, ownerParam: string | null | undefined): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (normalized !== '/pricelist') return false
  return Boolean(ownerParam?.trim())
}

export function isPricelistApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/pricelist/')
}
