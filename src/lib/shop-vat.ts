/** Shop VAT — displayed prices are treated as inclusive of 21% BTW. */
export const SHOP_VAT_RATE = 0.21

/** Split an inclusive EUR amount into excl + VAT. */
export function splitInclusiveVat(totalInclEuros: number, vatRate = SHOP_VAT_RATE) {
  const totalIncl = Math.round(totalInclEuros * 100) / 100
  const excl = Math.round((totalIncl / (1 + vatRate)) * 100) / 100
  const vat = Math.round((totalIncl - excl) * 100) / 100
  return { excl, vat, incl: totalIncl }
}

export function formatShopEuro(amountEuros: number, locale: string = 'en') {
  return new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amountEuros)
}
