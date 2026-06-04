import type { Locale } from '@/lib/i18n-locale-registry'

export type PricelistStockMessageKey =
  | 'pricelist.outOfStock'
  | 'pricelist.temporarilyOutOfStock'
  | 'pricelist.stockStatusAria'
  | 'pricelist.stockStatusSetPrice'

type StockMessages = Record<PricelistStockMessageKey, string>

const EN: StockMessages = {
  'pricelist.outOfStock': 'Out of stock',
  'pricelist.temporarilyOutOfStock': 'Temporarily out of stock',
  'pricelist.stockStatusAria': 'Stock status',
  'pricelist.stockStatusSetPrice': 'Set price',
}

const BY_LOCALE: Partial<Record<Locale, StockMessages>> = {
  en: EN,
  nl: {
    'pricelist.outOfStock': 'Uitverkocht',
    'pricelist.temporarilyOutOfStock': 'Tijdelijk uitverkocht',
    'pricelist.stockStatusAria': 'Voorraadstatus',
    'pricelist.stockStatusSetPrice': 'Prijs invoeren',
  },
  de: {
    'pricelist.outOfStock': 'Nicht auf Lager',
    'pricelist.temporarilyOutOfStock': 'Vorübergehend nicht auf Lager',
    'pricelist.stockStatusAria': 'Lagerstatus',
    'pricelist.stockStatusSetPrice': 'Preis eingeben',
  },
  fr: {
    'pricelist.outOfStock': 'Rupture de stock',
    'pricelist.temporarilyOutOfStock': 'Temporairement en rupture',
    'pricelist.stockStatusAria': 'Statut de stock',
    'pricelist.stockStatusSetPrice': 'Saisir un prix',
  },
  es: {
    'pricelist.outOfStock': 'Agotado',
    'pricelist.temporarilyOutOfStock': 'Temporalmente agotado',
    'pricelist.stockStatusAria': 'Estado de stock',
    'pricelist.stockStatusSetPrice': 'Introducir precio',
  },
  pt: {
    'pricelist.outOfStock': 'Esgotado',
    'pricelist.temporarilyOutOfStock': 'Temporariamente esgotado',
    'pricelist.stockStatusAria': 'Estado de stock',
    'pricelist.stockStatusSetPrice': 'Definir preço',
  },
  it: {
    'pricelist.outOfStock': 'Esaurito',
    'pricelist.temporarilyOutOfStock': 'Temporaneamente esaurito',
    'pricelist.stockStatusAria': 'Stato disponibilità',
    'pricelist.stockStatusSetPrice': 'Imposta prezzo',
  },
  gr: {
    'pricelist.outOfStock': 'Εξαντλημένο',
    'pricelist.temporarilyOutOfStock': 'Προσωρινά εξαντλημένο',
    'pricelist.stockStatusAria': 'Κατάσταση αποθέματος',
    'pricelist.stockStatusSetPrice': 'Ορισμός τιμής',
  },
  pl: {
    'pricelist.outOfStock': 'Brak w magazynie',
    'pricelist.temporarilyOutOfStock': 'Tymczasowo niedostępne',
    'pricelist.stockStatusAria': 'Status magazynowy',
    'pricelist.stockStatusSetPrice': 'Ustaw cenę',
  },
  cz: {
    'pricelist.outOfStock': 'Vyprodáno',
    'pricelist.temporarilyOutOfStock': 'Dočasně vyprodáno',
    'pricelist.stockStatusAria': 'Stav skladu',
    'pricelist.stockStatusSetPrice': 'Zadat cenu',
  },
  sk: {
    'pricelist.outOfStock': 'Vypredané',
    'pricelist.temporarilyOutOfStock': 'Dočasne vypredané',
    'pricelist.stockStatusAria': 'Stav skladu',
    'pricelist.stockStatusSetPrice': 'Zadať cenu',
  },
  hu: {
    'pricelist.outOfStock': 'Nincs raktáron',
    'pricelist.temporarilyOutOfStock': 'Átmenetileg nincs raktáron',
    'pricelist.stockStatusAria': 'Készlet állapota',
    'pricelist.stockStatusSetPrice': 'Ár megadása',
  },
  ro: {
    'pricelist.outOfStock': 'Stoc epuizat',
    'pricelist.temporarilyOutOfStock': 'Temporar indisponibil',
    'pricelist.stockStatusAria': 'Stare stoc',
    'pricelist.stockStatusSetPrice': 'Setează preț',
  },
  bg: {
    'pricelist.outOfStock': 'Изчерпан',
    'pricelist.temporarilyOutOfStock': 'Временно изчерпан',
    'pricelist.stockStatusAria': 'Статус на наличност',
    'pricelist.stockStatusSetPrice': 'Задай цена',
  },
  hr: {
    'pricelist.outOfStock': 'Nema na zalihi',
    'pricelist.temporarilyOutOfStock': 'Privremeno nema na zalihi',
    'pricelist.stockStatusAria': 'Status zaliha',
    'pricelist.stockStatusSetPrice': 'Unesi cijenu',
  },
  sr: {
    'pricelist.outOfStock': 'Нема на залихи',
    'pricelist.temporarilyOutOfStock': 'Привремено нема на залихи',
    'pricelist.stockStatusAria': 'Статус залихе',
    'pricelist.stockStatusSetPrice': 'Унеси цену',
  },
  ba: {
    'pricelist.outOfStock': 'Nema na zalihi',
    'pricelist.temporarilyOutOfStock': 'Privremeno nema na zalihi',
    'pricelist.stockStatusAria': 'Status zaliha',
    'pricelist.stockStatusSetPrice': 'Unesi cijenu',
  },
  me: {
    'pricelist.outOfStock': 'Nema na zalihi',
    'pricelist.temporarilyOutOfStock': 'Privremeno nema na zalihi',
    'pricelist.stockStatusAria': 'Status zaliha',
    'pricelist.stockStatusSetPrice': 'Unesi cijenu',
  },
  sq: {
    'pricelist.outOfStock': 'Jashtë stokut',
    'pricelist.temporarilyOutOfStock': 'Përkohësisht jashtë stokut',
    'pricelist.stockStatusAria': 'Statusi i stokut',
    'pricelist.stockStatusSetPrice': 'Vendos çmimin',
  },
  mk: {
    'pricelist.outOfStock': 'Нема на залиха',
    'pricelist.temporarilyOutOfStock': 'Привремено нема на залиха',
    'pricelist.stockStatusAria': 'Статус на залиха',
    'pricelist.stockStatusSetPrice': 'Внеси цена',
  },
  lt: {
    'pricelist.outOfStock': 'Išparduota',
    'pricelist.temporarilyOutOfStock': 'Laikinai išparduota',
    'pricelist.stockStatusAria': 'Atsargų būsena',
    'pricelist.stockStatusSetPrice': 'Nustatyti kainą',
  },
  da: {
    'pricelist.outOfStock': 'Udsolgt',
    'pricelist.temporarilyOutOfStock': 'Midlertidigt udsolgt',
    'pricelist.stockStatusAria': 'Lagerstatus',
    'pricelist.stockStatusSetPrice': 'Angiv pris',
  },
  sv: {
    'pricelist.outOfStock': 'Slut i lager',
    'pricelist.temporarilyOutOfStock': 'Tillfälligt slut',
    'pricelist.stockStatusAria': 'Lagerstatus',
    'pricelist.stockStatusSetPrice': 'Ange pris',
  },
  nb: {
    'pricelist.outOfStock': 'Utsolgt',
    'pricelist.temporarilyOutOfStock': 'Midlertidig utsolgt',
    'pricelist.stockStatusAria': 'Lagerstatus',
    'pricelist.stockStatusSetPrice': 'Angi pris',
  },
  fi: {
    'pricelist.outOfStock': 'Loppu varastosta',
    'pricelist.temporarilyOutOfStock': 'Tilapäisesti loppu',
    'pricelist.stockStatusAria': 'Varastotila',
    'pricelist.stockStatusSetPrice': 'Aseta hinta',
  },
  uk: {
    'pricelist.outOfStock': 'Немає в наявності',
    'pricelist.temporarilyOutOfStock': 'Тимчасово немає в наявності',
    'pricelist.stockStatusAria': 'Статус наявності',
    'pricelist.stockStatusSetPrice': 'Вказати ціну',
  },
  ru: {
    'pricelist.outOfStock': 'Нет в наличии',
    'pricelist.temporarilyOutOfStock': 'Временно нет в наличии',
    'pricelist.stockStatusAria': 'Статус наличия',
    'pricelist.stockStatusSetPrice': 'Указать цену',
  },
  tr: {
    'pricelist.outOfStock': 'Stokta yok',
    'pricelist.temporarilyOutOfStock': 'Geçici olarak stokta yok',
    'pricelist.stockStatusAria': 'Stok durumu',
    'pricelist.stockStatusSetPrice': 'Fiyat gir',
  },
  he: {
    'pricelist.outOfStock': 'אזל מהמלאי',
    'pricelist.temporarilyOutOfStock': 'אזל זמנית מהמלאי',
    'pricelist.stockStatusAria': 'סטטוס מלאי',
    'pricelist.stockStatusSetPrice': 'הזן מחיר',
  },
  eg: {
    'pricelist.outOfStock': 'غير متوفر',
    'pricelist.temporarilyOutOfStock': 'غير متوفر مؤقتًا',
    'pricelist.stockStatusAria': 'حالة المخزون',
    'pricelist.stockStatusSetPrice': 'إدخال السعر',
  },
  at: {
    'pricelist.outOfStock': 'غير متوفر',
    'pricelist.temporarilyOutOfStock': 'غير متوفر مؤقتًا',
    'pricelist.stockStatusAria': 'حالة المخزون',
    'pricelist.stockStatusSetPrice': 'إدخال السعر',
  },
  ps: {
    'pricelist.outOfStock': 'غیر موجود',
    'pricelist.temporarilyOutOfStock': 'موقتاً ناموجود',
    'pricelist.stockStatusAria': 'حالت موجودی',
    'pricelist.stockStatusSetPrice': 'قیمت وارد کنید',
  },
  ma: {
    'pricelist.outOfStock': 'غير متوفر',
    'pricelist.temporarilyOutOfStock': 'غير متوفر مؤقتًا',
    'pricelist.stockStatusAria': 'حالة المخزون',
    'pricelist.stockStatusSetPrice': 'إدخال السعر',
  },
  ka: {
    'pricelist.outOfStock': 'არ არის მარაგში',
    'pricelist.temporarilyOutOfStock': 'დროებით არ არის მარაგში',
    'pricelist.stockStatusAria': 'მარაგის სტატუსი',
    'pricelist.stockStatusSetPrice': 'ფასის შეყვანა',
  },
  hy: {
    'pricelist.outOfStock': 'Առկա չէ',
    'pricelist.temporarilyOutOfStock': 'Ժամանակավորապես առկա չէ',
    'pricelist.stockStatusAria': 'Պահեստի կարգավիճակ',
    'pricelist.stockStatusSetPrice': 'Նշել գին',
  },
  dz: {
    'pricelist.outOfStock': 'غير متوفر',
    'pricelist.temporarilyOutOfStock': 'غير متوفر مؤقتًا',
    'pricelist.stockStatusAria': 'حالة المخزون',
    'pricelist.stockStatusSetPrice': 'إدخال السعر',
  },
  az: {
    'pricelist.outOfStock': 'Stokda yoxdur',
    'pricelist.temporarilyOutOfStock': 'Müvəqqəti stokda yoxdur',
    'pricelist.stockStatusAria': 'Stok statusu',
    'pricelist.stockStatusSetPrice': 'Qiymət daxil et',
  },
  ja: {
    'pricelist.outOfStock': '在庫切れ',
    'pricelist.temporarilyOutOfStock': '一時的に在庫切れ',
    'pricelist.stockStatusAria': '在庫状況',
    'pricelist.stockStatusSetPrice': '価格を入力',
  },
  zh: {
    'pricelist.outOfStock': '缺货',
    'pricelist.temporarilyOutOfStock': '暂时缺货',
    'pricelist.stockStatusAria': '库存状态',
    'pricelist.stockStatusSetPrice': '输入价格',
  },
}

export function getPricelistOutOfStockMessages(locale: Locale): StockMessages {
  return BY_LOCALE[locale] ?? EN
}
