import { queryDb } from '@/lib/db'
import { categoryI18nKey, formatCategoryTranslatedLabel } from '@/lib/category-i18n-key'
import { getCategoryManualTranslation } from '@/lib/category-manual-translations'
import { getCategoryById, listCategories } from '@/lib/products-db'
import { translateFromEnglish } from '@/lib/translate-text'
import {
  SUPPORTED_LOCALES,
  type Locale,
  isLocale,
} from '@/lib/i18n-locale-registry'
import { getCachedValue, invalidateCachedNamespace } from '@/lib/server-ttl-cache'

const CATEGORY_I18N_CACHE_NS = 'category-i18n-messages'
const CATEGORY_I18N_TTL_MS = 60_000

export async function categoryTranslationsTableExists(): Promise<boolean> {
  try {
    const rows = await queryDb<{ TABLE_NAME: string }[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'category_translations'`
    )
    return rows.length > 0
  } catch {
    return false
  }
}

async function upsertCategoryTranslation(
  categoryId: string,
  locale: string,
  label: string
): Promise<void> {
  await queryDb(
    `INSERT INTO category_translations (category_id, locale, label)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE label = VALUES(label), updated_at = CURRENT_TIMESTAMP`,
    [categoryId, locale, label]
  )
}

export async function deleteCategoryTranslations(categoryId: string): Promise<void> {
  if (!(await categoryTranslationsTableExists())) return
  await queryDb('DELETE FROM category_translations WHERE category_id = ?', [categoryId])
  invalidateCachedNamespace(CATEGORY_I18N_CACHE_NS)
}

/** Generate and store labels for every supported locale. */
export async function syncCategoryTranslations(categoryId: string): Promise<void> {
  if (!(await categoryTranslationsTableExists())) return

  const category = await getCategoryById(categoryId)
  if (!category?.name) return

  const sourceName = String(category.name).trim()
  if (!sourceName) return

  const locales = SUPPORTED_LOCALES.filter((code): code is Locale => isLocale(code))
  const batchSize = 6

  for (let i = 0; i < locales.length; i += batchSize) {
    const batch = locales.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (locale) => {
        const manual = getCategoryManualTranslation(sourceName, locale)
        let label = manual ?? sourceName
        if (!manual && locale !== 'en') {
          const translated = await translateFromEnglish(sourceName, locale)
          label = formatCategoryTranslatedLabel(sourceName, translated)
        }
        await upsertCategoryTranslation(categoryId, locale, label)
      })
    )
  }

  invalidateCachedNamespace(CATEGORY_I18N_CACHE_NS)
}

export async function syncAllCategoryTranslations(): Promise<number> {
  const rows = await listCategories(false)
  let count = 0
  for (const row of rows) {
    const id = String(row.id ?? '')
    if (!id) continue
    await syncCategoryTranslations(id)
    count += 1
  }
  return count
}

/** Message map merged into `getMessages` — static bundles override these when both exist. */
export async function getCategoryTranslationMessages(
  locale: Locale
): Promise<Record<string, string>> {
  if (!(await categoryTranslationsTableExists())) return {}

  return getCachedValue(CATEGORY_I18N_CACHE_NS, locale, CATEGORY_I18N_TTL_MS, async () => {
    const rows = await queryDb<{ name: string; label: string }[]>(
      `SELECT c.name, ct.label
       FROM category_translations ct
       INNER JOIN categories c ON c.id = ct.category_id
       WHERE ct.locale = ? AND c.active = 1`,
      [locale]
    )

    const messages: Record<string, string> = {}
    for (const row of rows) {
      const name = String(row.name ?? '').trim()
      const label = String(row.label ?? '').trim()
      if (!name || !label) continue
      messages[categoryI18nKey(name)] = label
    }
    return messages
  })
}

export function invalidateCategoryTranslationCache(): void {
  invalidateCachedNamespace(CATEGORY_I18N_CACHE_NS)
}
