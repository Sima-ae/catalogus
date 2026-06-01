import bcrypt from 'bcryptjs'
import { queryDb } from '@/lib/db'

export type PricelistShareSettings = {
  list_owner_id: string
  password_hash: string | null
  version: number
  has_password: boolean
}

export async function getPricelistShareSettings(
  listOwnerId: string
): Promise<PricelistShareSettings> {
  const rows = await queryDb<
    { list_owner_id: string; password_hash: string | null; version: number }[]
  >(
    `SELECT list_owner_id, password_hash, version FROM pricelist_share_settings WHERE list_owner_id = ? LIMIT 1`,
    [listOwnerId]
  )
  const row = rows[0]
  if (!row) {
    return {
      list_owner_id: listOwnerId,
      password_hash: null,
      version: 0,
      has_password: false,
    }
  }
  const hash = row.password_hash?.trim() || null
  return {
    list_owner_id: row.list_owner_id,
    password_hash: hash,
    version: row.version ?? 0,
    has_password: Boolean(hash),
  }
}

export async function setPricelistSharePassword(
  listOwnerId: string,
  password: string | null
): Promise<PricelistShareSettings> {
  const trimmed = password?.trim() ?? ''
  const existing = await getPricelistShareSettings(listOwnerId)
  const nextVersion = existing.version + 1

  if (!trimmed) {
    await queryDb(
      `INSERT INTO pricelist_share_settings (list_owner_id, password_hash, version)
       VALUES (?, NULL, ?)
       ON DUPLICATE KEY UPDATE password_hash = NULL, version = VALUES(version), updated_at = CURRENT_TIMESTAMP`,
      [listOwnerId, nextVersion]
    )
    return getPricelistShareSettings(listOwnerId)
  }

  const password_hash = await bcrypt.hash(trimmed, 10)
  await queryDb(
    `INSERT INTO pricelist_share_settings (list_owner_id, password_hash, version)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), version = VALUES(version), updated_at = CURRENT_TIMESTAMP`,
    [listOwnerId, password_hash, nextVersion]
  )
  return getPricelistShareSettings(listOwnerId)
}

export async function verifyPricelistSharePassword(
  listOwnerId: string,
  password: string
): Promise<boolean> {
  const settings = await getPricelistShareSettings(listOwnerId)
  if (!settings.password_hash) return false
  return bcrypt.compare(password, settings.password_hash)
}
