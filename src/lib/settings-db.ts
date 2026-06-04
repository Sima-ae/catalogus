import { randomUUID } from 'crypto'
import { getDbPool, queryDb } from '@/lib/db'
import {
  DEFAULT_SITE_SETTINGS,
  SETTING_KEYS,
  type SettingKey,
  type SiteSettings,
} from '@/lib/site-settings'
import { normalizeSiteTaglineForStorage } from '@/lib/site-tagline'

export { SETTING_KEYS, DEFAULT_SITE_SETTINGS, type SettingKey, type SiteSettings }

type SettingRow = { key: string; value: string | null }

export function rowsToSettings(rows: SettingRow[]): SiteSettings {
  const out = { ...DEFAULT_SITE_SETTINGS }
  for (const row of rows) {
    if (SETTING_KEYS.includes(row.key as SettingKey)) {
      out[row.key as SettingKey] = row.value ?? ''
    }
  }
  return out
}

export async function listSettings(): Promise<SiteSettings> {
  const rows = await queryDb<SettingRow[]>(
    'SELECT `key`, value FROM settings ORDER BY `key` ASC'
  )
  return rowsToSettings(rows)
}

export async function upsertSettings(updates: Partial<SiteSettings>) {
  const entries = SETTING_KEYS.filter((key) => updates[key] !== undefined).map((key) => ({
    key,
    value:
      key === 'site_tagline'
        ? normalizeSiteTaglineForStorage(String(updates[key] ?? ''))
        : String(updates[key] ?? '').trim(),
  }))

  if (!entries.length) return listSettings()

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
    const [rows] = await conn.query('SELECT `key`, value FROM settings ORDER BY `key` ASC')
    return rowsToSettings(rows as SettingRow[])
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
