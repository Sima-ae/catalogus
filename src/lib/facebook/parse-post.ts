import { decodeWooHtmlEntities } from '@/lib/woocommerce/types'
import {
  fetchFacebookGraphForUrl,
  fetchFacebookHtml,
  fetchFacebookOEmbed,
} from '@/lib/facebook/client'
import { parseEmojiPriceHint } from '@/lib/facebook/parse-emoji-price'
import {
  canonicalizeFacebookUrl,
  facebookExternalIdFromUrl,
  facebookPermalinkFetchUrls,
  isFacebookPermalinkMeta,
  normalizeFacebookPostUrl,
  parseFacebookUrlMeta,
} from '@/lib/facebook/parse-url'
import {
  dedupeFacebookImageUrls,
  isLikelyProductImageUrl,
  unescapeFacebookUrl,
} from '@/lib/facebook/image-urls'
import type { FacebookPostData } from '@/lib/facebook/types'

function decodeNumericHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : _
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : _
    })
}

function decodeHtml(text: string): string {
  return decodeNumericHtmlEntities(
    decodeWooHtmlEntities(
      text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
  )
}

function metaContent(html: string, property: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      'i'
    ),
  ]
  for (const re of patterns) {
    const match = html.match(re)
    if (match?.[1]) return decodeHtml(match[1])
  }
  return ''
}

function collectRegexMatches(html: string, re: RegExp): string[] {
  const out: string[] = []
  const pattern = new RegExp(re.source, re.flags)
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    if (match[1]) out.push(match[1])
    else if (match[0]) out.push(match[0])
  }
  return out
}

function unescapeEmbeddedUrl(raw: string): string {
  return unescapeFacebookUrl(raw)
}

function isUsableImageUrl(url: string): boolean {
  return isLikelyProductImageUrl(url)
}

function extractImageUrlsFromHtml(html: string): string[] {
  const urls = new Set<string>()

  for (const raw of collectRegexMatches(
    html,
    /property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi
  )) {
    const url = unescapeEmbeddedUrl(raw)
    if (isUsableImageUrl(url)) urls.add(url)
  }
  for (const raw of collectRegexMatches(
    html,
    /content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi
  )) {
    const url = unescapeEmbeddedUrl(raw)
    if (isUsableImageUrl(url)) urls.add(url)
  }

  for (const raw of collectRegexMatches(html, /"(?:uri|src|url)":"(https:\\\/\\\/[^"]+)"/gi)) {
    const url = unescapeEmbeddedUrl(raw)
    if (isUsableImageUrl(url)) urls.add(url)
  }

  for (const raw of collectRegexMatches(
    html,
    /https:\\\/\\\/[^"'\\s]+scontent[^"'\\s]+/gi
  )) {
    const url = unescapeEmbeddedUrl(raw)
    if (isUsableImageUrl(url)) urls.add(url)
  }

  for (const raw of collectRegexMatches(
    html,
    /https:\/\/[^"'\\s]+(?:scontent|fbcdn)[^"'\\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\s]*)?/gi
  )) {
    const url = unescapeEmbeddedUrl(raw)
    if (isUsableImageUrl(url)) urls.add(url)
  }

  return Array.from(urls)
}

function extractTextFromHtml(html: string): { title: string; description: string } {
  const ogTitle = metaContent(html, 'og:title')
  const ogDescription = metaContent(html, 'og:description')
  const title = ogTitle || metaContent(html, 'twitter:title')
  const description =
    ogDescription || metaContent(html, 'twitter:description') || metaContent(html, 'description')
  return { title: title.trim(), description: description.trim() }
}

function pickTitle(title: string, description: string): string {
  if (title && title.toLowerCase() !== 'facebook') return title
  const firstLine = description.split('\n').map((l) => l.trim()).find(Boolean)
  return firstLine?.slice(0, 120) || title || 'Facebook import'
}

function mergeImageUrls(...lists: string[][]): string[] {
  return dedupeFacebookImageUrls(lists.flat())
}

function buildFetchError(graphErrors: string[]): string {
  const unique = Array.from(new Set(graphErrors.filter(Boolean)))
  if (unique.length) {
    return `No images found on Facebook post. Graph API: ${unique.join('; ')}`
  }
  return 'No images found on Facebook post (set FACEBOOK_GRAPH_ACCESS_TOKEN on the VPS for photo/carousel links)'
}

/** Hybrid fetch: Graph post/photo → scrape → oEmbed → HTML OG/meta. */
export async function fetchFacebookPost(postUrl: string): Promise<FacebookPostData> {
  const normalizedUrl = canonicalizeFacebookUrl(normalizeFacebookPostUrl(postUrl))
  const meta = parseFacebookUrlMeta(normalizedUrl)
  const externalId = facebookExternalIdFromUrl(normalizedUrl)

  let title = ''
  let description = ''
  let imageUrls: string[] = []
  const graphErrors: string[] = []

  const graph = await fetchFacebookGraphForUrl(meta)
  graphErrors.push(...graph.errors)
  title = graph.title ?? ''
  description = graph.description ?? ''
  imageUrls = mergeImageUrls(imageUrls, graph.imageUrls)

  const oembedUrls = isFacebookPermalinkMeta(meta)
    ? facebookPermalinkFetchUrls(meta)
    : [meta.normalizedUrl]

  for (const oembedUrl of oembedUrls) {
    const oembed = await fetchFacebookOEmbed(oembedUrl)
    if (!oembed) continue
    title = title || oembed.title || ''
    if (oembed.thumbnailUrl) {
      imageUrls = mergeImageUrls(imageUrls, [oembed.thumbnailUrl])
    }
    if (oembed.html) {
      imageUrls = mergeImageUrls(imageUrls, extractImageUrlsFromHtml(oembed.html))
      const text = extractTextFromHtml(oembed.html)
      description = description || text.description
    }
    if (imageUrls.length && description) break
  }

  if (!title || !description || !imageUrls.length) {
    const htmlUrls = isFacebookPermalinkMeta(meta)
      ? facebookPermalinkFetchUrls(meta)
      : [meta.normalizedUrl]

    for (const htmlUrl of htmlUrls) {
      const html = await fetchFacebookHtml(htmlUrl)
      const text = extractTextFromHtml(html)
      title = title || text.title
      description = description || text.description
      imageUrls = mergeImageUrls(imageUrls, extractImageUrlsFromHtml(html))
    }
  }

  title = pickTitle(decodeHtml(title), decodeHtml(description))
  description = decodeHtml(description)

  if (!description && title) {
    description = title
  }

  const detectedPriceHint = parseEmojiPriceHint(`${title}\n${description}`)

  if (!imageUrls.length) {
    throw new Error(buildFetchError(graphErrors))
  }

  return {
    postUrl: normalizedUrl,
    externalId,
    title,
    description,
    imageUrls,
    detectedPriceHint,
  }
}
