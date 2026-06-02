/** Translate known pricelist owner labels from the API (English source strings). */
export function translatePricelistOwnerLabel(
  owner: { label: string; kind?: string },
  t: (key: string) => string
): string {
  if (owner.kind === 'platform') return t('pricelist.owner.platform')
  if (owner.kind === 'self') return t('pricelist.owner.self')
  return owner.label
}
