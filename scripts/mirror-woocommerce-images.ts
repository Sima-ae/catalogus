#!/usr/bin/env npx tsx
/**
 * Copy remote WooCommerce (stuntxl.com) product images to local VPS storage.
 * Use for products imported before image mirroring was enabled.
 *
 *   npm run db:mirror-woocommerce-images
 *   npm run db:mirror-woocommerce-images -- --dry-run
 *   npm run db:mirror-woocommerce-images -- --product-id=<uuid>
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb } from '@/lib/db'
import { buildProductGallery } from '@/lib/product-image-url'
import { parseProductJsonField } from '@/lib/product-serialize'
import {
  isWooImportMirrorPath,
  mirrorWooCommerceImageList,
} from '@/lib/woocommerce/mirror-images'
import { updateProduct } from '@/lib/products-db'

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

function hasRemoteStuntxlUrl(urls: string[]): boolean {
  return urls.some((url) => /stuntxl\.com/i.test(url) && !isWooImportMirrorPath(url))
}

function mirrorFolderKey(sourceAlbumId: string | null, productId: string): string {
  const fromSource = String(sourceAlbumId ?? '').trim()
  if (fromSource.startsWith('wc-')) return fromSource
  return `wc-product-${productId}`
}

async function main() {
  loadDotEnv()

  const dryRun = process.argv.includes('--dry-run')
  const productIdArg = process.argv.find((a) => a.startsWith('--product-id='))
  const productIdFilter = productIdArg?.split('=')[1]?.trim() || null

  const rows = await queryDb<
    {
      id: string
      name: string
      image_url: string | null
      gallery_images: string | null
      source_album_id: string | null
    }[]
  >(
    productIdFilter
      ? `SELECT id, name, image_url, gallery_images, source_album_id
         FROM products WHERE id = ? LIMIT 1`
      : `SELECT id, name, image_url, gallery_images, source_album_id
         FROM products
         WHERE source_album_id LIKE 'wc-%'
            OR image_url LIKE '%stuntxl.com%'
            OR gallery_images LIKE '%stuntxl.com%'
         ORDER BY name ASC`,
    productIdFilter ? [productIdFilter] : []
  )

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    const gallery = parseProductJsonField(row.gallery_images) ?? []
    const combined = buildProductGallery(row.image_url, gallery)

    if (!combined.length) {
      console.log(`SKIP (no images): ${row.name} (${row.id})`)
      skipped++
      continue
    }

    if (!hasRemoteStuntxlUrl(combined)) {
      console.log(`SKIP (already local): ${row.name} (${row.id})`)
      skipped++
      continue
    }

    const folderKey = mirrorFolderKey(row.source_album_id, row.id)
    console.log(`==> ${row.name} (${row.id}) → ${folderKey} (${combined.length} images)`)

    if (dryRun) {
      updated++
      continue
    }

    try {
      const mirrored = await mirrorWooCommerceImageList(folderKey, combined)
      if (!mirrored.length) {
        throw new Error('No images mirrored')
      }

      await updateProduct(row.id, {
        image_url: mirrored[0],
        gallery_images: mirrored.length > 1 ? mirrored.slice(1) : null,
      })
      console.log(`OK: ${mirrored[0]}`)
      updated++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`FAIL: ${row.name} — ${message}`)
      failed++
    }
  }

  console.log(
    `Done. updated=${updated} skipped=${skipped} failed=${failed}${dryRun ? ' (dry-run)' : ''}`
  )
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
