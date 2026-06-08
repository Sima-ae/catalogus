import { resolveProductVersion } from '@/lib/brand'
import { appPath, appUrl, shopBrandUrl, shopCategoryUrl } from '@/lib/paths'
import { resolveProductDisplayImages } from '@/lib/product-image-url'
import { parsePipeField, parseProductJsonField } from '@/lib/product-serialize'
import { cleanImportDescription, sanitizeProductName } from '@/lib/yupoo/import-text'

import { parseBrandCompound } from '@/lib/product-taxonomy'

export type ProductPageBrand = {
  name: string
  href: string
}

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
  /** Full stored brand label (single or collab, e.g. "LOUIS VUITTON X NIKE"). */
  brand: string
  /** One pill per brand segment for collab products. */
  brands: ProductPageBrand[]
  /** @deprecated Prefer `brands[0]?.href` */
  brandHref: string
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
  sold_out: boolean
  pre_order: boolean
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
  const brandDisplay = String(raw.brand ?? '').trim()
  const sourceUrl = raw.source_url != null ? String(raw.source_url) : null
  const galleryRaw = galleryFromApi(raw)
  const { main, gallery } = resolveProductDisplayImages(
    String(raw.image_url || ''),
    galleryRaw,
    sourceUrl
  )
  const fullGallery = main ? [main, ...(gallery ?? [])] : [...(gallery ?? [])]
  const requirements = parseProductJsonField(raw.requirements) ?? []
  const features = parseProductJsonField(raw.features) ?? []
  const tags = parseProductJsonField(raw.tags) ?? []
  const name = sanitizeProductName(String(raw.name || 'Product').trim()) || 'Product'
  const brand = raw.brand != null ? String(raw.brand).trim() : null
  const rawDescription = String(raw.description || '').trim()
  const rawShort = String(raw.short_description ?? '').trim()
  const description = cleanImportDescription(rawDescription, name, brand)
  const cleanedShort = rawShort ? cleanImportDescription(rawShort, name, brand) : ''
  const shortDescription = cleanedShort || description.slice(0, 280) || description

  const brandLabels = parseBrandCompound(brandDisplay)
  const brands: ProductPageBrand[] = brandLabels.map((name) => ({
    name,
    href: shopBrandUrl(name),
  }))

  return {
    id: String(raw.id ?? ''),
    name,
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
    brand: brandDisplay,
    brands,
    brandHref: brands[0]?.href ?? (brandDisplay ? shopBrandUrl(brandDisplay) : appPath('/')),
    author: String(raw.author || ''),
    author_icon: String(raw.author_icon || ''),
    rating: Number(raw.rating) || 0,
    reviewCount: Number(raw.review_count) || 0,
    downloads: Number(raw.download_count) || 0,
    lastUpdated: formatDate(raw.updated_at || raw.created_at),
    version: resolveProductVersion(raw.version),
    compatibility:
      String(raw.compatibility || '').trim() || requirements[0] || '—',
    license: String(raw.license_type || '—'),
    tags,
    features,
    requirements,
    image_url: main,
    gallery: fullGallery,
    sold_out: raw.sold_out === 1 || raw.sold_out === true,
    pre_order: raw.pre_order === 1 || raw.pre_order === true,
    availableSizes: parsePipeField(raw.available_sizes) ?? [],
    availableColors: parsePipeField(raw.available_colors) ?? [],
    demo_url: String(raw.demo_url || '').trim() || appPath('/contact'),
    documentation_url: String(raw.documentation_url || '').trim() || appPath('/contact'),
    support_url: String(raw.support_url || '').trim() || appUrl('/contact'),
  }
}
