import {
  normalizeProductImageList,
  resolveProductDisplayImages,
} from '@/lib/product-image-url'
import { stripAllBrandPrefixesFromSku } from '@/lib/product-sku'

/** Pipe-delimited DB field (e.g. sizes `39|40|41`) → string array. */
export function parsePipeField(value: unknown): string[] | null {
  if (value == null || value === '') return null
  if (Array.isArray(value)) {
    const list = value.map(String).map((s) => s.trim()).filter(Boolean)
    return list.length ? list : null
  }
  const raw = String(value).trim()
  if (!raw) return null
  const list = raw.split('|').map((s) => s.trim()).filter(Boolean)
  return list.length ? list : null
}

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

export type SerializeProductRowOptions = {
  /** Known brand SKU slugs (server-loaded); omit on client-safe code paths. */
  brandSkuPrefixes?: string[]
}

export function serializeProductRow(
  row: Record<string, unknown>,
  options?: SerializeProductRowOptions
) {
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

  const sourceUrl = row.source_url != null ? String(row.source_url) : null
  const rawGallery = parseProductJsonField(row.gallery_images)
  const { main, gallery } = resolveProductDisplayImages(
    String(row.image_url ?? ''),
    rawGallery,
    sourceUrl
  )

  const rawSku = row.sku != null ? String(row.sku).trim() : ''
  const prefixes = options?.brandSkuPrefixes ?? []
  const sku = rawSku && prefixes.length
    ? stripAllBrandPrefixesFromSku(rawSku, prefixes)
    : rawSku

  return {
    ...rest,
    sku,
    id: String(row.id ?? ''),
    image_url: main,
    category,
    category_id: row.category_id ?? row.resolved_category_id ?? null,
    brand: brand || undefined,
    brand_id: row.brand_id ?? row.resolved_brand_id ?? null,
    gallery_images: gallery,
    available_sizes: parsePipeField(row.available_sizes),
    available_colors: parsePipeField(row.available_colors),
    source_url: row.source_url != null ? String(row.source_url) : null,
    source_album_id: row.source_album_id != null ? String(row.source_album_id) : null,
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
    status: String(row.status || 'active'),
    created_at: row.created_at != null ? String(row.created_at) : '',
    updated_at: row.updated_at != null ? String(row.updated_at) : '',
  }
}
