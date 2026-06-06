import { fetch as undiciFetch } from 'undici'

const DEFAULT_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (compatible; CatalogusImport/1.0; +https://superclones.cloud)',
}

export async function fetchFacebookRemoteUrl(url: string, init?: RequestInit) {
  return undiciFetch(url, {
    ...(init as Parameters<typeof undiciFetch>[1]),
    headers: {
      ...DEFAULT_HEADERS,
      ...(init?.headers as Record<string, string> | undefined),
    },
    redirect: 'follow',
  })
}

export function facebookGraphAccessToken(): string | null {
  const token = String(process.env.FACEBOOK_GRAPH_ACCESS_TOKEN ?? '').trim()
  return token || null
}

/** Graph API scrape for public URLs when token is configured. */
export async function fetchFacebookGraphScrape(postUrl: string): Promise<{
  title?: string
  description?: string
  imageUrls: string[]
} | null> {
  const token = facebookGraphAccessToken()
  if (!token) return null

  const graphUrl = new URL('https://graph.facebook.com/v21.0/')
  graphUrl.searchParams.set('id', postUrl)
  graphUrl.searchParams.set('scrape', 'true')
  graphUrl.searchParams.set(
    'fields',
    'og_object{title,description,type},title,description,image,url'
  )
  graphUrl.searchParams.set('access_token', token)

  const res = await fetchFacebookRemoteUrl(graphUrl.href, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null

  const data = (await res.json()) as Record<string, unknown>
  const og = data.og_object as Record<string, unknown> | undefined
  const title = String(og?.title ?? data.title ?? '').trim()
  const description = String(og?.description ?? data.description ?? '').trim()

  const imageUrls: string[] = []
  const image = data.image as unknown
  if (Array.isArray(image)) {
    for (const item of image) {
      const url = String((item as { url?: string })?.url ?? item ?? '').trim()
      if (url) imageUrls.push(url)
    }
  } else if (image && typeof image === 'object') {
    const url = String((image as { url?: string }).url ?? '').trim()
    if (url) imageUrls.push(url)
  }

  if (!title && !description && !imageUrls.length) return null
  return { title: title || undefined, description: description || undefined, imageUrls }
}

/** oEmbed endpoint — often returns embed HTML with thumbnail. */
export async function fetchFacebookOEmbed(postUrl: string): Promise<{
  title?: string
  html?: string
  thumbnailUrl?: string
} | null> {
  const oembedUrl = new URL('https://www.facebook.com/plugins/post/oembed.json/')
  oembedUrl.searchParams.set('url', postUrl)
  oembedUrl.searchParams.set('omitscript', 'true')
  oembedUrl.searchParams.set('maxwidth', '640')

  const res = await fetchFacebookRemoteUrl(oembedUrl.href, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null

  const data = (await res.json()) as {
    title?: string
    html?: string
    thumbnail_url?: string
  }
  return {
    title: data.title?.trim() || undefined,
    html: data.html,
    thumbnailUrl: data.thumbnail_url?.trim() || undefined,
  }
}

export async function fetchFacebookHtml(postUrl: string): Promise<string> {
  const res = await fetchFacebookRemoteUrl(postUrl)
  if (!res.ok) {
    throw new Error(`Facebook page fetch failed (${res.status})`)
  }
  return res.text()
}
