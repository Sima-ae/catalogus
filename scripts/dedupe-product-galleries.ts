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
  normalizeProductImageUrl,
  normalizeStoredProductImages,
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

function countBrandingAndDupesRemoved(
  mainRaw: string,
  galleryRaw: string[]
): { brandingRemoved: number; dupesRemoved: number } {
  const beforeAll = [mainRaw, ...galleryRaw]
    .map((u) => String(u).trim())
    .filter(Boolean)
    .map((u) => normalizeStoredUrl(u))
    .filter(Boolean)

  const afterBranding = stripBrandingGalleryImageUrls(beforeAll)
  const brandingRemoved = beforeAll.length - afterBranding.length

  const afterDedupe = cleanProductGalleryUrls(afterBranding)
  const dupesRemoved = afterBranding.length - afterDedupe.length

  return { brandingRemoved, dupesRemoved }
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

    const cleaned = normalizeStoredProductImages(mainRaw, galleryRaw)
    const main = cleaned.image_url
    const gallery = cleaned.gallery_images ?? []

    const { brandingRemoved, dupesRemoved } = countBrandingAndDupesRemoved(
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
