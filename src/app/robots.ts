import type { MetadataRoute } from 'next'

const BLOCKED_AGENTS = [
  '*',
  'Googlebot',
  'Googlebot-Image',
  'Googlebot-News',
  'Googlebot-Video',
  'Google-Extended',
  'GoogleOther',
  'Storebot-Google',
  'AdsBot-Google',
  'Bingbot',
  'BingPreview',
  'msnbot',
  'Slurp',
  'DuckDuckBot',
  'Baiduspider',
  'YandexBot',
  'YandexImages',
  'Sogou',
  'Exabot',
  'facebot',
  'facebookexternalhit',
  'Twitterbot',
  'LinkedInBot',
  'Applebot',
  'PetalBot',
  'Bytespider',
  'ia_archiver',
  'archive.org_bot',
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'CCBot',
  'Amazonbot',
  'meta-externalagent',
  'PerplexityBot',
  'AhrefsBot',
  'SemrushBot',
  'DotBot',
  'MJ12bot',
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
