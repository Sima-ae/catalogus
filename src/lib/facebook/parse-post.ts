import { decodeWooHtmlEntities } from '@/lib/woocommerce/types'
import {
  fetchFacebookGraphScrape,
  fetchFacebookHtml,
  fetchFacebookOEmbed,
} from '@/lib/facebook/client'
import { parseEmojiPriceHint } from '@/lib/facebook/parse-emoji-price'
import { facebookExternalIdFromUrl, normalizeFacebookPostUrl } from '@/lib/facebook/parse-url'
import type { FacebookPostData } from '@/lib/facebook/types'

function decodeHtml(text: string): string {
  return decodeWooHtmlEntities(
    text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
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

function extractImageUrlsFromHtml(html: string): string[] {
  const urls = new Set<string>()

  for (const raw of collectRegexMatches(
    html,
    /property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi
  )) {
    urls.add(raw.replace(/&amp;/g, '&'))
  }
  for (const raw of collectRegexMatches(
    html,
    /content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi
  )) {
    urls.add(raw.replace(/&amp;/g, '&'))
  }

  for (const raw of collectRegexMatches(
    html,
    /https:\/\/[^"'\\s]+(?:scontent|fbcdn)[^"'\\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\s]*)?/gi
  )) {
    urls.add(raw.replace(/\\u0026/g, '&').replace(/&amp;/g, '&'))
  }

  return Array.from(urls)
}

function extractTextFromHtml(html: string): { title: string; description: string } {
  const ogTitle = metaContent(html, 'og:title')
  const ogDescription = metaContent(html, 'og:description')
  const title = ogTitle || metaContent(html, 'twitter:title')
  const description = ogDescription || metaContent(html, 'twitter:description') || metaContent(html, 'description')
  return { title: title.trim(), description: description.trim() }
}

function pickTitle(title: string, description: string): string {
  if (title && title.toLowerCase() !== 'facebook') return title
  const firstLine = description.split('\n').map((l) => l.trim()).find(Boolean)
  return firstLine?.slice(0, 120) || title || 'Facebook import'
}

function mergeImageUrls(...lists: string[][]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    for (const url of list) {
      const trimmed = url.trim()
      if (!trimmed || seen.has(trimmed)) continue
      seen.add(trimmed)
      out.push(trimmed)
    }
  }
  return out
}

/** Hybrid fetch: Graph scrape → oEmbed → HTML OG/meta. */
export async function fetchFacebookPost(postUrl: string): Promise<FacebookPostData> {
  const normalizedUrl = normalizeFacebookPostUrl(postUrl)
  const externalId = facebookExternalIdFromUrl(normalizedUrl)

  let title = ''
  let description = ''
  let imageUrls: string[] = []

  const graph = await fetchFacebookGraphScrape(normalizedUrl)
  if (graph) {
    title = graph.title ?? ''
    description = graph.description ?? ''
    imageUrls = mergeImageUrls(imageUrls, graph.imageUrls)
  }

  const oembed = await fetchFacebookOEmbed(normalizedUrl)
  if (oembed) {
    title = title || oembed.title || ''
    if (oembed.thumbnailUrl) {
      imageUrls = mergeImageUrls(imageUrls, [oembed.thumbnailUrl])
    }
    if (oembed.html) {
      imageUrls = mergeImageUrls(imageUrls, extractImageUrlsFromHtml(oembed.html))
      const text = extractTextFromHtml(oembed.html)
      description = description || text.description
    }
  }

  if (!title || !description || !imageUrls.length) {
    const html = await fetchFacebookHtml(normalizedUrl)
    const text = extractTextFromHtml(html)
    title = title || text.title
    description = description || text.description
    imageUrls = mergeImageUrls(imageUrls, extractImageUrlsFromHtml(html))
  }

  title = pickTitle(decodeHtml(title), decodeHtml(description))
  description = decodeHtml(description)

  if (!description && title) {
    description = title
  }

  const detectedPriceHint = parseEmojiPriceHint(`${title}\n${description}`)

  if (!imageUrls.length) {
    throw new Error('No images found on Facebook post (try FACEBOOK_GRAPH_ACCESS_TOKEN on the VPS)')
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
