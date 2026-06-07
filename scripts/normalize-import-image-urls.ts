#!/usr/bin/env npx tsx
/**
 * Fast path: normalize import product image URLs in MariaDB to absolute
 * https://superclones.cloud/images/… (no file checks, no re-download).
 *
 *   npm run db:normalize-import-image-urls
 *   npm run db:normalize-import-image-urls -- --dry-run
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb } from '@/lib/db'
import { parseProductJsonField } from '@/lib/product-serialize'
import {
  buildProductGallery,
  normalizeProductImageList,
  normalizeProductImageUrl,
} from '@/lib/product-image-url'
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

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  const rows = await queryDb<
    {
      id: string
      name: string
      image_url: string | null
      gallery_images: string | null
    }[]
  >(
    `SELECT id, name, image_url, gallery_images
     FROM products
     WHERE source_album_id LIKE 'fb-%'
        OR source_album_id LIKE 'wc-%'
        OR image_url LIKE '%/images/imports/%'
        OR gallery_images LIKE '%/images/imports/%'
     ORDER BY name ASC`
  )

  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const gallery = parseProductJsonField(row.gallery_images) ?? []
    const combined = buildProductGallery(row.image_url, gallery)
    if (!combined.length) {
      skipped++
      continue
    }

    const main = normalizeProductImageUrl(combined[0])
    const galleryOut = normalizeProductImageList(combined.slice(1))

    const storedMain = String(row.image_url ?? '').trim()
    const storedGalleryJson = JSON.stringify(normalizeProductImageList(gallery) ?? null)
    const nextGalleryJson = JSON.stringify(galleryOut)

    if (main === storedMain && storedGalleryJson === nextGalleryJson) {
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`${row.name}: ${storedMain || '(empty)'} → ${main}`)
      updated++
      continue
    }

    await updateProduct(row.id, {
      image_url: main,
      gallery_images: galleryOut,
    })
    updated++
  }

  console.log(`Done. updated=${updated} skipped=${skipped}${dryRun ? ' (dry-run)' : ''}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
