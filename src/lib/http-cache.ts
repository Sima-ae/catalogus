import { NextResponse } from 'next/server'
import { NO_INDEX_RESPONSE_HEADERS } from '@/lib/no-index'

/** Read-only catalog metadata — admin changes propagate within ~60s. */
export const CATALOG_METADATA_CACHE_CONTROL =
  'public, s-maxage=60, stale-while-revalidate=300'

/** Filter-derived lists (brands/subcategories per query). */
export const CATALOG_FILTER_CACHE_CONTROL =
  'public, s-maxage=30, stale-while-revalidate=120'

/** Infrequently changing activity pool for client-side daily rotation. */
export const ACTIVITY_POOL_CACHE_CONTROL =
  'public, s-maxage=300, stale-while-revalidate=900'

export function jsonCached<T>(
  data: T,
  cacheControl: string = CATALOG_METADATA_CACHE_CONTROL
): NextResponse {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': cacheControl,
      ...NO_INDEX_RESPONSE_HEADERS,
    },
  })
}
