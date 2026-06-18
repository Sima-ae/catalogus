import type { BrandRecord } from '@/lib/brand-types'
import {
  deleteBrandById,
  getBrandById,
  insertBrand,
  listBrands,
  updateBrandById,
} from '@/lib/brands-db'
import { getCachedValue, invalidateCachedNamespace } from '@/lib/server-ttl-cache'

const ACTIVE_BRANDS_CACHE_NS = 'active-brands'
const ACTIVE_BRANDS_TTL_MS = 180_000

function activeBrandsCacheKey(categoryName?: string, subcategory?: string): string {
  return `${categoryName?.trim() || ''}|${subcategory?.trim() || ''}`
}

export function invalidateActiveBrandsCache(): void {
  invalidateCachedNamespace(ACTIVE_BRANDS_CACHE_NS)
}

export async function loadAllBrands(): Promise<BrandRecord[]> {
  try {
    return (await listBrands(false)) as BrandRecord[]
  } catch {
    return []
  }
}

export async function loadActiveBrands(
  categoryName?: string,
  subcategory?: string
): Promise<BrandRecord[]> {
  try {
    return getCachedValue(
      ACTIVE_BRANDS_CACHE_NS,
      activeBrandsCacheKey(categoryName, subcategory),
      ACTIVE_BRANDS_TTL_MS,
      async () => (await listBrands(true, categoryName, subcategory)) as BrandRecord[]
    )
  } catch {
    return []
  }
}

export async function loadBrandById(id: string): Promise<BrandRecord | null> {
  const row = await getBrandById(id)
  return (row as BrandRecord | null) ?? null
}

export async function createBrand(input: {
  name: string
  slug: string
  description?: string
  categoryIds?: string[]
}): Promise<BrandRecord> {
  const row = (await insertBrand(input)) as BrandRecord
  invalidateActiveBrandsCache()
  return row
}

export async function saveBrand(
  id: string,
  input: {
    name: string
    slug: string
    description?: string
    active?: boolean
    categoryIds?: string[]
  }
): Promise<
  | { ok: true; row: BrandRecord }
  | { ok: false; status: number; error: string }
> {
  try {
    const row = await updateBrandById(id, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      active: input.active,
      categoryIds: input.categoryIds,
    })
    if (!row) {
      return { ok: false, status: 404, error: 'Brand not found in database' }
    }
    invalidateActiveBrandsCache()
    return { ok: true, row: row as BrandRecord }
  } catch (error) {
    const code = (error as { code?: string })?.code
    const message = String((error as { message?: string })?.message ?? '').toLowerCase()
    if (code === 'ER_DUP_ENTRY') {
      if (message.includes('uq_brands_slug') || message.includes("key 'slug'")) {
        return { ok: false, status: 409, error: 'A brand with this slug already exists' }
      }
      if (
        message.includes('uq_products_source_album_brand') ||
        message.includes('source_album_brand')
      ) {
        return {
          ok: false,
          status: 409,
          error:
            'Could not sync the brand name on imported products (duplicate album entries). Try renaming only, or fix conflicting products first.',
        }
      }
      return { ok: false, status: 409, error: 'A conflicting record already exists' }
    }
    throw error
  }
}

export async function removeBrand(
  id: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const existing = await getBrandById(id)
  if (!existing) {
    return { ok: false, status: 404, error: 'Brand not found' }
  }
  await deleteBrandById(id)
  invalidateActiveBrandsCache()
  return { ok: true }
}
