import { SITE_ACCESS_CODE_COOKIE, getCookieSecret } from '@/lib/site-access-cookie'

export const CHAT_SESSION_COOKIE = 'rcc_chat_session'

const textEncoder = new TextEncoder()

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes)
  let bin = ''
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]!)
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
let hmacSecret = ''

async function getHmacKey(): Promise<CryptoKey | null> {
  const secret = getCookieSecret()
  if (!secret) return null
  if (hmacKey && hmacSecret === secret) return hmacKey
  hmacSecret = secret
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

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30

export async function createChatSessionToken(
  version: number,
  sessionId: string
): Promise<{ token: string; maxAge: number } | null> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC
  const payload = `v1.${version}.${sessionId}.${exp}`
  const sig = await signPayload(payload)
  if (!sig) return null
  return { token: `${stringToBase64Url(payload)}.${sig}`, maxAge: SESSION_MAX_AGE_SEC }
}

export async function verifyChatSessionToken(
  token: string | null | undefined,
  version: number
): Promise<string | null> {
  const raw = String(token ?? '').trim()
  if (!raw) return null
  const [payloadB64, sig] = raw.split('.')
  if (!payloadB64 || !sig) return null
  let payload = ''
  try {
    payload = base64UrlToString(payloadB64)
  } catch {
    return null
  }
  const [v, tokenVersionRaw, sessionId, expRaw] = payload.split('.')
  if (v !== 'v1') return null
  const tokenVersion = Number.parseInt(tokenVersionRaw || '0', 10) || 0
  if (tokenVersion !== version) return null
  const exp = Number.parseInt(expRaw || '0', 10) || 0
  if (!exp || Math.floor(Date.now() / 1000) > exp) return null
  const expected = await signPayload(payload)
  if (!expected) return null
  if (!timingSafeEqualString(expected, sig)) return null
  return sessionId?.trim() || null
}

export function readCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  const raw = String(cookieHeader ?? '')
  if (!raw) return null
  const match = raw.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}=([^;]*)`)
  )
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function readChatSessionCookie(cookieHeader: string | null | undefined): string | null {
  return readCookieValue(cookieHeader, CHAT_SESSION_COOKIE)
}

export function readSiteAccessCodeCookie(cookieHeader: string | null | undefined): string | null {
  return readCookieValue(cookieHeader, SITE_ACCESS_CODE_COOKIE)
}

