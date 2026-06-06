#!/usr/bin/env npx tsx
/**
 * Repair Facebook + WooCommerce import product images:
 * - Normalize stored URLs to site-relative /images/… paths
 * - Re-download missing files when source URL / WooCommerce id is available
 *
 *   npm run db:repair-import-images
 *   npm run db:repair-import-images -- --dry-run
 *   npm run db:repair-import-images -- --product-id=<uuid>
 *   npm run db:repair-import-images -- --remirror
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb } from '@/lib/db'
import { catalogImageFileExists } from '@/lib/catalog-image-storage'
import { describeCatalogImagesWriteTarget } from '@/lib/catalog-images-root'
import {
  buildProductGallery,
  normalizeProductImageList,
  normalizeProductImageUrl,
} from '@/lib/product-image-url'
import { parseProductJsonField } from '@/lib/product-serialize'
import { updateProduct } from '@/lib/products-db'
import { fetchFacebookPost } from '@/lib/facebook/parse-post'
import { mirrorFacebookPostImages } from '@/lib/facebook/mirror-images'
import { getWooStoreProduct } from '@/lib/woocommerce/client'
import { mapWooStoreProduct } from '@/lib/woocommerce/map-product'
import { mirrorWooCommerceProductImages } from '@/lib/woocommerce/mirror-images'
import { parseWooExternalId } from '@/lib/woocommerce/types'
import { listImportSources } from '@/lib/import-db'

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

function isRemoteImportUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) && !url.includes('/images/imports/')
}

async function urlsMissingOnDisk(urls: string[]): Promise<string[]> {
  const missing: string[] = []
  for (const url of urls) {
    if (!url.startsWith('/images/')) {
      if (isRemoteImportUrl(url)) missing.push(url)
      continue
    }
    if (!(await catalogImageFileExists(url))) missing.push(url)
  }
  return missing
}

async function resolveWooStoreUrl(): Promise<string | null> {
  const sources = await listImportSources()
  const woo = sources.find((s) => String(s.source_type ?? '').toLowerCase() === 'woocommerce')
  const fromSource = String(woo?.woocommerce_store_url ?? '').trim()
  if (fromSource) return fromSource.replace(/\/+$/, '')
  const fromEnv = String(process.env.WOOCOMMERCE_STORE_URL ?? '').trim()
  return fromEnv ? fromEnv.replace(/\/+$/, '') : null
}

async function remirrorFacebookProduct(row: {
  source_album_id: string | null
  source_url: string | null
}): Promise<string[]> {
  const postUrl = String(row.source_url ?? '').trim()
  if (!postUrl) throw new Error('Missing source_url for Facebook re-mirror')

  const post = await fetchFacebookPost(postUrl)
  const externalId = post.externalId || String(row.source_album_id ?? '').trim()
  return mirrorFacebookPostImages(externalId, post.imageUrls)
}

async function remirrorWooProduct(row: {
  source_album_id: string | null
  source_url: string | null
  id: string
}): Promise<string[]> {
  const folderKey = String(row.source_album_id ?? '').trim() || `wc-product-${row.id}`
  const wooId = parseWooExternalId(folderKey)

  if (wooId != null) {
    const storeUrl = await resolveWooStoreUrl()
    if (!storeUrl) throw new Error('WooCommerce store URL not configured on import source')
    const product = await getWooStoreProduct(storeUrl, wooId)
    const mapped = mapWooStoreProduct(product)
    return mirrorWooCommerceProductImages(mapped.externalId, mapped.imageUrls)
  }

  const gallery = buildProductGallery(row.source_url, [])
  if (gallery.length && isRemoteImportUrl(gallery[0]!)) {
    return mirrorWooCommerceProductImages(folderKey, gallery)
  }

  throw new Error('Cannot re-mirror WooCommerce product without wc- id or remote image URLs')
}

async function main() {
  loadDotEnv()

  const dryRun = process.argv.includes('--dry-run')
  const remirror = process.argv.includes('--remirror')
  const productIdArg = process.argv.find((a) => a.startsWith('--product-id='))
  const productIdFilter = productIdArg?.split('=')[1]?.trim() || null

  console.log('Images write root:', describeCatalogImagesWriteTarget())

  const rows = await queryDb<
    {
      id: string
      name: string
      image_url: string | null
      gallery_images: string | null
      source_album_id: string | null
      source_url: string | null
    }[]
  >(
    productIdFilter
      ? `SELECT id, name, image_url, gallery_images, source_album_id, source_url
         FROM products WHERE id = ? LIMIT 1`
      : `SELECT id, name, image_url, gallery_images, source_album_id, source_url
         FROM products
         WHERE source_album_id LIKE 'fb-%'
            OR source_album_id LIKE 'wc-%'
            OR image_url LIKE '%/images/imports/facebook/%'
            OR image_url LIKE '%/images/imports/woocommerce/%'
            OR gallery_images LIKE '%/images/imports/%'
         ORDER BY name ASC`,
    productIdFilter ? [productIdFilter] : []
  )

  let normalized = 0
  let remirrored = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    const gallery = parseProductJsonField(row.gallery_images) ?? []
    const combined = buildProductGallery(row.image_url, gallery)
    if (!combined.length) {
      console.log(`SKIP (no images): ${row.name}`)
      skipped++
      continue
    }

    let nextUrls = combined.map((u) => normalizeProductImageUrl(u)).filter(Boolean)
    const missing = await urlsMissingOnDisk(nextUrls)
    const needsRemirror = remirror || missing.length > 0

    const storedNormalized =
      normalizeProductImageUrl(row.image_url) !== String(row.image_url ?? '').trim() ||
      JSON.stringify(normalizeProductImageList(gallery)) !== JSON.stringify(gallery)

    if (!needsRemirror && !storedNormalized) {
      skipped++
      continue
    }

    console.log(`==> ${row.name} (${row.source_album_id ?? row.id})`)

    if (needsRemirror && !dryRun) {
      try {
        const sourceId = String(row.source_album_id ?? '')
        if (sourceId.startsWith('fb-')) {
          nextUrls = await remirrorFacebookProduct(row)
        } else if (sourceId.startsWith('wc-') || /woocommerce/i.test(combined.join(' '))) {
          nextUrls = await remirrorWooProduct(row)
        } else if (combined.some(isRemoteImportUrl)) {
          nextUrls = await remirrorWooProduct(row)
        } else {
          console.warn('WARN: missing files but no re-mirror source — keeping normalized URLs only')
        }
        remirrored++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`FAIL re-mirror: ${message}`)
        failed++
        continue
      }
    } else if (needsRemirror && dryRun) {
      console.log(`  would re-mirror (${missing.length} missing on disk)`)
    }

    const main = nextUrls[0] ?? ''
    const galleryOut = nextUrls.length > 1 ? nextUrls.slice(1) : null

    if (dryRun) {
      console.log(`  main: ${main}`)
      normalized++
      continue
    }

    await updateProduct(row.id, {
      image_url: main,
      gallery_images: galleryOut,
    })
    console.log(`OK: ${main}`)
    normalized++
  }

  console.log(
    `Done. updated=${normalized} remirrored=${remirrored} skipped=${skipped} failed=${failed}${dryRun ? ' (dry-run)' : ''}`
  )
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
