import { queryDb } from '@/lib/db'
import {
  formatTagTranslatedLabel,
  normalizeTagName,
  tagI18nKey,
} from '@/lib/tag-i18n-key'
import { parseProductJsonField } from '@/lib/product-serialize'
import { translateFromEnglish } from '@/lib/translate-text'
import {
  SUPPORTED_LOCALES,
  type Locale,
  isLocale,
} from '@/lib/i18n-locale-registry'
import { getCachedValue, invalidateCachedNamespace } from '@/lib/server-ttl-cache'

const TAG_I18N_CACHE_NS = 'tag-i18n-messages'
const TAG_I18N_TTL_MS = 60_000

export async function tagTranslationsTableExists(): Promise<boolean> {
  try {
    const rows = await queryDb<{ TABLE_NAME: string }[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tag_translations'`
    )
    return rows.length > 0
  } catch {
    return false
  }
}

async function upsertTagTranslation(
  tagName: string,
  locale: string,
  label: string
): Promise<void> {
  await queryDb(
    `INSERT INTO tag_translations (tag_name, locale, label)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE label = VALUES(label), updated_at = CURRENT_TIMESTAMP`,
    [tagName, locale, label]
  )
}

/** Generate and store labels for every supported locale. */
export async function syncTagTranslations(tagName: string): Promise<void> {
  if (!(await tagTranslationsTableExists())) return

  const sourceName = normalizeTagName(tagName)
  if (!sourceName) return

  const locales = SUPPORTED_LOCALES.filter((code): code is Locale => isLocale(code))
  const batchSize = 6

  for (let i = 0; i < locales.length; i += batchSize) {
    const batch = locales.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (locale) => {
        let label = sourceName
        if (locale !== 'en') {
          const translated = await translateFromEnglish(sourceName, locale)
          label = formatTagTranslatedLabel(sourceName, translated)
        }
        await upsertTagTranslation(sourceName, locale, label)
      })
    )
  }

  invalidateCachedNamespace(TAG_I18N_CACHE_NS)
}

export async function syncTagTranslationsForTags(
  tags: string[] | null | undefined
): Promise<void> {
  if (!tags?.length) return
  const seen = new Set<string>()
  for (const raw of tags) {
    const name = normalizeTagName(raw)
    if (!name || seen.has(name)) continue
    seen.add(name)
    await syncTagTranslations(name)
  }
}

export async function listDistinctProductTags(): Promise<string[]> {
  const rows = await queryDb<{ tags: unknown }[]>(
    `SELECT tags FROM products WHERE tags IS NOT NULL AND tags != '' AND tags != '[]'`
  )
  const names = new Set<string>()
  for (const row of rows) {
    const parsed = parseProductJsonField(row.tags)
    if (!parsed?.length) continue
    for (const tag of parsed) {
      const name = normalizeTagName(tag)
      if (name) names.add(name)
    }
  }
  return Array.from(names)
}

export async function syncAllTagTranslations(): Promise<number> {
  const tags = await listDistinctProductTags()
  for (const tag of tags) {
    await syncTagTranslations(tag)
  }
  return tags.length
}

/** Message map merged into `getMessages` — static bundles override these when both exist. */
export async function getTagTranslationMessages(
  locale: Locale
): Promise<Record<string, string>> {
  if (!(await tagTranslationsTableExists())) return {}

  return getCachedValue(TAG_I18N_CACHE_NS, locale, TAG_I18N_TTL_MS, async () => {
    const rows = await queryDb<{ tag_name: string; label: string }[]>(
      `SELECT tag_name, label FROM tag_translations WHERE locale = ?`,
      [locale]
    )

    const messages: Record<string, string> = {}
    for (const row of rows) {
      const name = normalizeTagName(row.tag_name)
      const label = String(row.label ?? '').trim()
      if (!name || !label) continue
      messages[tagI18nKey(name)] = label
    }
    return messages
  })
}

export function invalidateTagTranslationCache(): void {
  invalidateCachedNamespace(TAG_I18N_CACHE_NS)
}
