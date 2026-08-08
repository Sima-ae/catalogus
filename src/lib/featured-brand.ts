import { randomUUID } from 'crypto'
import { queryDb, getDbPool } from '@/lib/db'
import { invalidateCachedNamespace } from '@/lib/server-ttl-cache'
import {
  FEATURED_BRAND_KEYS,
  clampFeaturedBrandValue,
  rowsToFeaturedBrand,
  type FeaturedBrandKey,
  type FeaturedBrandSettings,
} from '@/lib/featured-brand-shared'

export {
  FEATURED_BRAND_KEYS,
  DEFAULT_FEATURED_BRAND_SETTINGS,
  formatFooterCopyright,
  resolveFeaturedDisplayBrand,
  rowsToFeaturedBrand,
  type FeaturedBrandKey,
  type FeaturedBrandSettings,
} from '@/lib/featured-brand-shared'

type SettingRow = { key: string; value: string | null }

export async function loadFeaturedBrandSettings(): Promise<FeaturedBrandSettings> {
  const placeholders = FEATURED_BRAND_KEYS.map(() => '?').join(', ')
  const rows = await queryDb<SettingRow[]>(
    `SELECT \`key\`, value FROM settings WHERE \`key\` IN (${placeholders})`,
    [...FEATURED_BRAND_KEYS]
  )
  return rowsToFeaturedBrand(rows)
}

export async function saveFeaturedBrandSettings(
  updates: Partial<FeaturedBrandSettings>
): Promise<FeaturedBrandSettings> {
  const entries = FEATURED_BRAND_KEYS.filter((key) => updates[key] !== undefined).map((key) => ({
    key,
    value: clampFeaturedBrandValue(key, String(updates[key] ?? '')),
  }))

  if (!entries.length) return loadFeaturedBrandSettings()

  const conn = await getDbPool().getConnection()
  try {
    await conn.beginTransaction()
    for (const { key, value } of entries) {
      await conn.execute(
        `INSERT INTO settings (id, \`key\`, value, description)
         VALUES (?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
        [randomUUID(), key, value]
      )
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  invalidateCachedNamespace('shop-bootstrap')
  invalidateCachedNamespace('featured-brand')
  invalidateCachedNamespace('site-seo')
  return loadFeaturedBrandSettings()
}
