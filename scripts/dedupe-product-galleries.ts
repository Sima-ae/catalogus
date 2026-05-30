#!/usr/bin/env npx tsx
/**
 * Remove duplicate gallery images stored on products (Yupoo small/medium duplicates, etc.).
 *
 *   npm run db:dedupe-galleries
 *   npm run db:dedupe-galleries -- --dry-run
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb } from '@/lib/db'
import {
  dedupeProductImageUrls,
  normalizeProductImageUrl,
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

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  const rows = await queryDb<Row[]>(
    `SELECT id, image_url, gallery_images FROM products`
  )

  let updated = 0

  for (const row of rows) {
    const mainRaw = String(row.image_url ?? '').trim()
    const galleryRaw = parseProductJsonField(row.gallery_images) ?? []
    const ordered = [
      ...(mainRaw ? [normalizeStoredUrl(mainRaw)] : []),
      ...galleryRaw.map((u) => normalizeStoredUrl(String(u))),
    ].filter(Boolean)

    const unique = dedupeProductImageUrls(ordered)
    const newMain = unique[0] || ''
    const newGallery = unique.slice(1)

    const beforeCount = (mainRaw ? 1 : 0) + galleryRaw.length
    const afterCount = unique.length

    if (beforeCount === afterCount && newMain === mainRaw) {
      const sameGallery =
        newGallery.length === galleryRaw.length &&
        newGallery.every((u, i) => u === normalizeStoredUrl(String(galleryRaw[i])))
      if (sameGallery) continue
    }

    updated++
    if (dryRun) {
      console.log(
        `[dry-run] ${row.id}: ${beforeCount} → ${afterCount} images (${beforeCount - afterCount} duplicates removed)`
      )
      continue
    }

    await queryDb(
      `UPDATE products SET image_url = ?, gallery_images = ? WHERE id = ?`,
      [
        newMain || null,
        newGallery.length ? JSON.stringify(newGallery) : null,
        row.id,
      ]
    )
  }

  console.log(
    dryRun
      ? `Dry run: ${updated} products would be updated.`
      : `Updated ${updated} products.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
