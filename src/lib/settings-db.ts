import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import {
  DEFAULT_SITE_SETTINGS,
  SETTING_KEYS,
  type SettingKey,
  type SiteSettings,
} from '@/lib/site-settings'

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
  for (const key of SETTING_KEYS) {
    if (updates[key] === undefined) continue
    const value = String(updates[key] ?? '').trim()
    await queryDb(
      `INSERT INTO settings (id, \`key\`, value, description)
       VALUES (?, ?, ?, NULL)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
      [randomUUID(), key, value]
    )
  }
  return listSettings()
}
