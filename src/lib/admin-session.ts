/**
 * HttpOnly admin session — signed at login, verified on privileged routes.
 * Stops spoofing via X-Catalogus-User-* headers alone.
 */
import type { NextRequest } from 'next/server'

export const ADMIN_SESSION_COOKIE = 'rcc_admin_session'
const SESSION_MAX_AGE_SEC = 60 * 60 * 12 * 7 // 7 days — catalog admins stay signed in

const textEncoder = new TextEncoder()

function getSessionSecret(): string | null {
  const raw =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.SITE_ACCESS_COOKIE_SECRET?.trim() ||
    ''
  if (raw.length >= 16) return raw
  if (process.env.NODE_ENV === 'production') return null
  return 'dev-only-admin-session-secret-not-for-production'
}

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
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i)! ^ b.charCodeAt(i)!
  return diff === 0
}

async function signPayload(payload: string): Promise<string | null> {
  const secret = getSessionSecret()
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

type SessionClaims = { userId: string; email: string; exp: number }

/** v2 JSON payload — emails may contain dots (broke the old v1 dotted format). */
function encodeV2Payload(claims: SessionClaims): string {
  return JSON.stringify({
    v: 2,
    userId: claims.userId,
    email: claims.email,
    exp: claims.exp,
  })
}

function parseSessionPayload(payload: string): SessionClaims | null {
  const raw = String(payload || '').trim()
  if (!raw) return null

  // Preferred: v2 JSON
  if (raw.startsWith('{')) {
    try {
      const data = JSON.parse(raw) as {
        v?: number
        userId?: unknown
        email?: unknown
        exp?: unknown
      }
      if (data.v !== 2) return null
      const userId = String(data.userId ?? '').trim()
      const email = String(data.email ?? '').trim().toLowerCase()
      const exp = Number(data.exp) || 0
      if (!userId || !email || !exp) return null
      return { userId, email, exp }
    } catch {
      return null
    }
  }

  // Legacy v1: `v1.<userId>.<email>.<exp>` — email often contains `.` (e.g. @superclones.cloud)
  const parts = raw.split('.')
  if (parts[0] !== 'v1' || parts.length < 4) return null
  const userId = parts[1]?.trim() || ''
  const exp = Number.parseInt(parts[parts.length - 1] || '0', 10) || 0
  const email = parts.slice(2, -1).join('.').trim().toLowerCase()
  if (!userId || !email || !exp) return null
  return { userId, email, exp }
}

export async function createAdminSessionToken(
  userId: string,
  email: string
): Promise<{ token: string; maxAge: number } | null> {
  const id = String(userId || '').trim()
  const mail = String(email || '').trim().toLowerCase()
  if (!id || !mail) return null
  const maxAge = SESSION_MAX_AGE_SEC
  const exp = Math.floor(Date.now() / 1000) + maxAge
  const payload = encodeV2Payload({ userId: id, email: mail, exp })
  const sig = await signPayload(payload)
  if (!sig) return null
  return { token: `${stringToBase64Url(payload)}.${sig}`, maxAge }
}

export async function verifyAdminSessionToken(
  token: string | null | undefined
): Promise<{ userId: string; email: string } | null> {
  const raw = String(token ?? '').trim()
  if (!raw || !getSessionSecret()) return null
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
  const claims = parseSessionPayload(payload)
  if (!claims) return null
  if (Math.floor(Date.now() / 1000) > claims.exp) return null
  return { userId: claims.userId, email: claims.email }
}

export function getAdminSessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export function readAdminSessionCookie(request: NextRequest): string | undefined {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value
}
