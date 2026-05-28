/** @type {import('next').NextConfig} */

function normalizeBasePath(value) {
  if (!value || value === '/') return ''
  return String(value).replace(/\/$/, '')
}

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Production: https://superclones.cloud/catalogus/
 * Local dev: http://localhost:3000/ (never use /catalogus in development)
 */
function getBasePath() {
  if (!isProduction) {
    return ''
  }

  const fromEnv = process.env.NEXT_PUBLIC_BASE_PATH
  if (fromEnv !== undefined && fromEnv !== '') {
    return normalizeBasePath(fromEnv)
  }
  return '/catalogus'
}

function getAppUrl(basePath) {
  if (!isProduction) {
    return 'http://localhost:3000'
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) {
    return String(fromEnv).replace(/\/$/, '')
  }
  return basePath ? `https://superclones.cloud${basePath}` : 'https://superclones.cloud'
}

const basePath = getBasePath()
const appUrl = getAppUrl(basePath)

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { basePath } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_APP_URL: appUrl,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
      },
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'pixarlaravel.s3.ap-southeast-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  async headers() {
    const securityHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ]

    if (isProduction) {
      securityHeaders.splice(1, 0, {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      })
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
