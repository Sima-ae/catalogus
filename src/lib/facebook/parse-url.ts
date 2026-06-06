import { createHash } from 'crypto'

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

/** Stable id for dedup and image folder names (e.g. fb-pfbid0fkLmBC…). */
export function facebookExternalIdFromUrl(raw: string): string {
  const url = new URL(normalizeFacebookPostUrl(raw))
  const storyFbid = url.searchParams.get('story_fbid')?.trim()
  if (storyFbid) {
    const safe = storyFbid.replace(/[^a-zA-Z0-9_-]+/g, '').slice(0, 80)
    return `fb-${safe}`
  }

  const postsMatch = url.pathname.match(/\/posts\/(\d+)/i)
  if (postsMatch?.[1]) return `fb-post-${postsMatch[1]}`

  const photoMatch = url.pathname.match(/\/photo(?:\.php|\/)/i)
  const fbid = url.searchParams.get('fbid')?.trim()
  if (photoMatch && fbid) return `fb-photo-${fbid.replace(/\D+/g, '').slice(0, 24)}`

  const pageId = url.searchParams.get('id')?.trim()
  if (pageId && url.pathname.includes('permalink')) {
    return `fb-page-${pageId}-${hashUrl(url.href).slice(0, 12)}`
  }

  return `fb-${hashUrl(url.href).slice(0, 24)}`
}
