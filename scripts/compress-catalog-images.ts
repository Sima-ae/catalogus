#!/usr/bin/env npx tsx
/**
 * Compress existing catalog images on disk:
 * - public_html/images/imports + uploads (CATALOGUS_PUBLIC_HTML)
 * - app .cache/yupoo-images (Yupoo proxy cache under /var/www/…)
 *
 * Originals are overwritten in place (not kept).
 *
 *   cd /var/www/superclones.cloud
 *   export CATALOGUS_PUBLIC_HTML=/home/superclones.cloud/public_html
 *
 *   npm run db:compress-images -- --dry-run
 *   npm run db:compress-images -- --concurrency=2
 *   npm run db:compress-images -- --dir=imports
 *   npm run db:compress-images -- --yupoo-cache
 *   npm run db:compress-images -- --imports-only
 *   npm run db:compress-images -- --yupoo-cache-only
 */
import { existsSync, readFileSync } from 'fs'
import { open, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import path from 'path'
import { resolve } from 'path'
import {
  CATALOG_IMAGE_JPEG_QUALITY,
  CATALOG_IMAGE_MAX_EDGE,
  catalogImageExtFromMime,
  compressCatalogImageBuffer,
  mimeTypeForCatalogImageExt,
  replaceCatalogImageExtension,
} from '@/lib/catalog-image-compress'
import {
  describeCatalogImagesWriteTarget,
  getCatalogImagesWriteRoots,
} from '@/lib/catalog-images-root'
import { queryDb } from '@/lib/db'
import { runPool } from '@/lib/async-pool'

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

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

function argValue(name: string): string | null {
  const prefix = `${name}=`
  const hit = process.argv.find((a) => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length).trim() || null : null
}

function argInt(name: string, fallback: number): number {
  const raw = argValue(name)
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function resolveYupooCacheDir(): string {
  const override = argValue('--yupoo-cache-dir')
  if (override) return path.resolve(override)
  return path.join(process.cwd(), '.cache', 'yupoo-images')
}

async function walkImages(
  root: string,
  relativeDir: string,
  minBytes: number
): Promise<{ absPath: string; relative: string; size: number }[]> {
  const out: { absPath: string; relative: string; size: number }[] = []
  const start = path.join(root, relativeDir)

  async function walk(dir: string, rel: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name)
      const childRel = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        await walk(abs, childRel)
        continue
      }
      if (!entry.isFile()) continue
      const ext = path.extname(entry.name).toLowerCase()
      if (!IMAGE_EXT.has(ext)) continue
      try {
        const st = await stat(abs)
        if (st.size < minBytes) continue
        out.push({ absPath: abs, relative: childRel.replace(/\\/g, '/'), size: st.size })
      } catch {
        /* skip */
      }
    }
  }

  await walk(start, relativeDir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
  return out
}

async function walkYupooBinFiles(
  cacheDir: string,
  minBytes: number
): Promise<{ absPath: string; relative: string; size: number; metaPath: string }[]> {
  const out: { absPath: string; relative: string; size: number; metaPath: string }[] = []
  let entries
  try {
    entries = await readdir(cacheDir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.bin')) continue
    const absPath = path.join(cacheDir, entry.name)
    try {
      const st = await stat(absPath)
      if (st.size < minBytes) continue
      out.push({
        absPath,
        relative: entry.name,
        size: st.size,
        metaPath: path.join(cacheDir, entry.name.replace(/\.bin$/i, '.json')),
      })
    } catch {
      /* skip */
    }
  }
  return out
}

async function updateDbPathsIfExtensionChanged(
  oldPublicPath: string,
  newPublicPath: string
): Promise<number> {
  if (oldPublicPath === newPublicPath) return 0
  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE products
     SET image_url = CASE WHEN image_url = ? THEN ? ELSE image_url END,
         gallery_images = REPLACE(gallery_images, ?, ?)
     WHERE image_url = ?
        OR gallery_images LIKE ?`,
    [
      oldPublicPath,
      newPublicPath,
      oldPublicPath,
      newPublicPath,
      oldPublicPath,
      `%${oldPublicPath}%`,
    ]
  )
  return Number(result?.affectedRows ?? 0)
}

async function compressOneCatalogFile(opts: {
  absPath: string
  relative: string
  size: number
  dryRun: boolean
  maxEdge: number
  jpegQuality: number
}): Promise<{
  saved: number
  changedExt: boolean
  skipped: boolean
  error?: string
}> {
  const sourceExt = path.extname(opts.absPath).slice(1)
  let input: Buffer
  try {
    const handle = await open(opts.absPath, 'r')
    try {
      input = await handle.readFile()
    } finally {
      await handle.close()
    }
  } catch (err) {
    return {
      saved: 0,
      changedExt: false,
      skipped: true,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const result = await compressCatalogImageBuffer(input, {
    sourceExt,
    maxEdge: opts.maxEdge,
    jpegQuality: opts.jpegQuality,
  })

  if (!result.compressed || result.outputBytes >= result.originalBytes) {
    return { saved: 0, changedExt: false, skipped: true }
  }

  const nextRelative =
    result.ext && result.ext !== sourceExt.toLowerCase().replace(/^jpeg$/, 'jpg')
      ? replaceCatalogImageExtension(opts.relative, result.ext)
      : opts.relative
  const nextAbs = path.join(path.dirname(opts.absPath), path.basename(nextRelative))
  const changedExt = nextAbs !== opts.absPath

  if (opts.dryRun) {
    return {
      saved: result.originalBytes - result.outputBytes,
      changedExt,
      skipped: false,
    }
  }

  const tmpPath = `${nextAbs}.tmp-${process.pid}`
  try {
    await writeFile(tmpPath, result.buffer)
    await rename(tmpPath, nextAbs)
    if (changedExt) {
      await rm(opts.absPath, { force: true })
      const oldPublic = `/images/${opts.relative}`
      const newPublic = `/images/${nextRelative}`
      try {
        await updateDbPathsIfExtensionChanged(oldPublic, newPublic)
      } catch (err) {
        console.warn(
          `  warn: compressed ${opts.relative} → ${nextRelative} but DB path update failed:`,
          err instanceof Error ? err.message : err
        )
      }
    }
  } catch (err) {
    try {
      await rm(tmpPath, { force: true })
    } catch {
      /* ignore */
    }
    return {
      saved: 0,
      changedExt: false,
      skipped: true,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  return {
    saved: result.originalBytes - result.outputBytes,
    changedExt,
    skipped: false,
  }
}

async function compressOneYupooBin(opts: {
  absPath: string
  relative: string
  metaPath: string
  size: number
  dryRun: boolean
  maxEdge: number
  jpegQuality: number
}): Promise<{ saved: number; skipped: boolean; error?: string }> {
  let input: Buffer
  try {
    const handle = await open(opts.absPath, 'r')
    try {
      input = await handle.readFile()
    } finally {
      await handle.close()
    }
  } catch (err) {
    return {
      saved: 0,
      skipped: true,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  let contentType = 'image/jpeg'
  try {
    const metaRaw = await readFile(opts.metaPath, 'utf8')
    const meta = JSON.parse(metaRaw) as { contentType?: string; url?: string }
    if (meta.contentType) contentType = meta.contentType
  } catch {
    /* missing meta — still compress from bytes */
  }

  const result = await compressCatalogImageBuffer(input, {
    sourceExt: catalogImageExtFromMime(contentType),
    maxEdge: opts.maxEdge,
    jpegQuality: opts.jpegQuality,
  })

  if (!result.compressed || result.outputBytes >= result.originalBytes) {
    return { saved: 0, skipped: true }
  }

  const nextType = mimeTypeForCatalogImageExt(result.ext)

  if (opts.dryRun) {
    return { saved: result.originalBytes - result.outputBytes, skipped: false }
  }

  const tmpPath = `${opts.absPath}.tmp-${process.pid}`
  try {
    await writeFile(tmpPath, result.buffer)
    await rename(tmpPath, opts.absPath)
    try {
      let meta: Record<string, unknown> = {}
      try {
        meta = JSON.parse(await readFile(opts.metaPath, 'utf8')) as Record<string, unknown>
      } catch {
        meta = {}
      }
      meta.contentType = nextType
      meta.compressedAt = Date.now()
      await writeFile(opts.metaPath, JSON.stringify(meta))
    } catch {
      /* meta update best-effort */
    }
  } catch (err) {
    try {
      await rm(tmpPath, { force: true })
    } catch {
      /* ignore */
    }
    return {
      saved: 0,
      skipped: true,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  return { saved: result.originalBytes - result.outputBytes, skipped: false }
}

async function runCatalogPass(opts: {
  dryRun: boolean
  minBytes: number
  concurrency: number
  maxEdge: number
  jpegQuality: number
  limit: number
  dirArg: string | null
}): Promise<void> {
  const roots = getCatalogImagesWriteRoots()
  const root = roots[0]
  if (!root) {
    console.error('No catalog images write root configured (set CATALOGUS_PUBLIC_HTML)')
    return
  }

  const dirs = opts.dirArg
    ? [opts.dirArg.replace(/^\/+|\/+$/g, '')]
    : ['imports', 'uploads']

  console.log(`\n== Catalog images ==`)
  console.log(`Root: ${describeCatalogImagesWriteTarget()}`)
  console.log(`Dirs: ${dirs.join(', ')}`)

  const files: { absPath: string; relative: string; size: number }[] = []
  for (const dir of dirs) {
    const found = await walkImages(root, dir, opts.minBytes)
    files.push(...found)
  }
  files.sort((a, b) => b.size - a.size)
  const work = opts.limit > 0 ? files.slice(0, opts.limit) : files
  console.log(`Candidates: ${work.length.toLocaleString()} (of ${files.length.toLocaleString()})`)
  if (!work.length) return

  let processed = 0
  let compressed = 0
  let skipped = 0
  let errors = 0
  let bytesSaved = 0
  let extChanged = 0

  await runPool(work, opts.concurrency, async (file) => {
    const result = await compressOneCatalogFile({
      absPath: file.absPath,
      relative: file.relative,
      size: file.size,
      dryRun: opts.dryRun,
      maxEdge: opts.maxEdge,
      jpegQuality: opts.jpegQuality,
    })
    processed++
    if (result.error) {
      errors++
      console.warn(`  error ${file.relative}: ${result.error}`)
    } else if (result.skipped) {
      skipped++
    } else {
      compressed++
      bytesSaved += result.saved
      if (result.changedExt) extChanged++
      if (compressed <= 15 || compressed % 50 === 0) {
        console.log(
          `  ${opts.dryRun ? '[dry-run] ' : ''}saved ${formatBytes(result.saved)} — ${file.relative}`
        )
      }
    }
    if (processed % 200 === 0) {
      console.log(
        `… ${processed}/${work.length} catalog, compressed=${compressed}, saved=${formatBytes(bytesSaved)}`
      )
    }
  })

  console.log(
    `Catalog done. processed=${processed} compressed=${compressed} skipped=${skipped} errors=${errors} extChanged=${extChanged} saved≈${formatBytes(bytesSaved)}${opts.dryRun ? ' (dry-run)' : ''}`
  )
}

async function runYupooCachePass(opts: {
  dryRun: boolean
  minBytes: number
  concurrency: number
  maxEdge: number
  jpegQuality: number
  limit: number
}): Promise<void> {
  const cacheDir = resolveYupooCacheDir()
  console.log(`\n== Yupoo proxy cache ==`)
  console.log(`Dir: ${cacheDir}`)

  const files = await walkYupooBinFiles(cacheDir, opts.minBytes)
  files.sort((a, b) => b.size - a.size)
  const work = opts.limit > 0 ? files.slice(0, opts.limit) : files
  console.log(`Candidates: ${work.length.toLocaleString()} (of ${files.length.toLocaleString()})`)
  if (!work.length) return

  let processed = 0
  let compressed = 0
  let skipped = 0
  let errors = 0
  let bytesSaved = 0

  await runPool(work, opts.concurrency, async (file) => {
    const result = await compressOneYupooBin({
      absPath: file.absPath,
      relative: file.relative,
      metaPath: file.metaPath,
      size: file.size,
      dryRun: opts.dryRun,
      maxEdge: opts.maxEdge,
      jpegQuality: opts.jpegQuality,
    })
    processed++
    if (result.error) {
      errors++
      console.warn(`  error ${file.relative}: ${result.error}`)
    } else if (result.skipped) {
      skipped++
    } else {
      compressed++
      bytesSaved += result.saved
      if (compressed <= 15 || compressed % 50 === 0) {
        console.log(
          `  ${opts.dryRun ? '[dry-run] ' : ''}saved ${formatBytes(result.saved)} — ${file.relative}`
        )
      }
    }
    if (processed % 200 === 0) {
      console.log(
        `… ${processed}/${work.length} yupoo-cache, compressed=${compressed}, saved=${formatBytes(bytesSaved)}`
      )
    }
  })

  console.log(
    `Yupoo cache done. processed=${processed} compressed=${compressed} skipped=${skipped} errors=${errors} saved≈${formatBytes(bytesSaved)}${opts.dryRun ? ' (dry-run)' : ''}`
  )
}

async function main() {
  loadDotEnv()

  const dryRun = process.argv.includes('--dry-run')
  const yupooOnly = process.argv.includes('--yupoo-cache-only')
  const importsOnly = process.argv.includes('--imports-only')
  const dirArg = argValue('--dir')
  const runCatalog = !yupooOnly
  const runYupoo =
    yupooOnly ||
    process.argv.includes('--yupoo-cache') ||
    (!importsOnly && !dirArg)

  const minBytes = argInt('--min-bytes', 200_000)
  const concurrency = Math.max(1, Math.min(4, argInt('--concurrency', 2)))
  const maxEdge = argInt('--max-edge', CATALOG_IMAGE_MAX_EDGE)
  const jpegQuality = argInt('--jpeg-quality', CATALOG_IMAGE_JPEG_QUALITY)
  const limit = argInt('--limit', 0)

  console.log(
    `Options: minBytes=${formatBytes(minBytes)} maxEdge=${maxEdge} jpegQuality=${jpegQuality} concurrency=${concurrency}${dryRun ? ' DRY-RUN' : ''}`
  )
  console.log(`Pass: catalog=${runCatalog} yupooCache=${runYupoo}`)

  if (runCatalog) {
    await runCatalogPass({
      dryRun,
      minBytes,
      concurrency,
      maxEdge,
      jpegQuality,
      limit,
      dirArg,
    })
  }

  if (runYupoo) {
    await runYupooCachePass({
      dryRun,
      minBytes,
      concurrency,
      maxEdge,
      jpegQuality,
      limit,
    })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
