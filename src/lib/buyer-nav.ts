export const buyerNavKeys = [
  { key: 'buyer.nav.dashboard', href: '/buyer' },
  { key: 'buyer.nav.chat', href: '/buyer/chat' },
  { key: 'buyer.nav.browseShop', href: '/' },
  { key: 'buyer.nav.myCart', href: '/cart' },
] as const

export function filterBuyerNavKeys(catalogMode: boolean) {
  return catalogMode ? buyerNavKeys.filter((item) => item.href !== '/cart') : [...buyerNavKeys]
}
