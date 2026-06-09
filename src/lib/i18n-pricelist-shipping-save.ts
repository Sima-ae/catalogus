import type { Locale } from '@/lib/i18n-locale-registry'

export type PricelistShippingSaveKey =
  | 'pricelist.saveShipping'
  | 'pricelist.saveShippingFor'

type ShippingSaveMessages = Record<PricelistShippingSaveKey, string>

const EN: ShippingSaveMessages = {
  'pricelist.saveShipping': 'Save shipping cost',
  'pricelist.saveShippingFor': 'Shipping cost for {name}',
}

const BY_LOCALE: Partial<Record<Locale, ShippingSaveMessages>> = {
  en: EN,
  nl: {
    'pricelist.saveShipping': 'Verzendkosten opslaan',
    'pricelist.saveShippingFor': 'Verzendkosten voor {name}',
  },
  de: {
    'pricelist.saveShipping': 'Versandkosten speichern',
    'pricelist.saveShippingFor': 'Versandkosten für {name}',
  },
  fr: {
    'pricelist.saveShipping': 'Enregistrer les frais de livraison',
    'pricelist.saveShippingFor': 'Frais de livraison pour {name}',
  },
  es: {
    'pricelist.saveShipping': 'Guardar gastos de envío',
    'pricelist.saveShippingFor': 'Gastos de envío de {name}',
  },
  pt: {
    'pricelist.saveShipping': 'Guardar custos de envio',
    'pricelist.saveShippingFor': 'Custos de envio de {name}',
  },
  it: {
    'pricelist.saveShipping': 'Salva costi di spedizione',
    'pricelist.saveShippingFor': 'Costi di spedizione per {name}',
  },
  gr: {
    'pricelist.saveShipping': 'Αποθήκευση εξόδων αποστολής',
    'pricelist.saveShippingFor': 'Έξοδα αποστολής για {name}',
  },
  pl: {
    'pricelist.saveShipping': 'Zapisz koszty wysyłki',
    'pricelist.saveShippingFor': 'Koszty wysyłki dla {name}',
  },
  cz: {
    'pricelist.saveShipping': 'Uložit náklady na dopravu',
    'pricelist.saveShippingFor': 'Náklady na dopravu pro {name}',
  },
  sk: {
    'pricelist.saveShipping': 'Uložiť náklady na dopravu',
    'pricelist.saveShippingFor': 'Náklady na dopravu pre {name}',
  },
  hu: {
    'pricelist.saveShipping': 'Szállítási költség mentése',
    'pricelist.saveShippingFor': 'Szállítási költség: {name}',
  },
  ro: {
    'pricelist.saveShipping': 'Salvează costurile de livrare',
    'pricelist.saveShippingFor': 'Costuri de livrare pentru {name}',
  },
  bg: {
    'pricelist.saveShipping': 'Запази разходите за доставка',
    'pricelist.saveShippingFor': 'Разходи за доставка за {name}',
  },
  hr: {
    'pricelist.saveShipping': 'Spremi troškove dostave',
    'pricelist.saveShippingFor': 'Troškovi dostave za {name}',
  },
  sr: {
    'pricelist.saveShipping': 'Сачувај трошкове доставе',
    'pricelist.saveShippingFor': 'Трошкови доставе за {name}',
  },
  ba: {
    'pricelist.saveShipping': 'Sačuvaj troškove dostave',
    'pricelist.saveShippingFor': 'Troškovi dostave za {name}',
  },
  me: {
    'pricelist.saveShipping': 'Sačuvaj troškove dostave',
    'pricelist.saveShippingFor': 'Troškovi dostave za {name}',
  },
  sq: {
    'pricelist.saveShipping': 'Ruaj kostot e transportit',
    'pricelist.saveShippingFor': 'Kostot e transportit për {name}',
  },
  mk: {
    'pricelist.saveShipping': 'Зачувај трошоци за испорака',
    'pricelist.saveShippingFor': 'Трошоци за испорака за {name}',
  },
  lt: {
    'pricelist.saveShipping': 'Išsaugoti pristatymo išlaidas',
    'pricelist.saveShippingFor': 'Pristatymo išlaidos už {name}',
  },
  da: {
    'pricelist.saveShipping': 'Gem forsendelsesomkostninger',
    'pricelist.saveShippingFor': 'Forsendelsesomkostninger for {name}',
  },
  sv: {
    'pricelist.saveShipping': 'Spara fraktkostnader',
    'pricelist.saveShippingFor': 'Fraktkostnader för {name}',
  },
  nb: {
    'pricelist.saveShipping': 'Lagre fraktkostnader',
    'pricelist.saveShippingFor': 'Fraktkostnader for {name}',
  },
  fi: {
    'pricelist.saveShipping': 'Tallenna toimituskulut',
    'pricelist.saveShippingFor': 'Toimituskulut tuotteelle {name}',
  },
  uk: {
    'pricelist.saveShipping': 'Зберегти витрати на доставку',
    'pricelist.saveShippingFor': 'Витрати на доставку для {name}',
  },
  ru: {
    'pricelist.saveShipping': 'Сохранить расходы на доставку',
    'pricelist.saveShippingFor': 'Расходы на доставку для {name}',
  },
  tr: {
    'pricelist.saveShipping': 'Kargo maliyetini kaydet',
    'pricelist.saveShippingFor': '{name} için kargo maliyeti',
  },
  he: {
    'pricelist.saveShipping': 'שמור עלות משלוח',
    'pricelist.saveShippingFor': 'עלות משלוח עבור {name}',
  },
  eg: {
    'pricelist.saveShipping': 'حفظ تكاليف الشحن',
    'pricelist.saveShippingFor': 'تكاليف الشحن لـ {name}',
  },
  at: {
    'pricelist.saveShipping': 'حفظ تكاليف الشحن',
    'pricelist.saveShippingFor': 'تكاليف الشحن لـ {name}',
  },
  ps: {
    'pricelist.saveShipping': 'د لېږد لګښتونه خوندي کړئ',
    'pricelist.saveShippingFor': 'د {name} لپاره د لېږد لګښتونه',
  },
  ma: {
    'pricelist.saveShipping': 'حفظ تكاليف الشحن',
    'pricelist.saveShippingFor': 'تكاليف الشحن لـ {name}',
  },
  ka: {
    'pricelist.saveShipping': 'მიწოდების ხარჯების შენახვა',
    'pricelist.saveShippingFor': 'მიწოდების ხარჯები {name}-ისთვის',
  },
  hy: {
    'pricelist.saveShipping': 'Պահել առաքման ծախսերը',
    'pricelist.saveShippingFor': 'Առաքման ծախսեր {name}-ի համար',
  },
  dz: {
    'pricelist.saveShipping': 'حفظ تكاليف الشحن',
    'pricelist.saveShippingFor': 'تكاليف الشحن لـ {name}',
  },
  az: {
    'pricelist.saveShipping': 'Çatdırılma xərclərini saxla',
    'pricelist.saveShippingFor': '{name} üçün çatdırılma xərcləri',
  },
  ja: {
    'pricelist.saveShipping': '送料を保存',
    'pricelist.saveShippingFor': '{name} の送料',
  },
  zh: {
    'pricelist.saveShipping': '保存运费',
    'pricelist.saveShippingFor': '{name} 的运费',
  },
}

export function getPricelistShippingSaveMessages(locale: Locale): ShippingSaveMessages {
  return BY_LOCALE[locale] ?? EN
}
