const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const DEFAULT_FETCH_UA = DEFAULT_UA

export type FetchHtmlOptions = {
  cookieHeader?: string
}

export async function fetchHtml(url: string, options?: FetchHtmlOptions): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': DEFAULT_UA,
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
  }
  if (options?.cookieHeader) {
    headers.Cookie = options.cookieHeader
  }

  const res = await fetch(url, {
    headers,
    redirect: 'follow',
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }

  return res.text()
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function absoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href
  } catch {
    return href
  }
}
