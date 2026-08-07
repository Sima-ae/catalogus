import { parseLocaleFromPathname } from '@/lib/i18n-routing'

/** Shared pricelist share-link detection (skip site password gate). */
export function isPricelistSharePath(pathname: string, ownerParam: string | null | undefined): boolean {
  const { pathnameWithoutLocale } = parseLocaleFromPathname(pathname)
  const normalized = pathnameWithoutLocale.replace(/\/$/, '') || '/'
  if (normalized !== '/pricelist') return false
  return Boolean(ownerParam?.trim())
}

export function isPricelistApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/pricelist/')
}
