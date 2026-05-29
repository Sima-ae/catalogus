import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'

export const CATALOG_MODE_KEY = 'catalog_mode'

export async function isCatalogModeEnabled(): Promise<boolean> {
  const rows = await queryDb<{ value: string | null }[]>(
    'SELECT value FROM settings WHERE `key` = ? LIMIT 1',
    [CATALOG_MODE_KEY]
  )
  const value = rows[0]?.value?.trim().toLowerCase()
  return value === 'true' || value === '1'
}

export async function setCatalogMode(enabled: boolean): Promise<void> {
  await queryDb(
    `INSERT INTO settings (id, \`key\`, value, description)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
    [
      randomUUID(),
      CATALOG_MODE_KEY,
      enabled ? 'true' : 'false',
      'When true, storefront is browse-only (no cart/checkout prompts)',
    ]
  )
}
