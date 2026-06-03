import bcrypt from 'bcryptjs'
import { queryDb } from '@/lib/db'
import {
  DEFAULT_SITE_ACCESS,
  SITE_ACCESS_KEYS,
  type SiteAccessSettingKey,
} from '@/lib/site-access-keys'
import { countSiteAccessCodes, verifySiteAccessCode } from '@/lib/site-access-codes-db'

export {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_META_REQUIRED,
  SITE_ACCESS_META_VERSION,
  applySiteAccessCookies,
  createUnlockToken,
  getCookieSecret,
  getSiteAccessCookieOptions,
  getSiteAccessMetaCookieOptions,
  readUnlockCookie,
  verifyUnlockToken,
} from '@/lib/site-access-cookie'

export type SiteAccessConfig = {
  required: boolean
  version: number
  passwordHash: string | null
  hasCodes: boolean
}

type SettingRow = { key: string; value: string | null }

async function loadSiteAccessRows(): Promise<SettingRow[]> {
  return queryDb<SettingRow[]>(
    `SELECT \`key\`, value FROM settings WHERE \`key\` IN (?, ?, ?)`,
    [...SITE_ACCESS_KEYS]
  )
}

export async function getSiteAccessConfig(): Promise<SiteAccessConfig> {
  const rows = await loadSiteAccessRows()
  const map: Record<string, string> = { ...DEFAULT_SITE_ACCESS }
  for (const row of rows) {
    if (SITE_ACCESS_KEYS.includes(row.key as SiteAccessSettingKey)) {
      map[row.key] = row.value ?? ''
    }
  }

  const passwordHash = map.site_access_password_hash.trim() || null
  const enabled = map.site_access_enabled === 'true'
  const version = Number.parseInt(map.site_access_version || '0', 10) || 0
  const codeStats = await countSiteAccessCodes()
  const hasCodes = codeStats.total > 0

  return {
    required: enabled && (hasCodes || !!passwordHash),
    version,
    passwordHash,
    hasCodes,
  }
}

/** Site password and personal buyer codes are separate; either unlocks the gate. */
export async function verifySiteAccessCredential(input: string): Promise<boolean> {
  if (await verifySiteAccessPassword(input)) return true
  return verifySiteAccessCode(input)
}

export async function verifySiteAccessPassword(
  password: string
): Promise<boolean> {
  const config = await getSiteAccessConfig()
  if (!config.passwordHash) return false
  return bcrypt.compare(password, config.passwordHash)
}

export async function hashSiteAccessPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}
