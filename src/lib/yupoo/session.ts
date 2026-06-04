import { DEFAULT_FETCH_UA } from '@/lib/yupoo/client'

const INDEX_LOCK_COOKIE = 'indexlockcode'

export type YupooFetchContext = {
  origin: string
  owner: string
  fetchHtml: (url: string) => Promise<string>
}

/** Subdomain store id from *.x.yupoo.com URLs (matches window.OWNER on Yupoo pages). */
export function parseYupooOwner(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase()
    const match = host.match(/^([a-z0-9-]+)\.x\.yupoo\.com$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export function yupooOrigin(url: string): string {
  return new URL(url).origin
}

type YupooUserVerifyResponse = {
  message?: string
  data?: { passwordValid?: boolean; needPassWord?: boolean }
}

/** Verify store homepage password via Yupoo web API. */
export async function verifyYupooStorePassword(
  origin: string,
  owner: string,
  password: string
): Promise<void> {
  const apiUrl = `${origin}/api/web/users/${encodeURIComponent(owner)}?password=${encodeURIComponent(password)}`
  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': DEFAULT_FETCH_UA,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} verifying Yupoo access password`)
  }

  const json = (await res.json()) as YupooUserVerifyResponse
  if (!json.data?.passwordValid) {
    throw new Error('Yupoo access password rejected')
  }
}

export function isYupooPasswordGateHtml(html: string): boolean {
  return (
    html.includes('indexlock__main') ||
    html.includes('passwordmodal__passwordWrap')
  )
}

export const YUPOO_PASSWORD_REQUIRED_MSG =
  'Yupoo store is password-protected; set access password on import source or pass --password='

async function fetchHtmlWithCookie(url: string, cookieHeader: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_FETCH_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
      Cookie: cookieHeader,
    },
    redirect: 'follow',
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }

  return res.text()
}

/** Authenticated Yupoo fetches for a password-protected store (homepage lock). */
export async function createYupooFetchContext(
  seedUrl: string,
  password: string
): Promise<YupooFetchContext> {
  const owner = parseYupooOwner(seedUrl)
  if (!owner) {
    throw new Error('Not a Yupoo store URL (*.x.yupoo.com)')
  }

  const origin = yupooOrigin(seedUrl)
  const trimmed = password.trim()
  if (!trimmed) {
    throw new Error('Yupoo access password is required for this store')
  }

  await verifyYupooStorePassword(origin, owner, trimmed)

  const cookieHeader = `${INDEX_LOCK_COOKIE}=${trimmed}`

  return {
    origin,
    owner,
    fetchHtml: (url: string) => fetchHtmlWithCookie(url, cookieHeader),
  }
}
