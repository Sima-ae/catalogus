/** English default from supplier_pricelist_pages / ensurePricelistPagesCache bootstrap. */
const DEFAULT_PLATFORM_PRICELIST_LABEL = 'Platform pricelist'

/** Translate known pricelist owner labels from the API (English source strings). */
export function translatePricelistOwnerLabel(
  owner: { label: string; kind?: string },
  t: (key: string) => string
): string {
  if (owner.kind === 'self') return t('pricelist.owner.self')
  if (owner.kind === 'platform') {
    const label = owner.label?.trim() || ''
    if (!label || label === DEFAULT_PLATFORM_PRICELIST_LABEL) {
      return t('pricelist.owner.platform')
    }
    return label
  }
  return owner.label
}
