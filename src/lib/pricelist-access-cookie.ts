import { getCookieSecret } from '@/lib/site-access-cookie'

export const PRICELIST_UNLOCK_COOKIE = 'rcc_pricelist_unlock'
export const PRICELIST_CONTRIBUTOR_COOKIE = 'rcc_pricelist_contributor'

const SESSION_MAX_AGE_SEC = 60 * 60 * 12
const REMEMBER_MAX_AGE_SEC = 60 * 60 * 24 * 30
const CONTRIBUTOR_MAX_AGE_SEC = 60 * 60 * 24 * 30

const textEncoder = new TextEncoder()

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes)
  let bin = ''
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i])
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
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
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

export async function createPricelistUnlockToken(
  listOwnerId: string,
  version: number,
  remember: boolean
): Promise<{ token: string; maxAge: number } | null> {
  const maxAge = remember ? REMEMBER_MAX_AGE_SEC : SESSION_MAX_AGE_SEC
  const exp = Math.floor(Date.now() / 1000) + maxAge
  const payload = `pl1.${listOwnerId}.${version}.${exp}`
  const sig = await signPayload(payload)
  if (!sig) return null
  return { token: `${stringToBase64Url(payload)}.${sig}`, maxAge }
}

export async function verifyPricelistUnlockToken(
  token: string | undefined,
  listOwnerId: string,
  currentVersion: number
): Promise<boolean> {
  if (!token || !getCookieSecret()) return false

  const dot = token.indexOf('.')
  if (dot === -1) return false
  const sig = token.slice(dot + 1)
  let payload: string
  try {
    payload = base64UrlToString(token.slice(0, dot))
  } catch {
    return false
  }

  const expectedSig = await signPayload(payload)
  if (!expectedSig || !timingSafeEqualString(sig, expectedSig)) return false

  const parts = payload.split('.')
  if (parts.length !== 4 || parts[0] !== 'pl1') return false
  if (parts[1] !== listOwnerId) return false

  const version = Number.parseInt(parts[2], 10)
  const exp = Number.parseInt(parts[3], 10)
  if (version !== currentVersion) return false
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false

  return true
}

export function readPricelistUnlockCookie(cookieHeader: string | null): string | undefined {
  return readCookieValue(cookieHeader, PRICELIST_UNLOCK_COOKIE)
}

export function getPricelistUnlockCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function readPricelistContributorId(cookieHeader: string | null): string | undefined {
  const raw = readCookieValue(cookieHeader, PRICELIST_CONTRIBUTOR_COOKIE)
  if (!raw || !UUID_RE.test(raw)) return undefined
  return raw
}

export function getPricelistContributorCookieOptions(maxAge = CONTRIBUTOR_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

function readCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (trimmed.slice(0, eq) !== name) continue
    const raw = trimmed.slice(eq + 1)
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  return undefined
}
