import { fetch as undiciFetch } from 'undici'
import type { FacebookUrlMeta } from '@/lib/facebook/parse-url'
import {
  facebookPermalinkFetchUrls,
  isFacebookPermalinkMeta,
} from '@/lib/facebook/parse-url'
import {
  dedupeFacebookImageUrls,
  isLikelyProductImageUrl,
  unescapeFacebookUrl,
} from '@/lib/facebook/image-urls'

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

type GraphErrorBody = {
  error?: { message?: string; type?: string; code?: number }
}

async function graphApiGet(
  path: string,
  params: Record<string, string> = {}
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const token = facebookGraphAccessToken()
  if (!token) {
    return { ok: false, error: 'FACEBOOK_GRAPH_ACCESS_TOKEN is not configured' }
  }

  const graphUrl = new URL(`https://graph.facebook.com/v21.0/${path.replace(/^\//, '')}`)
  for (const [key, value] of Object.entries(params)) {
    graphUrl.searchParams.set(key, value)
  }
  graphUrl.searchParams.set('access_token', token)

  const res = await fetchFacebookRemoteUrl(graphUrl.href, {
    headers: { Accept: 'application/json' },
  })

  const body = (await res.json().catch(() => null)) as GraphErrorBody | Record<string, unknown> | null
  if (!res.ok || !body || 'error' in body) {
    const message =
      (body as GraphErrorBody | null)?.error?.message ||
      `Graph API request failed (${res.status})`
    return { ok: false, error: message }
  }

  return { ok: true, data: body as Record<string, unknown> }
}

function unescapeFacebookJsonUrl(raw: string): string {
  return unescapeFacebookUrl(raw)
}

function pickLargestImageSource(
  images: Array<{ source?: string; width?: number; height?: number }> | undefined
): string[] {
  if (!images?.length) return []
  const sorted = [...images].sort(
    (a, b) => (Number(b.width) || 0) * (Number(b.height) || 0) - (Number(a.width) || 0) * (Number(a.height) || 0)
  )
  const best = sorted.find((img) => img.source && isLikelyProductImageUrl(img.source))
  return best?.source ? [unescapeFacebookJsonUrl(best.source)] : []
}

function mediaImageSrc(media: unknown): string | null {
  if (!media || typeof media !== 'object') return null
  const image = (media as { image?: { src?: string } }).image
  const src = image?.src?.trim()
  return src && isLikelyProductImageUrl(src) ? unescapeFacebookJsonUrl(src) : null
}

function extractAttachmentImageUrls(attachments: unknown): string[] {
  const urls: string[] = []
  const data = (attachments as { data?: unknown[] } | undefined)?.data
  if (!Array.isArray(data)) return urls

  for (const attachment of data) {
    if (!attachment || typeof attachment !== 'object') continue
    const row = attachment as {
      media?: unknown
      subattachments?: { data?: unknown[] }
    }

    const direct = mediaImageSrc(row.media)
    if (direct) urls.push(direct)

    const sub = row.subattachments?.data
    if (Array.isArray(sub)) {
      for (const child of sub) {
        const childMedia = (child as { media?: unknown })?.media
        const src = mediaImageSrc(childMedia)
        if (src) urls.push(src)
      }
    }
  }

  return urls
}

/** Fetch a carousel / post by numeric id — best for set=pcb.{postId} photo links. */
export async function fetchFacebookGraphPost(postId: string): Promise<{
  title?: string
  description?: string
  imageUrls: string[]
  error?: string
} | null> {
  const id = postId.replace(/\D+/g, '')
  if (!id) return null

  const result = await graphApiGet(id, {
    fields:
      'message,full_picture,attachments{media_type,media,subattachments{media_type,media}}',
  })
  if (!result.ok) {
    return { imageUrls: [], error: result.error }
  }

  const data = result.data
  const message = String(data.message ?? '').trim()
  const imageUrls: string[] = []

  const fullPicture = String(data.full_picture ?? '').trim()
  if (fullPicture && isLikelyProductImageUrl(fullPicture)) {
    imageUrls.push(unescapeFacebookJsonUrl(fullPicture))
  }

  imageUrls.push(...extractAttachmentImageUrls(data.attachments))

  const unique = Array.from(new Set(imageUrls))
  if (!message && !unique.length) {
    return { imageUrls: [], error: 'Graph post returned no text or images' }
  }

  return {
    description: message || undefined,
    title: message.split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 120),
    imageUrls: unique,
  }
}

/** Fetch a single photo node by fbid / photo id. */
export async function fetchFacebookGraphPhoto(photoId: string): Promise<{
  title?: string
  description?: string
  imageUrls: string[]
  error?: string
} | null> {
  const id = photoId.replace(/\D+/g, '')
  if (!id) return null

  const result = await graphApiGet(id, {
    fields: 'images,webp_images,name,caption,alt_text',
  })
  if (!result.ok) {
    return { imageUrls: [], error: result.error }
  }

  const data = result.data
  const images = (data.images ?? data.webp_images) as
    | Array<{ source?: string; width?: number; height?: number }>
    | undefined
  const imageUrls = pickLargestImageSource(images)

  const caption = String(data.caption ?? data.alt_text ?? data.name ?? '').trim()
  if (!caption && !imageUrls.length) {
    return { imageUrls: [], error: 'Graph photo returned no caption or images' }
  }

  return {
    description: caption || undefined,
    title: caption.split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 120),
    imageUrls,
  }
}

function parseGraphScrapePayload(data: Record<string, unknown>): {
  title?: string
  description?: string
  imageUrls: string[]
} {
  const og = data.og_object as Record<string, unknown> | undefined
  const title = String(og?.title ?? data.title ?? '').trim()
  const description = String(og?.description ?? data.description ?? '').trim()

  const imageUrls: string[] = []
  const pushImage = (value: unknown) => {
    const url = String((value as { url?: string })?.url ?? value ?? '').trim()
    if (url && isLikelyProductImageUrl(url)) imageUrls.push(unescapeFacebookJsonUrl(url))
  }

  const image = data.image as unknown
  if (Array.isArray(image)) {
    for (const item of image) pushImage(item)
  } else if (image) {
    pushImage(image)
  }

  const ogImage = og?.image as unknown
  if (Array.isArray(ogImage)) {
    for (const item of ogImage) pushImage(item)
  } else if (ogImage) {
    pushImage(ogImage)
  }

  return {
    title: title || undefined,
    description: description || undefined,
    imageUrls,
  }
}

async function graphApiScrapePost(postUrl: string): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const token = facebookGraphAccessToken()
  if (!token) {
    return { ok: false, error: 'FACEBOOK_GRAPH_ACCESS_TOKEN is not configured' }
  }

  const graphUrl = new URL('https://graph.facebook.com/v21.0/')
  graphUrl.searchParams.set('access_token', token)

  const body = new URLSearchParams({
    id: postUrl,
    scrape: 'true',
    fields: 'og_object{title,description,image,type},title,description,image,url',
  })

  const res = await fetchFacebookRemoteUrl(graphUrl.href, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const data = (await res.json().catch(() => null)) as GraphErrorBody | Record<string, unknown> | null
  if (!res.ok || !data || 'error' in data) {
    const message =
      (data as GraphErrorBody | null)?.error?.message ||
      `Graph scrape failed (${res.status})`
    return { ok: false, error: message }
  }

  return { ok: true, data: data as Record<string, unknown> }
}

/** Graph API scrape for public URLs when token is configured. */
export async function fetchFacebookGraphScrape(postUrl: string): Promise<{
  title?: string
  description?: string
  imageUrls: string[]
  error?: string
} | null> {
  const token = facebookGraphAccessToken()
  if (!token) return null

  const result = await graphApiScrapePost(postUrl)
  if (!result.ok) {
    return { imageUrls: [], error: result.error }
  }

  const parsed = parseGraphScrapePayload(result.data)
  if (!parsed.title && !parsed.description && !parsed.imageUrls.length) {
    return { imageUrls: [], error: 'Graph scrape returned no post data' }
  }
  return parsed
}

/** Scrape permalink variants — primary path for story_fbid posts on the VPS. */
export async function fetchFacebookGraphPermalink(meta: FacebookUrlMeta): Promise<{
  title?: string
  description?: string
  imageUrls: string[]
  errors: string[]
}> {
  if (!isFacebookPermalinkMeta(meta)) {
    return { imageUrls: [], errors: [] }
  }

  const errors: string[] = []
  let title = ''
  let description = ''
  let imageUrls: string[] = []

  for (const url of facebookPermalinkFetchUrls(meta)) {
    const result = await fetchFacebookGraphScrape(url)
    if (!result) continue
    if (result.error) errors.push(`${url}: ${result.error}`)
    title = title || result.title || ''
    description = description || result.description || ''
    imageUrls = [...imageUrls, ...result.imageUrls]
    if (imageUrls.length && description) break
  }

  return {
    title: title || undefined,
    description: description || undefined,
    imageUrls: dedupeFacebookImageUrls(imageUrls),
    errors,
  }
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

/** Graph fetch tailored to URL shape (pcb carousel post, single photo, then scrape). */
export async function fetchFacebookGraphForUrl(meta: FacebookUrlMeta): Promise<{
  title?: string
  description?: string
  imageUrls: string[]
  errors: string[]
}> {
  const errors: string[] = []
  let title = ''
  let description = ''
  let imageUrls: string[] = []

  const apply = (result: {
    title?: string
    description?: string
    imageUrls: string[]
    error?: string
  } | null) => {
    if (!result) return
    if (result.error) errors.push(result.error)
    title = title || result.title || ''
    description = description || result.description || ''
    imageUrls = [...imageUrls, ...result.imageUrls]
  }

  if (meta.storyFbid && meta.pageId) {
    const permalink = await fetchFacebookGraphPermalink(meta)
    errors.push(...permalink.errors)
    title = permalink.title ?? ''
    description = permalink.description ?? ''
    imageUrls = [...imageUrls, ...permalink.imageUrls]
  }

  if (meta.pcbPostId && !imageUrls.length) {
    apply(await fetchFacebookGraphPost(meta.pcbPostId))
  }

  if (meta.fbid && !imageUrls.length) {
    apply(await fetchFacebookGraphPhoto(meta.fbid))
  }

  if (!imageUrls.length) {
    apply(await fetchFacebookGraphScrape(meta.normalizedUrl))
  }

  const uniqueImages = dedupeFacebookImageUrls(imageUrls)
  return { title, description, imageUrls: uniqueImages, errors }
}
