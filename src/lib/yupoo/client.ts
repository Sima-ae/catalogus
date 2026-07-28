const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const DEFAULT_FETCH_UA = DEFAULT_UA

export type FetchHtmlOptions = {
  cookieHeader?: string
}

export type FetchHtmlResult = {
  status: number
  html: string
}

export async function fetchHtmlResult(
  url: string,
  options?: FetchHtmlOptions
): Promise<FetchHtmlResult> {
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

  const html = await res.text()
  return { status: res.status, html }
}

export async function fetchHtml(url: string, options?: FetchHtmlOptions): Promise<string> {
  const { status, html } = await fetchHtmlResult(url, options)
  if (status < 200 || status >= 300) {
    throw new Error(`HTTP ${status} fetching ${url}`)
  }
  return html
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
