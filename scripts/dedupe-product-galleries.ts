#!/usr/bin/env npx tsx
/**
 * Clean product galleries in the database:
 * - Remove Yupoo platform icons (photo.yupoo.com/icons/logo@558.png, Weibo badge, etc.)
 * - Remove duplicate same-photo URLs (small/medium/thumb variants)
 *
 * Product photos are NOT removed. Only the 2 platform promo icons + duplicates.
 *
 *   npm run db:dedupe-galleries
 *   npm run db:dedupe-galleries -- --dry-run
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb } from '@/lib/db'
import {
  cleanProductGalleryUrls,
  dedupeProductImageUrls,
  isBrandingGalleryImageUrl,
  normalizeProductImageUrl,
  stripBrandingGalleryImageUrls,
  upgradeYupooImageUrl,
  isYupooImageUrl,
} from '@/lib/product-image-url'
import { parseProductJsonField } from '@/lib/product-serialize'

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

function normalizeStoredUrl(url: string): string {
  let u = normalizeProductImageUrl(url)
  if (isYupooImageUrl(u)) u = upgradeYupooImageUrl(u)
  return u
}

type Row = {
  id: string
  image_url: string | null
  gallery_images: unknown
}

function cleanStoredProductImages(
  mainRaw: string,
  galleryRaw: string[]
): { main: string; gallery: string[]; brandingRemoved: number; dupesRemoved: number } {
  const mainNorm = mainRaw ? normalizeStoredUrl(mainRaw) : ''
  const galleryNorm = galleryRaw.map((u) => normalizeStoredUrl(String(u))).filter(Boolean)

  const beforeAll = [mainNorm, ...galleryNorm].filter(Boolean)
  const afterBranding = stripBrandingGalleryImageUrls(beforeAll)
  const brandingRemoved = beforeAll.length - afterBranding.length

  let main = mainNorm
  let gallery = galleryNorm

  if (main && isBrandingGalleryImageUrl(main)) {
    const next = stripBrandingGalleryImageUrls(galleryNorm)
    main = next[0] || mainNorm
    gallery = next.slice(main === next[0] ? 1 : 0)
  } else {
    gallery = stripBrandingGalleryImageUrls(galleryNorm)
  }

  const combined = dedupeProductImageUrls([main, ...gallery].filter(Boolean))
  const dupesRemoved = afterBranding.length - combined.length

  main = combined[0] || mainNorm || mainRaw
  gallery = combined.slice(1)

  return { main, gallery, brandingRemoved, dupesRemoved }
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  const rows = await queryDb<Row[]>(
    `SELECT id, image_url, gallery_images FROM products`
  )

  let updated = 0
  let brandingStripped = 0
  let dupesStripped = 0

  for (const row of rows) {
    const mainRaw = String(row.image_url ?? '').trim()
    const galleryRaw = parseProductJsonField(row.gallery_images) ?? []

    if (!mainRaw && galleryRaw.length === 0) continue

    const { main, gallery, brandingRemoved, dupesRemoved } = cleanStoredProductImages(
      mainRaw,
      galleryRaw
    )

    if (brandingRemoved === 0 && dupesRemoved === 0) {
      const normalizedMain = mainRaw ? normalizeStoredUrl(mainRaw) : ''
      const sameMain = main === normalizedMain || main === mainRaw
      const sameGallery =
        gallery.length === galleryRaw.length &&
        gallery.every((u, i) => u === normalizeStoredUrl(String(galleryRaw[i])))
      if (sameMain && sameGallery) continue
    }

    if (!main) {
      console.warn(`Skipping ${row.id}: no image_url to store`)
      continue
    }

    updated++
    brandingStripped += brandingRemoved
    dupesStripped += dupesRemoved

    if (dryRun) {
      console.log(
        `[dry-run] ${row.id}: branding -${brandingRemoved}, dupes -${dupesRemoved} → main + ${gallery.length} gallery`
      )
      continue
    }

    await queryDb(
      `UPDATE products SET image_url = ?, gallery_images = ? WHERE id = ?`,
      [main, gallery.length ? JSON.stringify(gallery) : null, row.id]
    )
  }

  console.log(
    dryRun
      ? `Dry run: ${updated} products would be updated (${brandingStripped} icons, ${dupesStripped} duplicates).`
      : `Updated ${updated} products (${brandingStripped} icons, ${dupesStripped} duplicates removed).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
