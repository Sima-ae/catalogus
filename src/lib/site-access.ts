import { createHmac, timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'
import { queryDb } from '@/lib/db'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'
import { getDevSiteAccessConfig } from '@/lib/dev-site-access'
import {
  DEFAULT_SITE_ACCESS,
  SITE_ACCESS_KEYS,
  type SiteAccessSettingKey,
} from '@/lib/site-access-keys'

export const SITE_ACCESS_COOKIE = 'rcc_site_unlock'

const SESSION_MAX_AGE_SEC = 60 * 60 * 12 // 12h without "remember"
const REMEMBER_MAX_AGE_SEC = 60 * 60 * 24 * 30

export type SiteAccessConfig = {
  required: boolean
  version: number
  passwordHash: string | null
}

export function getCookieSecret(): string {
  const secret = process.env.SITE_ACCESS_COOKIE_SECRET?.trim()
  if (secret && secret.length >= 16) return secret
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[site-access] Set SITE_ACCESS_COOKIE_SECRET (16+ chars) in production .env'
    )
  }
  return 'dev-site-access-secret-change-me'
}

type SettingRow = { key: string; value: string | null }

async function loadSiteAccessRows(): Promise<SettingRow[]> {
  try {
    return await queryDb<SettingRow[]>(
      `SELECT \`key\`, value FROM settings WHERE \`key\` IN (?, ?, ?)`,
      [...SITE_ACCESS_KEYS]
    )
  } catch (error) {
    if (isDevDataFallbackEnabled()) {
      return getDevSiteAccessConfig().rows
    }
    throw error
  }
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

  return {
    required: enabled && !!passwordHash,
    version,
    passwordHash,
  }
}

export async function verifySiteAccessPassword(
  password: string
): Promise<boolean> {
  const config = await getSiteAccessConfig()
  if (!config.passwordHash) return false
  return bcrypt.compare(password, config.passwordHash)
}

function signPayload(payload: string): string {
  return createHmac('sha256', getCookieSecret()).update(payload).digest('base64url')
}

/** Issue signed unlock cookie value. */
export function createUnlockToken(
  version: number,
  remember: boolean
): { token: string; maxAge: number } {
  const maxAge = remember ? REMEMBER_MAX_AGE_SEC : SESSION_MAX_AGE_SEC
  const exp = Math.floor(Date.now() / 1000) + maxAge
  const payload = `v1.${version}.${exp}`
  const sig = signPayload(payload)
  return { token: `${Buffer.from(payload, 'utf8').toString('base64url')}.${sig}`, maxAge }
}

export function verifyUnlockToken(
  token: string | undefined,
  currentVersion: number
): boolean {
  if (!token) return false
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return false

  let payload: string
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString('utf8')
  } catch {
    return false
  }

  const expectedSig = signPayload(payload)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expectedSig)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  } catch {
    return false
  }

  const parts = payload.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return false

  const version = Number.parseInt(parts[1], 10)
  const exp = Number.parseInt(parts[2], 10)
  if (version !== currentVersion) return false
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false

  return true
}

export function readUnlockCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [name, ...rest] = part.trim().split('=')
    if (name === SITE_ACCESS_COOKIE) {
      return decodeURIComponent(rest.join('='))
    }
  }
  return undefined
}

export async function hashSiteAccessPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}
