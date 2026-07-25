/**
 * Signed scrape-access tokens for our own apps (Edge-safe verify).
 * Third-party scrapers / search bots never get these — they are blocked in middleware.
 */
import { getCookieSecret } from '@/lib/site-access-cookie'

export const SCRAPE_TOKEN_HEADER = 'x-catalogus-scrape-token'
export const SCRAPE_KEY_HEADER = 'x-catalogus-scrape-key'

/** Default token lifetime: 24 hours. */
export const SCRAPE_TOKEN_TTL_SEC = 60 * 60 * 24

const textEncoder = new TextEncoder()

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes)
  let bin = ''
  for (let i = 0; i < arr.length; i++) {
    bin += String.fromCharCode(arr[i]!)
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
    diff |= a.charCodeAt(i)! ^ b.charCodeAt(i)!
  }
  return diff === 0
}

async function signPayload(payload: string): Promise<string | null> {
  const secret = getCookieSecret()
  if (!secret) return null
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload))
  return bytesToBase64Url(sig)
}

export async function createScrapeAccessToken(
  userId: string,
  ttlSec: number = SCRAPE_TOKEN_TTL_SEC
): Promise<{ token: string; expiresAt: number } | null> {
  const id = String(userId ?? '').trim()
  if (!id) return null
  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(60, ttlSec)
  const payload = `v1scrape.${id}.${expiresAt}`
  const sig = await signPayload(payload)
  if (!sig) return null
  return { token: `${stringToBase64Url(payload)}.${sig}`, expiresAt }
}

export async function verifyScrapeAccessToken(
  token: string | null | undefined
): Promise<{ userId: string; expiresAt: number } | null> {
  const raw = String(token ?? '').trim()
  if (!raw) return null
  const dot = raw.indexOf('.')
  if (dot === -1) return null
  const payloadB64 = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  if (!payloadB64 || !sig) return null

  let payload = ''
  try {
    payload = base64UrlToString(payloadB64)
  } catch {
    return null
  }

  const expected = await signPayload(payload)
  if (!expected || !timingSafeEqualString(expected, sig)) return null

  const parts = payload.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1scrape') return null
  const userId = parts[1]?.trim() || ''
  const expiresAt = Number.parseInt(parts[2] || '', 10)
  if (!userId || !Number.isFinite(expiresAt)) return null
  if (expiresAt < Math.floor(Date.now() / 1000)) return null
  return { userId, expiresAt }
}

/** Static long-lived key for trusted server scripts (optional SCRAPE_BYPASS_SECRET). */
export function verifyScrapeBypassKey(key: string | null | undefined): boolean {
  const expected = process.env.SCRAPE_BYPASS_SECRET?.trim()
  if (!expected || expected.length < 16) return false
  const got = String(key ?? '').trim()
  if (!got || got.length !== expected.length) return false
  return timingSafeEqualString(got, expected)
}

export function readScrapeTokenFromRequest(headers: Headers): string | null {
  const direct = headers.get(SCRAPE_TOKEN_HEADER)?.trim()
  if (direct) return direct
  const auth = headers.get('authorization')?.trim() || ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim()
    return token || null
  }
  return null
}

/** Edge: allow automation only with a valid scrape token or bypass key. */
export async function hasAuthorizedScrapeAccess(headers: Headers): Promise<boolean> {
  if (verifyScrapeBypassKey(headers.get(SCRAPE_KEY_HEADER))) return true
  const token = readScrapeTokenFromRequest(headers)
  if (!token) return false
  return Boolean(await verifyScrapeAccessToken(token))
}
