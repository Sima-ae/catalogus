import type { BrandRecord } from '@/lib/brand-types'
import {
  deleteBrandById,
  getBrandById,
  insertBrand,
  listBrands,
  updateBrandById,
} from '@/lib/brands-db'

export async function loadAllBrands(): Promise<BrandRecord[]> {
  try {
    return (await listBrands(false)) as BrandRecord[]
  } catch {
    return []
  }
}

export async function loadActiveBrands(): Promise<BrandRecord[]> {
  try {
    return (await listBrands(true)) as BrandRecord[]
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
}): Promise<BrandRecord> {
  return (await insertBrand(input)) as BrandRecord
}

export async function saveBrand(
  id: string,
  input: { name: string; slug: string; description?: string; active?: boolean }
): Promise<
  | { ok: true; row: BrandRecord }
  | { ok: false; status: number; error: string }
> {
  try {
    const row = await updateBrandById(id, input)
    if (!row) {
      return { ok: false, status: 404, error: 'Brand not found in database' }
    }
    return { ok: true, row: row as BrandRecord }
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'ER_DUP_ENTRY') {
      return { ok: false, status: 409, error: 'A brand with this slug already exists' }
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
  return { ok: true }
}
