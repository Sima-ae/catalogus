/** HttpOnly unlock token (signed). */
export const SITE_ACCESS_COOKIE = 'rcc_site_unlock'

/** Non-secret hints for Edge middleware (synced from DB on verify/status/check). */
export const SITE_ACCESS_META_REQUIRED = 'rcc_sa_required'
export const SITE_ACCESS_META_VERSION = 'rcc_sa_ver'

const SESSION_MAX_AGE_SEC = 60 * 60 * 12
const REMEMBER_MAX_AGE_SEC = 60 * 60 * 24 * 30

const textEncoder = new TextEncoder()

let missingSecretLogged = false

const MIN_SECRET_LENGTH = 16

/** Why site-access signing is unavailable (for API error messages; never returns the secret). */
export function siteAccessSecretDiagnostics():
  | { ok: true }
  | { ok: false; reason: string } {
  const raw = process.env.SITE_ACCESS_COOKIE_SECRET
  const secret = raw?.trim()
  if (!secret) {
    return {
      ok: false,
      reason:
        'SITE_ACCESS_COOKIE_SECRET is not loaded. Add it to .env on the server (16+ characters), then run: sudo systemctl restart catalogus',
    }
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    return {
      ok: false,
      reason: `SITE_ACCESS_COOKIE_SECRET must be at least ${MIN_SECRET_LENGTH} characters (current length: ${secret.length}).`,
    }
  }
  return { ok: true }
}

/** Returns null when production secret is missing (site stays up; site-access lock is disabled). */
export function getCookieSecret(): string | null {
  const diag = siteAccessSecretDiagnostics()
  if (diag.ok) return process.env.SITE_ACCESS_COOKIE_SECRET!.trim()
  if (process.env.NODE_ENV === 'production' && !missingSecretLogged) {
    missingSecretLogged = true
    console.error(`[site-access] ${diag.reason}`)
  }
  if (process.env.NODE_ENV === 'production') return null
  return 'dev-only-site-access-secret-not-for-production'
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes)
  let bin = ''
  for (let i = 0; i < arr.length; i++) {
    bin += String.fromCharCode(arr[i])
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(textEncoder.encode(value).buffer)
}

function base64UrlToString(b64: string): string {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const b64std = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64std)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

let hmacKey: CryptoKey | null = null
let hmacKeySecret = ''

async function getHmacKey(): Promise<CryptoKey | null> {
  const secret = getCookieSecret()
  if (!secret) return null
  if (hmacKey && hmacKeySecret === secret) return hmacKey
  hmacKeySecret = secret
  hmacKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return hmacKey
}

async function signPayload(payload: string): Promise<string | null> {
  const key = await getHmacKey()
  if (!key) return null
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload))
  return bytesToBase64Url(sig)
}

export async function createUnlockToken(
  version: number,
  remember: boolean
): Promise<{ token: string; maxAge: number } | null> {
  const maxAge = remember ? REMEMBER_MAX_AGE_SEC : SESSION_MAX_AGE_SEC
  const exp = Math.floor(Date.now() / 1000) + maxAge
  const payload = `v1.${version}.${exp}`
  const sig = await signPayload(payload)
  if (!sig) return null
  return { token: `${stringToBase64Url(payload)}.${sig}`, maxAge }
}

export async function verifyUnlockToken(
  token: string | undefined,
  currentVersion: number
): Promise<boolean> {
  if (!token) return false
  if (!getCookieSecret()) return false

  const dot = token.indexOf('.')
  if (dot === -1) return false
  const payloadB64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!payloadB64 || !sig) return false

  let payload: string
  try {
    payload = base64UrlToString(payloadB64)
  } catch {
    return false
  }

  const expectedSig = await signPayload(payload)
  if (!expectedSig || !timingSafeEqualString(sig, expectedSig)) return false

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
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const name = trimmed.slice(0, eq)
    if (name !== SITE_ACCESS_COOKIE) continue
    const raw = trimmed.slice(eq + 1)
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  return undefined
}

export type SiteAccessMeta = {
  required: boolean
  version: number
}

export function getSiteAccessCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export function getSiteAccessMetaCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  }
}

/** Attach unlock + meta cookies so middleware can validate without a self-fetch. */
export function applySiteAccessCookies(
  res: { cookies: { set: (name: string, value: string, options?: object) => void } },
  meta: SiteAccessMeta,
  unlock?: { token: string; maxAge: number }
) {
  const metaOpts = getSiteAccessMetaCookieOptions()
  res.cookies.set(
    SITE_ACCESS_META_REQUIRED,
    meta.required ? '1' : '0',
    metaOpts
  )
  res.cookies.set(SITE_ACCESS_META_VERSION, String(meta.version), metaOpts)

  if (unlock) {
    res.cookies.set(
      SITE_ACCESS_COOKIE,
      unlock.token,
      getSiteAccessCookieOptions(unlock.maxAge)
    )
  }
}

/** Clear the HttpOnly unlock cookie (e.g. after inactivity timeout). */
export function clearSiteAccessUnlockCookie(
  res: { cookies: { set: (name: string, value: string, options?: object) => void } }
) {
  res.cookies.set(SITE_ACCESS_COOKIE, '', {
    ...getSiteAccessCookieOptions(0),
    maxAge: 0,
  })
}
