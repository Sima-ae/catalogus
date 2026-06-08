import type { Locale } from '@/lib/i18n-locale-registry'

export type ShopSoldOutMessageKey = 'shop.soldOut'

type SoldOutMessages = Record<ShopSoldOutMessageKey, string>

const EN: SoldOutMessages = {
  'shop.soldOut': 'SOLD OUT !',
}

const BY_LOCALE: Partial<Record<Locale, SoldOutMessages>> = {
  en: EN,
  nl: { 'shop.soldOut': 'UITVERKOCHT' },
  de: { 'shop.soldOut': 'AUSVERKAUFT' },
  fr: { 'shop.soldOut': 'ÉPUISÉ' },
  es: { 'shop.soldOut': 'AGOTADO' },
  pt: { 'shop.soldOut': 'ESGOTADO' },
  it: { 'shop.soldOut': 'ESAURITO' },
  gr: { 'shop.soldOut': 'ΕΞΑΝΤΛΗΘΗΚΕ' },
  pl: { 'shop.soldOut': 'WYPRZEDANE' },
  cz: { 'shop.soldOut': 'VYPRODÁNO' },
  sk: { 'shop.soldOut': 'VYPREDANÉ' },
  hu: { 'shop.soldOut': 'ELFOGYOTT' },
  ro: { 'shop.soldOut': 'EPUIZAT' },
  bg: { 'shop.soldOut': 'ИЗЧЕРПАН' },
  hr: { 'shop.soldOut': 'RASPRODANO' },
  sr: { 'shop.soldOut': 'РАСПРОДАТО' },
  ba: { 'shop.soldOut': 'RASPRODANO' },
  me: { 'shop.soldOut': 'RASPRODANO' },
  sq: { 'shop.soldOut': 'SHITUR' },
  mk: { 'shop.soldOut': 'РАСПРОДАДЕНО' },
  lt: { 'shop.soldOut': 'IŠPARDUOTA' },
  da: { 'shop.soldOut': 'UDSOLGT' },
  sv: { 'shop.soldOut': 'SLUT' },
  nb: { 'shop.soldOut': 'UTSOLGT' },
  fi: { 'shop.soldOut': 'LOPPUUNMYYTY' },
  uk: { 'shop.soldOut': 'РОЗПРОДАНО' },
  ru: { 'shop.soldOut': 'РАСПРОДАНО' },
  tr: { 'shop.soldOut': 'TÜKENDİ' },
  he: { 'shop.soldOut': 'אזל מהמלאי' },
  eg: { 'shop.soldOut': 'نفدت الكمية' },
  at: { 'shop.soldOut': 'نفدت الكمية' },
  ps: { 'shop.soldOut': 'تم البيع' },
  ma: { 'shop.soldOut': 'نفدت الكمية' },
  ka: { 'shop.soldOut': 'გაყიდულია' },
  hy: { 'shop.soldOut': 'ՎԱՃԱՌՎԱԾ' },
  dz: { 'shop.soldOut': 'نفدت الكمية' },
  az: { 'shop.soldOut': 'SATILIB' },
  ja: { 'shop.soldOut': '売り切れ' },
  zh: { 'shop.soldOut': '售罄' },
}

export function getShopSoldOutMessages(locale: Locale): SoldOutMessages {
  return BY_LOCALE[locale] ?? EN
}
