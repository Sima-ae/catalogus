import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'
import {
  clearDevSiteAccessPassword,
  setDevSiteAccessEnabled,
  setDevSiteAccessPasswordHash,
} from '@/lib/dev-site-access'
import { DEFAULT_SITE_ACCESS } from '@/lib/site-access-keys'
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
  if (isDevDataFallbackEnabled()) {
    if (input.clearPassword) {
      clearDevSiteAccessPassword()
      return
    }
    if (input.enabled === false) {
      setDevSiteAccessEnabled(false)
      return
    }
    if (input.newPassword?.trim()) {
      const hash = await hashSiteAccessPassword(input.newPassword.trim())
      setDevSiteAccessPasswordHash(hash, true)
      return
    }
    if (input.enabled === true) {
      setDevSiteAccessEnabled(true)
    }
    return
  }

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
    await upsertSetting('site_access_enabled', 'true')
  }
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
