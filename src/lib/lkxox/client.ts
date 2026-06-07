const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export function normalizeLkxoxListUrl(raw: string): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) throw new Error('Lkxox catalog list URL is required')
  const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Lkxox catalog list URL must use http or https')
  }
  return url.toString()
}

export function lkxoxListingOrigin(listUrl: string): string {
  return new URL(normalizeLkxoxListUrl(listUrl)).origin
}

export function lkxoxListingPageUrl(listUrl: string, page: number): string {
  const url = new URL(normalizeLkxoxListUrl(listUrl))
  if (page > 1) {
    url.searchParams.set('page', String(page))
  } else {
    url.searchParams.delete('page')
  }
  return url.toString()
}

export async function fetchLkxoxHtml(url: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': DEFAULT_USER_AGENT,
      },
      redirect: 'follow',
      cache: 'no-store',
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(`Could not reach lkxox.com (${detail}): ${url}`)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Lkxox fetch ${res.status}: ${body.slice(0, 200) || res.statusText}`)
  }

  return res.text()
}

export async function fetchLkxoxRemoteUrl(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Accept: 'image/*,*/*;q=0.8',
      'User-Agent': DEFAULT_USER_AGENT,
      ...(init?.headers ?? {}),
    },
    redirect: 'follow',
  })
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
