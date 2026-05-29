import { appPath, appUrl, shopCategoryUrl } from '@/lib/paths'
import {
  buildProductGallery,
  normalizeProductImageUrl,
} from '@/lib/product-image-url'
import { parsePipeField, parseProductJsonField } from '@/lib/product-serialize'

export type ProductPageView = {
  id: string
  name: string
  description: string
  shortDescription: string
  longDescription: string
  price: number
  original_price?: number
  sku: string
  category: string
  categoryHref: string
  author: string
  author_icon: string
  rating: number
  reviewCount: number
  downloads: number
  lastUpdated: string
  version: string
  compatibility: string
  license: string
  tags: string[]
  features: string[]
  requirements: string[]
  image_url: string
  gallery: string[]
  availableSizes: string[]
  availableColors: string[]
  demo_url: string
  documentation_url: string
  support_url: string
}

function formatDate(value: unknown): string {
  if (!value) return '—'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function galleryFromApi(raw: Record<string, unknown>): string[] | null {
  const field = raw.gallery_images
  if (Array.isArray(field)) {
    return field.map(String).filter(Boolean)
  }
  return parseProductJsonField(field)
}

/** Map API / database product row to product page UI model (database fields only). */
export function toProductPageView(raw: Record<string, unknown>): ProductPageView {
  const category = String(raw.category || '').trim()
  const mainImage = normalizeProductImageUrl(String(raw.image_url || ''))
  const gallery = buildProductGallery(mainImage, galleryFromApi(raw))
  const requirements = parseProductJsonField(raw.requirements) ?? []
  const features = parseProductJsonField(raw.features) ?? []
  const tags = parseProductJsonField(raw.tags) ?? []
  const description = String(raw.description || '').trim()
  const shortDescription = String(raw.short_description ?? '').trim()

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name || 'Product'),
    description,
    shortDescription,
    longDescription: description || shortDescription,
    price: Number(raw.price) || 0,
    original_price:
      raw.original_price != null && raw.original_price !== ''
        ? Number(raw.original_price)
        : undefined,
    sku: String(raw.sku || '—'),
    category,
    categoryHref: category ? shopCategoryUrl(category) : appPath('/'),
    author: String(raw.author || ''),
    author_icon: String(raw.author_icon || ''),
    rating: Number(raw.rating) || 0,
    reviewCount: Number(raw.review_count) || 0,
    downloads: Number(raw.download_count) || 0,
    lastUpdated: formatDate(raw.updated_at || raw.created_at),
    version: String(raw.version || '—'),
    compatibility:
      String(raw.compatibility || '').trim() || requirements[0] || '—',
    license: String(raw.license_type || '—'),
    tags,
    features,
    requirements,
    image_url: mainImage,
    gallery,
    availableSizes: parsePipeField(raw.available_sizes) ?? [],
    availableColors: parsePipeField(raw.available_colors) ?? [],
    demo_url: String(raw.demo_url || '').trim() || appPath('/contact'),
    documentation_url: String(raw.documentation_url || '').trim() || appPath('/contact'),
    support_url: String(raw.support_url || '').trim() || appUrl('/contact'),
  }
}
