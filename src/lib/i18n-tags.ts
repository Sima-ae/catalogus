import { tagI18nKey } from '@/lib/tag-i18n-key'

type Translator = (key: string) => string

/** Translate product tag labels for the active shop locale. */
export function getTagLabel(tag: string, t: Translator): string {
  const raw = String(tag ?? '').trim()
  if (!raw) return raw

  const key = tagI18nKey(raw)
  const translated = t(key)
  if (translated && translated !== key) return translated
  return raw
}
