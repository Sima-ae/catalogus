import type { Locale } from '@/lib/i18n-locale-registry'

const EN = {"category.bags-and-wallets":"Bags and wallets","category.tassen-en-portemonnees":"Bags and wallets"}

const BY_LOCALE: Partial<Record<Locale, typeof EN>> = {
  nl: {"category.bags-and-wallets":"Tassen en portemonnees","category.tassen-en-portemonnees":"Tassen en portemonnees"},
  en: {"category.bags-and-wallets":"Bags and wallets","category.tassen-en-portemonnees":"Bags and wallets"},
  fr: {"category.bags-and-wallets":"Sacs et portefeuilles","category.tassen-en-portemonnees":"Sacs et portefeuilles"},
  de: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  es: {"category.bags-and-wallets":"Bolsos y carteras","category.tassen-en-portemonnees":"Bolsos y carteras"},
  pt: {"category.bags-and-wallets":"Malas e carteiras","category.tassen-en-portemonnees":"Malas e carteiras"},
  it: {"category.bags-and-wallets":"Borse e portafogli","category.tassen-en-portemonnees":"Borse e portafogli"},
  gr: {"category.bags-and-wallets":"Τσάντες και πορτοφόλια","category.tassen-en-portemonnees":"Τσάντες και πορτοφόλια"},
  pl: {"category.bags-and-wallets":"Torby i portfele","category.tassen-en-portemonnees":"Torby i portfele"},
  cz: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  sk: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  hu: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  ro: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  bg: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  hr: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  sr: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  ba: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  me: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  sq: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  mk: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  lt: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  da: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  sv: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  nb: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  fi: {"category.bags-and-wallets":"Taschen und Geldbörsen","category.tassen-en-portemonnees":"Taschen und Geldbörsen"},
  uk: {"category.bags-and-wallets":"Сумки и кошельки","category.tassen-en-portemonnees":"Сумки и кошельки"},
  ru: {"category.bags-and-wallets":"Сумки и кошельки","category.tassen-en-portemonnees":"Сумки и кошельки"},
  tr: {"category.bags-and-wallets":"Çantalar ve cüzdanlar","category.tassen-en-portemonnees":"Çantalar ve cüzdanlar"},
  he: {"category.bags-and-wallets":"Bags and wallets","category.tassen-en-portemonnees":"Bags and wallets"},
  eg: {"category.bags-and-wallets":"حقائب ومحافظ","category.tassen-en-portemonnees":"حقائب ومحافظ"},
  at: {"category.bags-and-wallets":"حقائب ومحافظ","category.tassen-en-portemonnees":"حقائب ومحافظ"},
  ps: {"category.bags-and-wallets":"حقائب ومحافظ","category.tassen-en-portemonnees":"حقائب ومحافظ"},
  ma: {"category.bags-and-wallets":"حقائب ومحافظ","category.tassen-en-portemonnees":"حقائب ومحافظ"},
  ka: {"category.bags-and-wallets":"Bags and wallets","category.tassen-en-portemonnees":"Bags and wallets"},
  hy: {"category.bags-and-wallets":"Bags and wallets","category.tassen-en-portemonnees":"Bags and wallets"},
  dz: {"category.bags-and-wallets":"حقائب ومحافظ","category.tassen-en-portemonnees":"حقائب ومحافظ"},
  az: {"category.bags-and-wallets":"Çantalar ve cüzdanlar","category.tassen-en-portemonnees":"Çantalar ve cüzdanlar"},
  ja: {"category.bags-and-wallets":"バッグと財布","category.tassen-en-portemonnees":"バッグと財布"},
  zh: {"category.bags-and-wallets":"包和钱包","category.tassen-en-portemonnees":"包和钱包"},
}

export function getCategoryExtraMessages(locale: Locale): typeof EN {
  return BY_LOCALE[locale] ?? EN
}
