import type { Locale } from '@/lib/i18n-locale-registry'

export type AddedDialogMessageKey = 'product.addedDialog.title'

type AddedDialogMessages = Record<AddedDialogMessageKey, string>

/** Short ATC dialog title — one word / short phrase per locale. */
const EN: AddedDialogMessages = {
  'product.addedDialog.title': 'Added',
}

const BY_LOCALE: Partial<Record<Locale, AddedDialogMessages>> = {
  en: EN,
  nl: { 'product.addedDialog.title': 'Toegevoegd' },
  fr: { 'product.addedDialog.title': 'Ajouté' },
  de: { 'product.addedDialog.title': 'Hinzugefügt' },
  es: { 'product.addedDialog.title': 'Añadido' },
  pt: { 'product.addedDialog.title': 'Adicionado' },
  it: { 'product.addedDialog.title': 'Aggiunto' },
  gr: { 'product.addedDialog.title': 'Προστέθηκε' },
  pl: { 'product.addedDialog.title': 'Dodano' },
  cz: { 'product.addedDialog.title': 'Přidáno' },
  sk: { 'product.addedDialog.title': 'Pridané' },
  hu: { 'product.addedDialog.title': 'Hozzáadva' },
  ro: { 'product.addedDialog.title': 'Adăugat' },
  bg: { 'product.addedDialog.title': 'Добавено' },
  hr: { 'product.addedDialog.title': 'Dodano' },
  sr: { 'product.addedDialog.title': 'Додато' },
  ba: { 'product.addedDialog.title': 'Dodato' },
  me: { 'product.addedDialog.title': 'Dodato' },
  sq: { 'product.addedDialog.title': 'Shtuar' },
  mk: { 'product.addedDialog.title': 'Додадено' },
  lt: { 'product.addedDialog.title': 'Pridėta' },
  da: { 'product.addedDialog.title': 'Tilføjet' },
  sv: { 'product.addedDialog.title': 'Tillagd' },
  nb: { 'product.addedDialog.title': 'Lagt til' },
  fi: { 'product.addedDialog.title': 'Lisätty' },
  uk: { 'product.addedDialog.title': 'Додано' },
  ru: { 'product.addedDialog.title': 'Добавлено' },
  tr: { 'product.addedDialog.title': 'Eklendi' },
  he: { 'product.addedDialog.title': 'נוסף' },
  eg: { 'product.addedDialog.title': 'تمت الإضافة' },
  at: { 'product.addedDialog.title': 'تمت الإضافة' },
  ps: { 'product.addedDialog.title': 'تمت الإضافة' },
  ma: { 'product.addedDialog.title': 'تمت الإضافة' },
  dz: { 'product.addedDialog.title': 'تمت الإضافة' },
  ka: { 'product.addedDialog.title': 'დაემატა' },
  hy: { 'product.addedDialog.title': 'Ավելացվեց' },
  az: { 'product.addedDialog.title': 'Əlavə olundu' },
  ja: { 'product.addedDialog.title': '追加しました' },
  zh: { 'product.addedDialog.title': '已添加' },
}

export function getAddedDialogMessages(locale: Locale): AddedDialogMessages {
  return BY_LOCALE[locale] ?? EN
}
