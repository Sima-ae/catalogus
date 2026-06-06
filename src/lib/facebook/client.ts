import { fetch as undiciFetch } from 'undici'
import type { FacebookUrlMeta } from '@/lib/facebook/parse-url'
import {
  facebookPermalinkFetchUrls,
  isFacebookPermalinkMeta,
} from '@/lib/facebook/parse-url'
import {
  dedupeFacebookImageUrls,
  isLikelyProductImageUrl,
  maximizeFacebookImageUrl,
  readJpegDimensions,
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

async function graphApiGetAbsolute(url: string): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const res = await fetchFacebookRemoteUrl(url, {
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
  return best?.source ? [maximizeFacebookImageUrl(unescapeFacebookJsonUrl(best.source))] : []
}

function mediaImageSrc(media: unknown): string | null {
  if (!media || typeof media !== 'object') return null
  const image = (media as { image?: { src?: string; width?: number; height?: number } }).image
  const src = image?.src?.trim()
  return src && isLikelyProductImageUrl(src) ? maximizeFacebookImageUrl(unescapeFacebookJsonUrl(src)) : null
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

function extractPhotoImageUrls(photo: unknown): string[] {
  if (!photo || typeof photo !== 'object') return []
  const row = photo as {
    images?: Array<{ source?: string; width?: number; height?: number }>
    webp_images?: Array<{ source?: string; width?: number; height?: number }>
  }
  return pickLargestImageSource(row.images ?? row.webp_images)
}

/** Fetch all photos in a Facebook album (carousel posts) with pagination. */
export async function fetchFacebookGraphAlbumPhotos(albumId: string): Promise<{
  imageUrls: string[]
  error?: string
}> {
  const id = albumId.replace(/\D+/g, '')
  if (!id) return { imageUrls: [], error: 'Invalid album id' }

  const imageUrls: string[] = []
  let nextUrl: string | null = null
  let first = true
  let error: string | undefined

  while (first || nextUrl) {
    const result = first
      ? await graphApiGet(`${id}/photos`, {
          fields: 'images,webp_images',
          limit: '100',
        })
      : await graphApiGetAbsolute(nextUrl!)

    first = false
    if (!result.ok) {
      error = result.error
      break
    }

    const rows = (result.data.data as unknown[] | undefined) ?? []
    for (const photo of rows) {
      imageUrls.push(...extractPhotoImageUrls(photo))
    }

    const paging = result.data.paging as { next?: string } | undefined
    nextUrl = paging?.next?.trim() || null
  }

  const unique = dedupeFacebookImageUrls(imageUrls)
  if (!unique.length && error) {
    return { imageUrls: [], error }
  }
  return { imageUrls: unique, error: unique.length ? undefined : error ?? 'Album returned no photos' }
}

/** Fetch post carousel attachments with pagination on subattachments. */
export async function fetchFacebookGraphPostAllImages(postId: string): Promise<{
  title?: string
  description?: string
  imageUrls: string[]
  error?: string
}> {
  const id = postId.replace(/\D+/g, '')
  if (!id) return { imageUrls: [], error: 'Invalid post id' }

  const postResult = await graphApiGet(id, {
    fields:
      'message,full_picture,attachments{media_type,media{image},subattachments.limit(25){media{image}}}',
  })
  if (!postResult.ok) {
    return { imageUrls: [], error: postResult.error }
  }

  const message = String(postResult.data.message ?? '').trim()
  const imageUrls: string[] = []
  let error: string | undefined

  const fullPicture = String(postResult.data.full_picture ?? '').trim()
  if (fullPicture && isLikelyProductImageUrl(fullPicture)) {
    imageUrls.push(maximizeFacebookImageUrl(unescapeFacebookJsonUrl(fullPicture)))
  }

  imageUrls.push(...extractAttachmentImageUrls(postResult.data.attachments))

  const attachments =
    (postResult.data.attachments as { data?: unknown[] } | undefined)?.data ?? []
  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== 'object') continue
    const sub = (
      attachment as {
        subattachments?: { data?: unknown[]; paging?: { next?: string } }
      }
    ).subattachments

    let nextUrl = sub?.paging?.next?.trim() || null
    while (nextUrl) {
      const page = await graphApiGetAbsolute(nextUrl)
      if (!page.ok) {
        error = page.error
        break
      }

      const rows = (page.data.data as unknown[] | undefined) ?? []
      for (const child of rows) {
        const src = mediaImageSrc((child as { media?: unknown })?.media)
        if (src) imageUrls.push(src)
      }

      const paging = page.data.paging as { next?: string } | undefined
      nextUrl = paging?.next?.trim() || null
    }
  }

  const unique = dedupeFacebookImageUrls(imageUrls)
  if (!message && !unique.length) {
    return { imageUrls: [], error: error ?? 'Graph post returned no text or images' }
  }

  return {
    description: message || undefined,
    title: message.split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 120),
    imageUrls: unique,
    error: unique.length ? undefined : error,
  }
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
    imageUrls.push(maximizeFacebookImageUrl(unescapeFacebookJsonUrl(fullPicture)))
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
      if (url && isLikelyProductImageUrl(url)) imageUrls.push(maximizeFacebookImageUrl(unescapeFacebookJsonUrl(url)))
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
export async function fetchFacebookGraphForUrl(
  meta: FacebookUrlMeta,
  htmlHints?: {
    postId?: string | null
    albumId?: string | null
    subattachmentCount?: number | null
  }
): Promise<{
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

  const postId = htmlHints?.postId || meta.pcbPostId
  const albumId = htmlHints?.albumId
  const expectedCount = htmlHints?.subattachmentCount ?? null

  if (albumId) {
    apply(await fetchFacebookGraphAlbumPhotos(albumId))
  }

  if (postId) {
    apply(await fetchFacebookGraphPostAllImages(postId))
  }

  const uniqueSoFar = dedupeFacebookImageUrls(imageUrls)
  const needsMore =
    expectedCount != null && expectedCount > 0 && uniqueSoFar.length < expectedCount

  if (meta.storyFbid && meta.pageId && (!uniqueSoFar.length || needsMore)) {
    const permalink = await fetchFacebookGraphPermalink(meta)
    errors.push(...permalink.errors)
    title = title || permalink.title || ''
    description = description || permalink.description || ''
    imageUrls = [...imageUrls, ...permalink.imageUrls]
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
