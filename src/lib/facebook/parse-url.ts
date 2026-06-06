import { createHash } from 'crypto'

export type FacebookUrlMeta = {
  normalizedUrl: string
  fbid: string | null
  /** Parent post id from set=pcb.{postId} carousel links. */
  pcbPostId: string | null
  storyFbid: string | null
  pageId: string | null
}

function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex')
}

/** Normalize and validate a Facebook post URL. */
export function normalizeFacebookPostUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Facebook post URL is required')
  let url: URL
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  } catch {
    throw new Error('Invalid Facebook post URL')
  }
  if (!url.hostname.includes('facebook.com') && !url.hostname.includes('fb.com')) {
    throw new Error('URL must be a facebook.com or fb.com link')
  }
  return url.href
}

/** Prefer photo.php and stable query ordering for Graph scrape/oEmbed. */
export function canonicalizeFacebookUrl(raw: string): string {
  const url = new URL(normalizeFacebookPostUrl(raw))
  if (url.pathname === '/photo' || url.pathname === '/photo/') {
    url.pathname = '/photo.php'
  }
  return url.href
}

export function parseFacebookUrlMeta(raw: string): FacebookUrlMeta {
  const normalizedUrl = canonicalizeFacebookUrl(raw)
  const url = new URL(normalizedUrl)

  const fbid = url.searchParams.get('fbid')?.trim() || null
  const storyFbid = url.searchParams.get('story_fbid')?.trim() || null
  const pageId = url.searchParams.get('id')?.trim() || null

  let pcbPostId: string | null = null
  const setParam = url.searchParams.get('set')?.trim()
  if (setParam?.toLowerCase().startsWith('pcb.')) {
    const id = setParam.slice(4).replace(/\D+/g, '')
    pcbPostId = id || null
  }

  return {
    normalizedUrl,
    fbid,
    pcbPostId,
    storyFbid,
    pageId,
  }
}

/** URL variants to scrape/fetch for permalink.php?story_fbid=…&id=… links. */
export function facebookPermalinkFetchUrls(meta: FacebookUrlMeta): string[] {
  const urls: string[] = []
  const add = (href: string) => {
    if (href && !urls.includes(href)) urls.push(href)
  }

  add(meta.normalizedUrl)

  if (meta.storyFbid && meta.pageId) {
    add(
      `https://www.facebook.com/permalink.php?story_fbid=${encodeURIComponent(meta.storyFbid)}&id=${encodeURIComponent(meta.pageId)}`
    )
    add(`https://www.facebook.com/${meta.pageId}/posts/${meta.storyFbid}`)
  }

  return urls
}

export function isFacebookPermalinkMeta(meta: FacebookUrlMeta): boolean {
  return Boolean(meta.storyFbid && meta.pageId)
}

/** Stable id for dedup and image folder names (e.g. fb-pcb-122208938522516795). */
export function facebookExternalIdFromUrl(raw: string): string {
  const meta = parseFacebookUrlMeta(raw)
  const url = new URL(meta.normalizedUrl)

  if (meta.pcbPostId) return `fb-pcb-${meta.pcbPostId}`

  if (meta.storyFbid) {
    const safe = meta.storyFbid.replace(/[^a-zA-Z0-9_-]+/g, '').slice(0, 80)
    return `fb-${safe}`
  }

  const postsMatch = url.pathname.match(/\/posts\/(\d+)/i)
  if (postsMatch?.[1]) return `fb-post-${postsMatch[1]}`

  if (meta.fbid) return `fb-photo-${meta.fbid.replace(/\D+/g, '').slice(0, 24)}`

  if (meta.pageId && url.pathname.includes('permalink')) {
    return `fb-page-${meta.pageId}-${hashUrl(url.href).slice(0, 12)}`
  }

  return `fb-${hashUrl(url.href).slice(0, 24)}`
}
