import type { MetadataRoute } from 'next'

const BLOCKED_AGENTS = [
  '*',
  'Googlebot',
  'Googlebot-Image',
  'Googlebot-News',
  'Googlebot-Video',
  'Google-Extended',
  'Bingbot',
  'Slurp',
  'DuckDuckBot',
  'Baiduspider',
  'YandexBot',
  'facebookexternalhit',
  'Twitterbot',
  'LinkedInBot',
  'Applebot',
  'ia_archiver',
] as const

/** Block all crawlers from indexing any URL on this private catalog. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: BLOCKED_AGENTS.map((userAgent) => ({
      userAgent,
      disallow: '/',
    })),
  }
}
