import type { Locale } from '@/lib/i18n-locale-registry'

export type ProductOptionMessageKey = 'product.option.choose' | 'product.option.clear'

type ProductOptionMessages = Record<ProductOptionMessageKey, string>

const EN: ProductOptionMessages = {
  'product.option.choose': 'Choose an option',
  'product.option.clear': 'Clear',
}

const BY_LOCALE: Partial<Record<Locale, ProductOptionMessages>> = {
  en: EN,
  nl: { 'product.option.choose': 'Kies een optie', 'product.option.clear': 'Wissen' },
  de: { 'product.option.choose': 'Option wählen', 'product.option.clear': 'Löschen' },
  fr: { 'product.option.choose': 'Choisir une option', 'product.option.clear': 'Effacer' },
  es: { 'product.option.choose': 'Elige una opción', 'product.option.clear': 'Borrar' },
  pt: { 'product.option.choose': 'Escolha uma opção', 'product.option.clear': 'Limpar' },
  it: { 'product.option.choose': 'Scegli un’opzione', 'product.option.clear': 'Cancella' },
  gr: { 'product.option.choose': 'Επιλέξτε μια επιλογή', 'product.option.clear': 'Καθαρισμός' },
  pl: { 'product.option.choose': 'Wybierz opcję', 'product.option.clear': 'Wyczyść' },
  cz: { 'product.option.choose': 'Vyberte možnost', 'product.option.clear': 'Vymazat' },
  sk: { 'product.option.choose': 'Vyberte možnosť', 'product.option.clear': 'Vymazať' },
  hu: { 'product.option.choose': 'Válasszon egy opciót', 'product.option.clear': 'Törlés' },
  ro: { 'product.option.choose': 'Alege o opțiune', 'product.option.clear': 'Șterge' },
  bg: { 'product.option.choose': 'Изберете опция', 'product.option.clear': 'Изчисти' },
  hr: { 'product.option.choose': 'Odaberite opciju', 'product.option.clear': 'Očisti' },
  sr: { 'product.option.choose': 'Изаберите опцију', 'product.option.clear': 'Обриши' },
  ba: { 'product.option.choose': 'Odaberite opciju', 'product.option.clear': 'Očisti' },
  me: { 'product.option.choose': 'Odaberite opciju', 'product.option.clear': 'Očisti' },
  sq: { 'product.option.choose': 'Zgjidh një opsion', 'product.option.clear': 'Pastro' },
  mk: { 'product.option.choose': 'Изберете опција', 'product.option.clear': 'Исчисти' },
  lt: { 'product.option.choose': 'Pasirinkite parinktį', 'product.option.clear': 'Išvalyti' },
  da: { 'product.option.choose': 'Vælg en mulighed', 'product.option.clear': 'Ryd' },
  sv: { 'product.option.choose': 'Välj ett alternativ', 'product.option.clear': 'Rensa' },
  nb: { 'product.option.choose': 'Velg et alternativ', 'product.option.clear': 'Tøm' },
  fi: { 'product.option.choose': 'Valitse vaihtoehto', 'product.option.clear': 'Tyhjennä' },
  uk: { 'product.option.choose': 'Оберіть варіант', 'product.option.clear': 'Очистити' },
  ru: { 'product.option.choose': 'Выберите вариант', 'product.option.clear': 'Очистить' },
  tr: { 'product.option.choose': 'Bir seçenek seçin', 'product.option.clear': 'Temizle' },
  he: { 'product.option.choose': 'בחר אפשרות', 'product.option.clear': 'נקה' },
  eg: { 'product.option.choose': 'اختر خيارًا', 'product.option.clear': 'مسح' },
  at: { 'product.option.choose': 'اختر خيارًا', 'product.option.clear': 'مسح' },
  ps: { 'product.option.choose': 'يو اختيار وټاکئ', 'product.option.clear': 'پاک کړئ' },
  ma: { 'product.option.choose': 'اختر خيارًا', 'product.option.clear': 'مسح' },
  ka: { 'product.option.choose': 'აირჩიეთ ვარიანტი', 'product.option.clear': 'გასუფთავება' },
  hy: { 'product.option.choose': 'Ընտրեք տարբերակ', 'product.option.clear': 'Մաքրել' },
  dz: { 'product.option.choose': 'اختر خيارًا', 'product.option.clear': 'مسح' },
  az: { 'product.option.choose': 'Seçim edin', 'product.option.clear': 'Təmizlə' },
  ja: { 'product.option.choose': 'オプションを選択', 'product.option.clear': 'クリア' },
  zh: { 'product.option.choose': '请选择选项', 'product.option.clear': '清除' },
}

export function getProductOptionMessages(locale: Locale): ProductOptionMessages {
  return BY_LOCALE[locale] ?? EN
}
