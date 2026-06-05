import type { MetadataRoute } from 'next'

/** Block all crawlers from indexing any URL on this site. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  }
}
