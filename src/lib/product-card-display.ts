import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'

/** When true, product grid cards show price and short description (default). */
export const PRODUCT_CARD_SHOW_DETAILS_KEY = 'product_card_show_details'

export async function isProductCardDetailsEnabled(): Promise<boolean> {
  const rows = await queryDb<{ value: string | null }[]>(
    'SELECT value FROM settings WHERE `key` = ? LIMIT 1',
    [PRODUCT_CARD_SHOW_DETAILS_KEY]
  )
  const value = rows[0]?.value?.trim().toLowerCase()
  if (!value) return true
  return value === 'true' || value === '1'
}

export async function setProductCardDetailsEnabled(enabled: boolean): Promise<void> {
  await queryDb(
    `INSERT INTO settings (id, \`key\`, value, description)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
    [
      randomUUID(),
      PRODUCT_CARD_SHOW_DETAILS_KEY,
      enabled ? 'true' : 'false',
      'When false, shop product cards show only image and title',
    ]
  )
}
