import type { ProductInput } from '@/lib/products-db'
import { APP_DEFAULT_AUTHOR, APP_DEFAULT_AUTHOR_ICON } from '@/lib/brand'
import { normalizeProductImageList, normalizeProductImageUrl } from '@/lib/product-image-url'
import { normalizeProductSku } from '@/lib/product-sku'

/** One item per line (or comma-separated tags). */
export function linesToStringArray(value: unknown): string[] | null {
  if (value == null || value === '') return null
  if (Array.isArray(value)) {
    const list = value.map(String).map((s) => s.trim()).filter(Boolean)
    return list.length ? list : null
  }
  if (typeof value === 'string') {
    const list = value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    return list.length ? list : null
  }
  return null
}

export function arrayToLines(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join('\n')
  if (typeof value === 'string') return value
  return ''
}

export function pipeToLines(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join('\n')
  if (typeof value === 'string' && value.trim()) {
    return value.split('|').map((s) => s.trim()).filter(Boolean).join('\n')
  }
  return ''
}

export function linesToPipe(value: unknown): string | null {
  const lines = linesToStringArray(value)
  return lines?.join('|') ?? null
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Partial update for gallery reorder — only image fields. */
export function parseProductImageOrderBody(
  body: Record<string, unknown>
): Pick<ProductInput, 'image_url' | 'gallery_images'> {
  return {
    image_url: normalizeProductImageUrl(String(body.image_url || '').trim()),
    gallery_images: normalizeProductImageList(linesToStringArray(body.gallery_images)),
  }
}

export function isProductImageOrderPatch(body: Record<string, unknown>): boolean {
  const keys = Object.keys(body)
  return (
    keys.length > 0 && keys.every((key) => key === 'image_url' || key === 'gallery_images')
  )
}

export function parseProductBody(body: Record<string, unknown>): ProductInput {
  const tagsRaw = body.tags
  let tags: string[] | null = null
  if (typeof tagsRaw === 'string' && tagsRaw.trim()) {
    tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
  } else if (Array.isArray(tagsRaw)) {
    tags = tagsRaw.map(String).filter(Boolean)
  }

  return {
    name: String(body.name || '').trim(),
    description: String(body.description ?? '').trim(),
    short_description: String(body.short_description ?? '').trim() || undefined,
    price: Number(body.price) || 0,
    original_price:
      body.original_price != null && body.original_price !== ''
        ? Number(body.original_price)
        : null,
    image_url: normalizeProductImageUrl(String(body.image_url || '').trim()),
    category: String(body.category || '').trim(),
    brand:
      body.brand !== undefined && body.brand !== null
        ? String(body.brand).trim() || null
        : undefined,
    gallery_images: normalizeProductImageList(linesToStringArray(body.gallery_images)),
    available_sizes: linesToPipe(body.available_sizes),
    available_colors: linesToPipe(body.available_colors),
    source_url:
      body.source_url !== undefined
        ? String(body.source_url ?? '').trim() || null
        : undefined,
    source_album_id:
      body.source_album_id !== undefined
        ? String(body.source_album_id ?? '').trim() || null
        : undefined,
    tags,
    features: linesToStringArray(body.features),
    requirements: linesToStringArray(body.requirements),
    compatibility:
      body.compatibility !== undefined
        ? String(body.compatibility ?? '').trim() || null
        : undefined,
    author: String(body.author || APP_DEFAULT_AUTHOR).trim(),
    author_icon: String(body.author_icon || APP_DEFAULT_AUTHOR_ICON).trim(),
    sku: normalizeProductSku(body.sku),
    status: String(body.status || 'active'),
    featured: body.featured === true || body.featured === 'true' || body.featured === 1,
    version: body.version ? String(body.version) : null,
    license_type: body.license_type ? String(body.license_type) : null,
    demo_url: body.demo_url ? String(body.demo_url) : null,
    documentation_url: body.documentation_url ? String(body.documentation_url) : null,
    download_url: body.download_url ? String(body.download_url) : null,
    support_url: body.support_url !== undefined ? String(body.support_url ?? '').trim() : undefined,
    rating: parseOptionalNumber(body.rating),
    review_count: parseOptionalNumber(body.review_count),
    download_count: parseOptionalNumber(body.download_count),
  }
}
