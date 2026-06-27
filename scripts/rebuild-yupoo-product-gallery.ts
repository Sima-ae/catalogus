#!/usr/bin/env npx tsx
/**
 * Re-fetch a single product's images from its Yupoo album (source_url).
 * Uses the same parse + dedupe pipeline as import (largest size, one URL per photo).
 *
 *   npm run db:rebuild-yupoo-gallery -- --product-id=<uuid>
 *   npm run db:rebuild-yupoo-gallery -- --product-id=<uuid> --dry-run
 *   npm run db:rebuild-yupoo-gallery -- --product-id=<uuid> --password=store-secret
 *
 * Password (password-protected stores): --password=, YUPOO_ACCESS_PASSWORD in .env,
 * or the import source's Yupoo access password when the product was imported.
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import { prepareImportProductImages } from '@/lib/product-image-url'
import { parseProductJsonField } from '@/lib/product-serialize'
import { updateProduct } from '@/lib/products-db'
import { fetchHtml } from '@/lib/yupoo/client'
import { parseAlbumPage } from '@/lib/yupoo/parse-album'
import {
  createYupooFetchContext,
  isYupooPasswordGateHtml,
  yupooOrigin,
  type YupooFetchContext,
} from '@/lib/yupoo/session'

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

function argValue(argv: string[], prefix: string): string | null {
  for (const arg of argv) {
    if (arg.startsWith(prefix)) {
      const value = arg.slice(prefix.length).trim()
      if (value) return value
    }
  }
  return null
}

function isYupooAlbumUrl(url: string): boolean {
  return /yupoo\.com/i.test(url) && /\/albums?\//i.test(url)
}

function albumIdFromUrl(url: string): string | null {
  const match = url.match(/\/albums\/(\d+)/i)
  return match?.[1] ?? null
}

type ProductRow = {
  id: string
  name: string
  image_url: string | null
  gallery_images: unknown
  source_url: string | null
  source_album_id: string | null
}

type ImportHintRow = {
  album_url: string | null
  album_id: string | null
  yupoo_access_password: string | null
}

async function loadImportHint(productId: string): Promise<ImportHintRow | null> {
  const rows = await queryDb<ImportHintRow[]>(
    `SELECT ji.album_url, ji.album_id, s.yupoo_access_password
     FROM import_job_items ji
     INNER JOIN import_jobs j ON j.id = ji.job_id
     INNER JOIN import_sources s ON s.id = j.source_id
     WHERE ji.product_id = ?
     ORDER BY ji.updated_at DESC, ji.created_at DESC
     LIMIT 1`,
    [productId]
  )
  return rows[0] ?? null
}

async function resolveYupooFetch(
  albumUrl: string,
  password?: string | null
): Promise<(url: string) => Promise<string>> {
  const trimmed = password?.trim()
  if (trimmed) {
    const ctx = await createYupooFetchContext(albumUrl, trimmed)
    return ctx.fetchHtml
  }

  const envPwd = process.env.YUPOO_ACCESS_PASSWORD?.trim()
  const envSeed = process.env.YUPOO_STORE_URL?.trim() || albumUrl
  if (envPwd) {
    try {
      const ctx = await createYupooFetchContext(envSeed, envPwd)
      if (yupooOrigin(ctx.origin) === yupooOrigin(albumUrl)) {
        return ctx.fetchHtml
      }
    } catch {
      /* fall through to unauthenticated fetch */
    }
  }

  return fetchHtml
}

async function fetchAlbumImages(
  albumUrl: string,
  albumId: string,
  fetchPage: (url: string) => Promise<string>
): Promise<{ image_url: string; gallery_images: string[] | null; count: number }> {
  const html = await fetchPage(albumUrl)
  if (isYupooPasswordGateHtml(html)) {
    throw new Error(
      'Yupoo store is password-protected. Pass --password=, set YUPOO_ACCESS_PASSWORD in .env, or use an import source with a stored password.'
    )
  }

  const album = parseAlbumPage(html, albumUrl, albumId)
  if (!album.images.length) {
    throw new Error('No images found on Yupoo album page (album may be removed or HTML changed).')
  }

  const prepared = prepareImportProductImages(album.images)
  if (!prepared.image_url) {
    throw new Error('Parsed album but no usable main image after deduplication.')
  }

  const total = 1 + (prepared.gallery_images?.length ?? 0)
  return {
    image_url: prepared.image_url,
    gallery_images: prepared.gallery_images,
    count: total,
  }
}

function formatGalleryPreview(gallery: string[] | null, limit = 3): string {
  const rows = gallery ?? []
  if (!rows.length) return '(none)'
  const head = rows.slice(0, limit).map((u) => `  - ${u}`)
  const more = rows.length > limit ? [`  … +${rows.length - limit} more`] : []
  return head.concat(more).join('\n')
}

async function main() {
  loadDotEnv()

  const dryRun = process.argv.includes('--dry-run')
  const productId = argValue(process.argv, '--product-id=')
  const cliPassword = argValue(process.argv, '--password=')

  if (!productId) {
    console.error(
      'Usage: npm run db:rebuild-yupoo-gallery -- --product-id=<uuid> [--dry-run] [--password=secret]'
    )
    process.exit(1)
  }

  const rows = await queryDb<ProductRow[]>(
    `SELECT id, name, image_url, gallery_images, source_url, source_album_id
     FROM products WHERE id = ? LIMIT 1`,
    [productId]
  )
  const product = rows[0]
  if (!product) {
    console.error(`Product not found: ${productId}`)
    process.exit(1)
  }

  const hint = await loadImportHint(product.id)
  const albumUrl = String(hint?.album_url ?? product.source_url ?? '').trim()
  if (!albumUrl || !isYupooAlbumUrl(albumUrl)) {
    console.error(
      `Product ${product.id} has no Yupoo album URL (source_url or import_job_items.album_url).`
    )
    process.exit(1)
  }

  const albumId =
    String(hint?.album_id ?? product.source_album_id ?? albumIdFromUrl(albumUrl) ?? '').trim() ||
    product.id

  const password = cliPassword ?? hint?.yupoo_access_password ?? null
  const fetchPage = await resolveYupooFetch(albumUrl, password)

  const beforeGallery = parseProductJsonField(product.gallery_images) ?? []
  const beforeCount = (product.image_url ? 1 : 0) + beforeGallery.length

  console.log(`Product: ${product.name} (${product.id})`)
  console.log(`Album:   ${albumUrl}`)
  console.log(`Before:  main + ${beforeGallery.length} gallery (${beforeCount} total)`)

  const rebuilt = await fetchAlbumImages(albumUrl, albumId, fetchPage)

  console.log(`After:   main + ${rebuilt.gallery_images?.length ?? 0} gallery (${rebuilt.count} total)`)
  console.log(`Main:    ${rebuilt.image_url}`)
  console.log(`Gallery:\n${formatGalleryPreview(rebuilt.gallery_images)}`)

  if (dryRun) {
    console.log('\nDry run — no database changes.')
    await resetDbPool()
    return
  }

  await updateProduct(product.id, {
    image_url: rebuilt.image_url,
    gallery_images: rebuilt.gallery_images,
    source_url: albumUrl,
    source_album_id: albumId,
  })

  console.log('\nUpdated product images in database.')
  await resetDbPool()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
