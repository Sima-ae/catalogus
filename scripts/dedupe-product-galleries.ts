#!/usr/bin/env npx tsx
/**
 * Clean product galleries in the database:
 * - Remove Yupoo platform icons (photo.yupoo.com/icons/logo@558.png, Weibo badge, etc.)
 * - Remove duplicate same-photo URLs (small/medium/big/hash variants in one folder)
 *
 * Product photos are NOT removed. Only platform promo icons + duplicates.
 *
 *   npm run db:dedupe-galleries
 *   npm run db:dedupe-galleries -- --dry-run
 *   npm run db:dedupe-galleries -- --product-id=<uuid>
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

function parseArg(prefix: string): string | null {
  for (const arg of process.argv) {
    if (arg.startsWith(`${prefix}=`)) return arg.slice(prefix.length + 1).trim() || null
  }
  return null
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

type PendingUpdate = {
  id: string
  main: string
  gallery: string[]
  brandingRemoved: number
  dupesRemoved: number
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

async function applyBatchUpdates(updates: PendingUpdate[]) {
  const BATCH = 100
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH)
    const ids = chunk.map((u) => u.id)
    const mainCases = chunk.map((u) => `WHEN ? THEN ?`).join(' ')
    const galleryCases = chunk.map((u) => `WHEN ? THEN ?`).join(' ')
    const params: unknown[] = []
    for (const row of chunk) {
      params.push(row.id, row.main)
    }
    for (const row of chunk) {
      params.push(row.id, row.gallery.length ? JSON.stringify(row.gallery) : null)
    }
    params.push(...ids)

    await queryDb(
      `UPDATE products SET
         image_url = CASE id ${mainCases} ELSE image_url END,
         gallery_images = CASE id ${galleryCases} ELSE gallery_images END
       WHERE id IN (${ids.map(() => '?').join(', ')})`,
      params
    )

    if (updates.length > BATCH) {
      process.stdout.write(`\r  wrote ${Math.min(i + BATCH, updates.length)}/${updates.length}`)
    }
  }
  if (updates.length > BATCH) process.stdout.write('\n')
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')
  const productId = parseArg('--product-id')

  const rows = await queryDb<Row[]>(
    productId
      ? `SELECT id, image_url, gallery_images FROM products WHERE id = ?`
      : `SELECT id, image_url, gallery_images FROM products`,
    productId ? [productId] : []
  )

  const pending: PendingUpdate[] = []
  let dryRunCount = 0
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

    brandingStripped += brandingRemoved
    dupesStripped += dupesRemoved

    if (dryRun) {
      dryRunCount++
      console.log(
        `[dry-run] ${row.id}: branding -${brandingRemoved}, dupes -${dupesRemoved} → main + ${gallery.length} gallery`
      )
      continue
    }

    pending.push({ id: row.id, main, gallery, brandingRemoved, dupesRemoved })
  }

  if (!dryRun && pending.length > 0) {
    console.log(`Applying ${pending.length} updates…`)
    await applyBatchUpdates(pending)
  }

  const updated = dryRun ? dryRunCount : pending.length
  console.log(
    dryRun
      ? `Dry run: ${updated} of ${rows.length} products would be updated (${brandingStripped} icons, ${dupesStripped} duplicates).`
      : `Updated ${updated} products (${brandingStripped} icons, ${dupesStripped} duplicates removed).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
