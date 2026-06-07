import type { NextRequest } from 'next/server'

const LOCAL_DEV_ORIGINS = new Set(['http://localhost:3000', 'http://127.0.0.1:3000'])

export function catalogImageUploadCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin')?.trim()
  if (!origin || !LOCAL_DEV_ORIGINS.has(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'X-Catalogus-User-Id, X-Catalogus-User-Email, Content-Type',
    Vary: 'Origin',
  }
}

export function hasCatalogAdminUploadHeaders(request: NextRequest): boolean {
  return Boolean(
    request.headers.get('x-catalogus-user-id')?.trim() &&
      request.headers.get('x-catalogus-user-email')?.trim()
  )
}
