import {
  normalizeProductImageList,
  normalizeProductImageUrl,
} from '@/lib/product-image-url'

/** Normalize a product row from MariaDB for API responses (JSON fields + category from join). */
export function parseProductJsonField(value: unknown): string[] | null {
  if (value == null || value === '') return null
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return null
}

export function serializeProductRow(row: Record<string, unknown>) {
  /** Only expose names that exist in categories/brands tables (keeps shop in sync). */
  const category = String(row.resolved_category_name ?? '').trim()
  const brand = String(row.resolved_brand_name ?? row.brand ?? '').trim()

  const {
    resolved_category_name: _rn,
    resolved_category_id: _ri,
    resolved_category_slug: _rs,
    resolved_brand_name: _bn,
    resolved_brand_id: _bi,
    resolved_brand_slug: _bs,
    ...rest
  } = row

  return {
    ...rest,
    image_url: normalizeProductImageUrl(String(row.image_url ?? '')),
    category,
    category_id: row.category_id ?? row.resolved_category_id ?? null,
    brand: brand || undefined,
    brand_id: row.brand_id ?? row.resolved_brand_id ?? null,
    gallery_images: normalizeProductImageList(parseProductJsonField(row.gallery_images)),
    tags: parseProductJsonField(row.tags),
    features: parseProductJsonField(row.features) ?? [],
    requirements: parseProductJsonField(row.requirements) ?? [],
    compatibility: row.compatibility != null ? String(row.compatibility) : '',
    price: Number(row.price) || 0,
    original_price:
      row.original_price != null && row.original_price !== ''
        ? Number(row.original_price)
        : null,
    rating: row.rating != null ? Number(row.rating) : null,
    review_count: row.review_count != null ? Number(row.review_count) : null,
    download_count: row.download_count != null ? Number(row.download_count) : null,
    featured: row.featured === 1 || row.featured === true,
  }
}
