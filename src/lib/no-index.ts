import type { Metadata } from 'next'
import type { NextResponse } from 'next/server'

/** HTTP header — respected by Google, Bing, and most crawlers. */
export const NO_INDEX_ROBOTS_HEADER = 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate'

/** Next.js metadata robots block for every HTML page. */
export const NO_INDEX_METADATA: NonNullable<Metadata['robots']> = {
  index: false,
  follow: false,
  nocache: true,
  noarchive: true,
  nosnippet: true,
  noimageindex: true,
  notranslate: true,
  googleBot: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    notranslate: true,
    'max-video-preview': -1,
    'max-image-preview': 'none',
    'max-snippet': -1,
  },
}

export function withNoIndexMetadata(metadata: Metadata = {}): Metadata {
  return {
    ...metadata,
    robots: NO_INDEX_METADATA,
  }
}

export function applyNoIndexHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Robots-Tag', NO_INDEX_ROBOTS_HEADER)
  return response
}

export const NO_INDEX_RESPONSE_HEADERS: Record<string, string> = {
  'X-Robots-Tag': NO_INDEX_ROBOTS_HEADER,
}
