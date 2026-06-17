#!/usr/bin/env npx tsx
/**
 * Restore product image_url / gallery_images corrupted by bad dedupe (e.g. "/api/yupoo-image"
 * without ?url=). Uses import_job_items.raw_json when available; optional Yupoo re-fetch.
 *
 *   npm run db:restore-images -- --product-id=<uuid> [--product-id=...]
 *   npm run db:restore-images -- --all-broken
 *   npm run db:restore-images -- --dry-run
 *   npm run db:restore-images -- --fetch   # re-fetch Yupoo album when raw_json missing
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import {
  buildProductGallery,
  cleanProductGalleryUrls,
  isBrokenStoredProductImageUrl,
  normalizeProductImageList,
} from '@/lib/product-image-url'
import { parseProductJsonField } from '@/lib/product-serialize'
import { updateProduct } from '@/lib/products-db'
import { fetchHtml, sleep } from '@/lib/yupoo/client'
import { parseAlbumPage } from '@/lib/yupoo/parse-album'
import { mapWooStoreProduct } from '@/lib/woocommerce/map-product'
import type { WooStoreProduct } from '@/lib/woocommerce/types'

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

type ProductRow = {
  id: string
  name: string
  image_url: string | null
  gallery_images: string | null
  source_url: string | null
  source_album_id: string | null
}

type JobItemRow = {
  product_id: string | null
  album_url: string | null
  album_id: string | null
  raw_json: string | null
}

function parseProductIds(argv: string[]): string[] {
  const ids: string[] = []
  for (const arg of argv) {
    if (arg.startsWith('--product-id=')) {
      const value = arg.slice('--product-id='.length).trim()
      if (value) ids.push(...value.split(',').map((s) => s.trim()).filter(Boolean))
    }
  }
  return Array.from(new Set(ids))
}

function productNeedsRestore(row: ProductRow): boolean {
  const gallery = parseProductJsonField(row.gallery_images) ?? []
  const combined = buildProductGallery(row.image_url, gallery)
  if (!combined.length) return true
  return combined.some(isBrokenStoredProductImageUrl)
}

function imagesFromRawJson(raw: string | null): string[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as {
      album?: { images?: unknown }
      post?: { imageUrls?: unknown }
      lkxox?: { imageUrls?: unknown }
      product?: WooStoreProduct
    }

    if (Array.isArray(data.album?.images) && data.album.images.length) {
      return cleanProductGalleryUrls(data.album.images.map(String).filter(Boolean))
    }

    if (Array.isArray(data.post?.imageUrls) && data.post.imageUrls.length) {
      return cleanProductGalleryUrls(data.post.imageUrls.map(String).filter(Boolean))
    }

    if (Array.isArray(data.lkxox?.imageUrls) && data.lkxox.imageUrls.length) {
      return cleanProductGalleryUrls(data.lkxox.imageUrls.map(String).filter(Boolean))
    }

    if (data.product && typeof data.product === 'object') {
      const mapped = mapWooStoreProduct(data.product)
      if (mapped.imageUrls.length) {
        return cleanProductGalleryUrls(mapped.imageUrls)
      }
    }
  } catch {
    /* ignore */
  }
  return []
}

async function fetchYupooAlbumImages(
  albumUrl: string,
  albumId: string | null
): Promise<string[]> {
  const html = await fetchHtml(albumUrl)
  const album = parseAlbumPage(html, albumUrl, albumId ?? '')
  return cleanProductGalleryUrls(album.images)
}

async function main() {
  loadDotEnv()

  const dryRun = process.argv.includes('--dry-run')
  const fetchRemote = process.argv.includes('--fetch')
  const allBroken = process.argv.includes('--all-broken')
  const productIds = parseProductIds(process.argv)

  let products: ProductRow[]

  if (productIds.length > 0) {
    const placeholders = productIds.map(() => '?').join(', ')
    products = await queryDb<ProductRow[]>(
      `SELECT id, name, image_url, gallery_images, source_url, source_album_id
       FROM products WHERE id IN (${placeholders})`,
      productIds
    )
  } else if (allBroken) {
    products = await queryDb<ProductRow[]>(
      `SELECT id, name, image_url, gallery_images, source_url, source_album_id
       FROM products
       WHERE image_url IS NULL
          OR TRIM(image_url) = ''
          OR image_url = '/api/yupoo-image'
          OR image_url LIKE '%/api/yupoo-image'
          OR gallery_images LIKE '%/api/yupoo-image%'`
    )
    products = products.filter(productNeedsRestore)
  } else {
    console.error(
      'Usage: npm run db:restore-images -- --product-id=<uuid> | --all-broken [--dry-run] [--fetch]'
    )
    process.exit(1)
  }

  if (!products.length) {
    console.log('No matching products.')
    return
  }

  const jobItems = await queryDb<JobItemRow[]>(
    `SELECT product_id, album_url, album_id, raw_json
     FROM import_job_items
     WHERE product_id IS NOT NULL AND raw_json IS NOT NULL`
  )
  const jobByProductId = new Map<string, JobItemRow>()
  for (const item of jobItems) {
    if (item.product_id) jobByProductId.set(item.product_id, item)
  }

  let restored = 0
  let skipped = 0
  let failed = 0

  for (const row of products) {
    if (!productNeedsRestore(row)) {
      console.log(`SKIP (images OK): ${row.name} (${row.id})`)
      skipped++
      continue
    }

    console.log(`==> ${row.name} (${row.id})`)
    console.log(`    was: ${String(row.image_url ?? '').slice(0, 120)}`)

    const job = jobByProductId.get(row.id)
    let urls = imagesFromRawJson(job?.raw_json ?? null)

    if (!urls.length && fetchRemote) {
      const albumUrl = String(job?.album_url ?? row.source_url ?? '').trim()
      if (albumUrl && /yupoo\.com/i.test(albumUrl)) {
        try {
          console.log(`    fetching Yupoo album: ${albumUrl}`)
          urls = await fetchYupooAlbumImages(
            albumUrl,
            job?.album_id ?? row.source_album_id
          )
          await sleep(800)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error(`    FAIL fetch: ${message}`)
        }
      }
    }

    if (!urls.length) {
      console.warn('    SKIP: no images in import_job_items.raw_json (try --fetch on VPS)')
      skipped++
      continue
    }

    const gallery = normalizeProductImageList(urls)
    if (!gallery?.length) {
      console.warn('    SKIP: normalized gallery empty')
      skipped++
      continue
    }

    const main = gallery[0]!
    const galleryOut = gallery.length > 1 ? gallery.slice(1) : null

    if (dryRun) {
      console.log(`    would set main: ${main}`)
      console.log(`    gallery: ${galleryOut?.length ?? 0} image(s)`)
      restored++
      continue
    }

    try {
      await updateProduct(row.id, {
        image_url: main,
        gallery_images: galleryOut,
      })
      console.log(`    OK: ${main}`)
      restored++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`    FAIL update: ${message}`)
      failed++
    }
  }

  console.log(
    `Done. restored=${restored} skipped=${skipped} failed=${failed}${dryRun ? ' (dry-run)' : ''}`
  )
  if (failed > 0) process.exit(1)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => {
    void resetDbPool()
  })
