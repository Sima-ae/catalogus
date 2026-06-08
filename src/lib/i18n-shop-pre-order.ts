import type { Locale } from '@/lib/i18n-locale-registry'

export type ShopPreOrderMessageKey = 'shop.preOrder'

type PreOrderMessages = Record<ShopPreOrderMessageKey, string>

const EN: PreOrderMessages = {
  'shop.preOrder': 'PRE-ORDER',
}

const BY_LOCALE: Partial<Record<Locale, PreOrderMessages>> = {
  en: EN,
  nl: { 'shop.preOrder': 'PRE-ORDER' },
  de: { 'shop.preOrder': 'VORBESTELLUNG' },
  fr: { 'shop.preOrder': 'PRÉCOMMANDE' },
  es: { 'shop.preOrder': 'PRE-PEDIDO' },
  pt: { 'shop.preOrder': 'PRÉ-ENCOMENDA' },
  it: { 'shop.preOrder': 'PREORDINE' },
  gr: { 'shop.preOrder': 'ΠΡΟΠΑΡΑΓΓΕΛΙΑ' },
  pl: { 'shop.preOrder': 'PRZEDSPRZEDAŻ' },
  cz: { 'shop.preOrder': 'PŘEDOBJEDNÁVKA' },
  sk: { 'shop.preOrder': 'PREDOBJEDNÁVKA' },
  hu: { 'shop.preOrder': 'ELŐRENDELÉS' },
  ro: { 'shop.preOrder': 'PRE-COMANDĂ' },
  bg: { 'shop.preOrder': 'ПРЕДПОРЪЧКА' },
  hr: { 'shop.preOrder': 'PREDNARUDŽBA' },
  sr: { 'shop.preOrder': 'ПРЕДНАРУДЖБИНА' },
  ba: { 'shop.preOrder': 'PREDNARUDŽBA' },
  me: { 'shop.preOrder': 'PREDNARUDŽBA' },
  sq: { 'shop.preOrder': 'POROSI PARAPRAKE' },
  mk: { 'shop.preOrder': 'ПРЕДНАРАЧКА' },
  lt: { 'shop.preOrder': 'IŠANKSTINIS UŽSAKYMAS' },
  da: { 'shop.preOrder': 'FORUDBESTILLING' },
  sv: { 'shop.preOrder': 'FÖRBESTÄLLNING' },
  nb: { 'shop.preOrder': 'FORBESTILLING' },
  fi: { 'shop.preOrder': 'ENNAKKOTILAUS' },
  uk: { 'shop.preOrder': 'ПЕРЕДЗАМОВЛЕННЯ' },
  ru: { 'shop.preOrder': 'ПРЕДЗАКАЗ' },
  tr: { 'shop.preOrder': 'ÖN SİPARİŞ' },
  he: { 'shop.preOrder': 'הזמנה מראש' },
  az: { 'shop.preOrder': 'ƏVVƏLCƏDƏN SİFARİŞ' },
  ja: { 'shop.preOrder': '予約注文' },
  zh: { 'shop.preOrder': '预售' },
  ka: { 'shop.preOrder': 'წინასწარი შეკვეთა' },
  hy: { 'shop.preOrder': 'ՆԱԽԱՊԱՏՎԱԾՈՒԹՅՈՒՆ' },
  eg: { 'shop.preOrder': 'طلب مسبق' },
  at: { 'shop.preOrder': 'طلب مسبق' },
  ps: { 'shop.preOrder': 'پیش سفارش' },
  ma: { 'shop.preOrder': 'طلب مسبق' },
  dz: { 'shop.preOrder': 'طلب مسبق' },
}

export function getShopPreOrderMessages(locale: Locale): PreOrderMessages {
  return { ...EN, ...(BY_LOCALE[locale] ?? {}) }
}
