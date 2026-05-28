import { DEV_PRODUCTS, isDevDataFallbackEnabled } from '@/lib/dev-seed'
import type { Product } from '@/lib/types'
import type { ProductInput } from '@/lib/products-db'
import { randomUUID } from 'crypto'

export type Category = {
  id: string
  name: string
  slug: string
  description?: string
  active?: boolean
}

let devProducts: Product[] = DEV_PRODUCTS.map((p) => ({ ...p, status: p.status as Product['status'] }))
let devCategories: Category[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'WordPress Theme',
    slug: 'wordpress-theme',
    description: 'WordPress themes and templates',
    active: true,
  },
]

export function devModeEnabled() {
  return isDevDataFallbackEnabled()
}

export function listDevProducts() {
  return [...devProducts]
}

export function getDevProduct(id: string) {
  return devProducts.find((p) => p.id === id) ?? null
}

export function createDevProduct(input: ProductInput) {
  const now = new Date().toISOString()
  const product: Product = {
    id: randomUUID(),
    name: input.name,
    description: input.description,
    short_description: input.short_description,
    price: Number(input.price),
    original_price: input.original_price != null ? Number(input.original_price) : undefined,
    image_url: input.image_url,
    gallery_images: input.gallery_images ?? undefined,
    category: input.category,
    tags: input.tags ?? undefined,
    author: input.author,
    author_icon: input.author_icon,
    sku: input.sku ?? undefined,
    status: (input.status || 'active') as Product['status'],
    featured: !!input.featured,
    version: input.version ?? undefined,
    license_type: input.license_type ?? undefined,
    demo_url: input.demo_url ?? undefined,
    documentation_url: input.documentation_url ?? undefined,
    download_url: input.download_url ?? undefined,
    created_at: now,
    updated_at: now,
  }
  devProducts = [product, ...devProducts]
  return product
}

export function updateDevProduct(id: string, input: Partial<Product>) {
  const idx = devProducts.findIndex((p) => p.id === id)
  if (idx === -1) return null
  const updated = {
    ...devProducts[idx],
    ...input,
    id,
    updated_at: new Date().toISOString(),
  }
  devProducts[idx] = updated
  return updated
}

export function deleteDevProduct(id: string) {
  const before = devProducts.length
  devProducts = devProducts.filter((p) => p.id !== id)
  return devProducts.length < before
}

export function listDevCategories() {
  return [...devCategories]
}

export function createDevCategory(input: { name: string; slug: string; description?: string }) {
  const cat: Category = {
    id: randomUUID(),
    name: input.name,
    slug: input.slug,
    description: input.description,
    active: true,
  }
  devCategories = [cat, ...devCategories]
  return cat
}
