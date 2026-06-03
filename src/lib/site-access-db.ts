import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { DEFAULT_SITE_ACCESS } from '@/lib/site-access-keys'
import { countSiteAccessCodes } from '@/lib/site-access-codes-db'
import { hashSiteAccessPassword } from '@/lib/site-access'

async function upsertSetting(key: string, value: string) {
  await queryDb(
    `INSERT INTO settings (id, \`key\`, value, description)
     VALUES (?, ?, ?, NULL)
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
    [randomUUID(), key, value]
  )
}

async function bumpVersion(): Promise<number> {
  const rows = await queryDb<{ value: string | null }[]>(
    `SELECT value FROM settings WHERE \`key\` = 'site_access_version' LIMIT 1`
  )
  const current = Number.parseInt(rows[0]?.value || '0', 10) || 0
  const next = current + 1
  await upsertSetting('site_access_version', String(next))
  return next
}

export async function saveSiteAccessForAdmin(input: {
  enabled?: boolean
  newPassword?: string | null
  clearPassword?: boolean
}) {
  if (input.clearPassword) {
    await upsertSetting('site_access_enabled', 'false')
    await upsertSetting('site_access_password_hash', '')
    await bumpVersion()
    return
  }

  if (input.enabled === false) {
    await upsertSetting('site_access_enabled', 'false')
    await bumpVersion()
    return
  }

  if (input.newPassword?.trim()) {
    const hash = await hashSiteAccessPassword(input.newPassword.trim())
    await upsertSetting('site_access_password_hash', hash)
    await upsertSetting('site_access_enabled', 'true')
    await bumpVersion()
    return
  }

  if (input.enabled === true) {
    const stats = await countSiteAccessCodes()
    const rows = await queryDb<{ value: string | null }[]>(
      `SELECT value FROM settings WHERE \`key\` = 'site_access_password_hash' LIMIT 1`
    )
    const hasLegacyPassword = Boolean(rows[0]?.value?.trim())
    if (stats.total === 0 && !hasLegacyPassword) {
      throw new Error('NO_SITE_ACCESS_CODES')
    }
    await upsertSetting('site_access_enabled', 'true')
    await bumpVersion()
  }
}

export async function getSiteAccessCodeStatsForAdmin() {
  return countSiteAccessCodes()
}

export async function ensureSiteAccessDefaults() {
  for (const [key, value] of Object.entries(DEFAULT_SITE_ACCESS)) {
    await queryDb(
      `INSERT IGNORE INTO settings (id, \`key\`, value, description)
       VALUES (?, ?, ?, NULL)`,
      [randomUUID(), key, value]
    )
  }
}
