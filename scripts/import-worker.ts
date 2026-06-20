#!/usr/bin/env npx tsx
/**
 * Process import jobs (Yupoo + WooCommerce + Facebook + Lkxox + WeCatalog) on the VPS (or locally with db:tunnel).
 *
 *   npm run import:worker
 *   npm run import:worker -- --job=<uuid>
 *   npm run import:worker -- --job=<uuid> --password=<yupoo-store-access-code>
 *   npm run import:worker -- --job=<uuid> --refresh
 *   npm run import:worker -- --job=<uuid> --refresh --retry-all
 *
 * --refresh  re-fetch source data and update existing products (status unchanged).
 * --retry-all  re-queue imported/skipped job items (finished jobs only).
 * --password  overrides Yupoo access password for this run.
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { fetchHtml, sleep as yupooSleep } from '@/lib/yupoo/client'
import { parseCategoryAlbums } from '@/lib/yupoo/parse-category'
import { parseAlbumPage } from '@/lib/yupoo/parse-album'
import {
  createYupooFetchContext,
  isYupooPasswordGateHtml,
  YUPOO_PASSWORD_REQUIRED_MSG,
  type YupooFetchContext,
} from '@/lib/yupoo/session'
import { translateProductText } from '@/lib/translate'
import {
  describeCatalogImagesWriteTarget,
  isCatalogImagesVpsWrite,
} from '@/lib/catalog-images-root'
import type { ImportJobItemRow, ImportSourceRow } from '@/lib/import-db'
import { mergeRefreshProductPricing } from '@/lib/import-refresh-pricing'
import { getProductById } from '@/lib/products-db'
import {
  appendJobErrorLog,
  buildProductInputFromImport,
  buildProductInputFromWooStoreProduct,
  buildProductInputFromFacebookJobItem,
  buildProductInputFromLkxoxProduct,
  buildProductInputFromWecatalogProduct,
  createImportJobItems,
  createImportJobItemsFromWooProducts,
  createImportJobItemsFromLkxoxProducts,
  createImportJobItemsFromWecatalogProducts,
  discoverWooCommerceJobItems,
  discoverLkxoxJobItems,
  discoverWecatalogJobItems,
  getImportJob,
  getImportSource,
  getProductBySourceAlbumId,
  getQueuedImportJob,
  isFacebookImportSource,
  isLkxoxImportSource,
  isWecatalogImportSource,
  isWooCommerceImportSource,
  listPendingJobItems,
  resetCompletedJobItems,
  resetSkippedJobItems,
  resolveLkxoxListUrl,
  resolveWecatalogListUrl,
  resolveWooStoreUrl,
  touchImportSourceSynced,
  updateImportJob,
  updateJobItem,
} from '@/lib/import-db'
import { fetchFacebookPost } from '@/lib/facebook/parse-post'
import { sleep as wooSleep, fetchWooStoreProductForJobItem } from '@/lib/woocommerce/client'
import { wooExternalId } from '@/lib/woocommerce/types'
import { fetchLkxoxHtml, sleep as lkxoxSleep } from '@/lib/lkxox/client'
import { parseLkxoxProductPage } from '@/lib/lkxox/parse-product'
import { createWecatalogSession, sleep as wecatalogSleep } from '@/lib/wecatalog/client'
import { fetchWecatalogProduct } from '@/lib/wecatalog/fetch-product'
import { parseWecatalogExternalId } from '@/lib/wecatalog/types'
import { getAllBrandNames } from '@/lib/brand-sku-prefixes'
import {
  findProductByAlbumSku,
  findProductBySku,
  insertProduct,
  updateProduct,
  type ProductInput,
} from '@/lib/products-db'
import { ensureEnvLoaded } from '@/lib/ensure-env'

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
    if (!process.env[key]) process.env[key] = val
  }
}

function workerFlags() {
  return {
    refresh: process.argv.includes('--refresh'),
    retryAll: process.argv.includes('--retry-all'),
    retrySkipped: process.argv.includes('--retry-skipped'),
  }
}

function resolveCliPassword(): string | null {
  const arg = process.argv.find((a) => a.startsWith('--password='))
  if (!arg) return null
  const value = arg.split('=').slice(1).join('=')
  const trimmed = value.trim()
  return trimmed || null
}

function resolveYupooPassword(
  source: ImportSourceRow,
  cliPassword: string | null
): string | null {
  if (cliPassword) return cliPassword
  const stored = String(source.yupoo_access_password ?? '').trim()
  return stored || null
}

async function resolveJobId(): Promise<string | null> {
  const arg = process.argv.find((a) => a.startsWith('--job='))
  if (arg) return arg.split('=')[1] || null
  const queued = await getQueuedImportJob()
  return queued?.id ?? null
}

function assertNotPasswordGated(html: string, hasPassword: boolean) {
  if (hasPassword) return
  if (isYupooPasswordGateHtml(html)) {
    throw new Error(YUPOO_PASSWORD_REQUIRED_MSG)
  }
}

function inputForRefresh(input: ProductInput): Partial<ProductInput> {
  const { status: _status, featured: _featured, ...rest } = input
  return rest
}

async function buildYupooImportInput(
  item: ImportJobItemRow,
  source: ImportSourceRow,
  fetchPage: (url: string) => Promise<string>,
  hasPassword: boolean
) {
  const html = await fetchPage(item.album_url)
  assertNotPasswordGated(html, hasPassword)

  const album = parseAlbumPage(html, item.album_url, item.album_id)

  if (!album.images.length) {
    throw new Error('No images found on album page')
  }

  const translated = await translateProductText(album.title, album.description, 500)

  const input = await buildProductInputFromImport(
    album,
    translated,
    source.category_name!,
    source.brand_name ?? null,
    item.album_title ?? album.title,
    source.catalog_category_id
  )

  if (!input.image_url) {
    throw new Error('No images found on album page')
  }

  return { input, album, translated }
}

async function importExistingOrSkip(
  item: ImportJobItemRow,
  input: ProductInput,
  flags: ReturnType<typeof workerFlags>,
  counters: { processed: number; imported: number; skipped: number; failed: number; refreshed: number }
) {
  let existing = await findProductByAlbumSku(item.album_id)

  if (!existing && item.album_id.startsWith('wc-')) {
    existing = await getProductBySourceAlbumId(item.album_id)
  }

  if (!existing && item.album_id.startsWith('lkxox-')) {
    existing = await getProductBySourceAlbumId(item.album_id)
  }

  if (!existing && item.album_id.startsWith('wecatalog-')) {
    existing = await getProductBySourceAlbumId(item.album_id)
  }

  if (existing && !flags.refresh) {
    console.log(`==> ${item.album_id} (skip — product with same external id already exists)`)
    await updateJobItem(item.id, {
      status: 'skipped',
      product_id: existing.id,
      error_message: null,
    })
    counters.skipped++
    counters.processed++
    return { done: true as const }
  }

  if (!existing && input.sku) {
    existing = await findProductBySku(input.sku)
  }

  if (existing && !flags.refresh) {
    console.log(`==> ${item.album_id} (skip — SKU ${input.sku} already exists)`)
    await updateJobItem(item.id, {
      status: 'skipped',
      product_id: existing.id,
      error_message: null,
    })
    counters.skipped++
    counters.processed++
    return { done: true as const }
  }

  return { done: false as const, existing }
}

async function saveImportedProduct(
  item: ImportJobItemRow,
  jobId: string,
  input: ProductInput,
  existing: { id: string } | null | undefined,
  flags: ReturnType<typeof workerFlags>,
  rawJson: unknown,
  counters: { processed: number; imported: number; skipped: number; failed: number; refreshed: number },
  translationFailed?: boolean
) {
  if (existing && flags.refresh) {
    const current = await getProductById(existing.id, { includePurchasePrice: true })
    const refreshInput = current
      ? { ...input, ...mergeRefreshProductPricing(current, input) }
      : input
    await updateProduct(existing.id, inputForRefresh(refreshInput))
    await updateJobItem(item.id, {
      status: 'imported',
      product_id: existing.id,
      raw_json: JSON.stringify(rawJson),
      error_message: translationFailed ? 'Translation failed — kept raw text' : null,
    })
    counters.refreshed++
    counters.processed++
  } else {
    const product = await insertProduct(input)
    const productId = product ? String((product as { id?: string }).id || '') : ''
    await updateJobItem(item.id, {
      status: 'imported',
      product_id: productId || null,
      raw_json: JSON.stringify(rawJson),
      error_message: translationFailed ? 'Translation failed — kept raw text' : null,
    })
    counters.imported++
    counters.processed++
  }

  await updateImportJob(jobId, {
    processed: counters.processed,
    imported: counters.imported,
    skipped: counters.skipped,
    failed: counters.failed,
  })
}

async function processYupooJob(
  jobId: string,
  job: NonNullable<Awaited<ReturnType<typeof getImportJob>>>,
  source: ImportSourceRow,
  flags: ReturnType<typeof workerFlags>
) {
  const cliPassword = resolveCliPassword()
  const yupooPassword = resolveYupooPassword(source, cliPassword)
  let yupooCtx: YupooFetchContext | null = null
  if (yupooPassword) {
    console.log('==> Yupoo access password: using authenticated fetch')
    yupooCtx = await createYupooFetchContext(String(source.yupoo_category_url), yupooPassword)
  }
  const fetchPage = yupooCtx ? yupooCtx.fetchHtml.bind(yupooCtx) : fetchHtml
  const hasPassword = Boolean(yupooPassword)

  let items = await listPendingJobItems(jobId)

  if (!items.length && job.total_albums === 0) {
    console.log('==> Fetch category:', source.yupoo_category_url)
    const html = await fetchPage(String(source.yupoo_category_url))
    assertNotPasswordGated(html, hasPassword)
    const albums = parseCategoryAlbums(html, String(source.yupoo_category_url))
    if (!albums.length && isYupooPasswordGateHtml(html)) {
      throw new Error(YUPOO_PASSWORD_REQUIRED_MSG)
    }
    console.log(`==> Found ${albums.length} albums`)
    await createImportJobItems(jobId, albums)
    await updateImportJob(jobId, { total_albums: albums.length })
    items = await listPendingJobItems(jobId)
  }

  if (flags.refresh) {
    console.log('==> Refresh mode: existing albums will be updated from Yupoo (status unchanged)')
  }

  let processed = flags.retryAll || flags.retrySkipped ? 0 : job.processed
  let imported = flags.retryAll || flags.retrySkipped ? 0 : job.imported
  let skipped = flags.retryAll || flags.retrySkipped ? 0 : job.skipped
  let failed = flags.retryAll || flags.retrySkipped ? 0 : job.failed
  let refreshed = 0
  const counters = { processed, imported, skipped, failed, refreshed }

  for (const item of items) {
    try {
      const skipCheck = await importExistingOrSkip(item, { sku: item.album_id } as ProductInput, flags, counters)
      if (skipCheck.done) {
        await updateImportJob(jobId, counters)
        continue
      }

      console.log(`==> Album ${item.album_id}${skipCheck.existing && flags.refresh ? ' (refresh)' : ''}`)
      await yupooSleep(1200)

      const { input, album, translated } = await buildYupooImportInput(
        item,
        source,
        fetchPage,
        hasPassword
      )

      const secondCheck = await importExistingOrSkip(item, input, flags, counters)
      if (secondCheck.done) {
        await updateImportJob(jobId, counters)
        continue
      }

      await saveImportedProduct(
        item,
        jobId,
        input,
        secondCheck.existing,
        flags,
        { album, translated, refreshed: Boolean(secondCheck.existing && flags.refresh) },
        counters,
        translated.translationFailed
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('FAIL:', item.album_id, message)
      await updateJobItem(item.id, { status: 'failed', error_message: message })
      await appendJobErrorLog(jobId, `${item.album_id}: ${message}`)
      counters.failed++
      counters.processed++
      await updateImportJob(jobId, counters)
    }
  }

  return counters
}

async function processWooCommerceJob(
  jobId: string,
  job: NonNullable<Awaited<ReturnType<typeof getImportJob>>>,
  source: ImportSourceRow,
  flags: ReturnType<typeof workerFlags>
) {
  const storeUrl = resolveWooStoreUrl(source)
  let items = await listPendingJobItems(jobId)

  if (!items.length && job.total_albums === 0) {
    console.log('==> Fetch WooCommerce products:', storeUrl)
    const products = await discoverWooCommerceJobItems(source)
    console.log(`==> Found ${products.length} products`)
    await createImportJobItemsFromWooProducts(jobId, products)
    await updateImportJob(jobId, { total_albums: products.length })
    items = await listPendingJobItems(jobId)
  } else if (!items.length && job.total_albums > 0) {
    console.log(
      'No pending items for this job — it may already be finished. Use --refresh --retry-all to re-run.'
    )
  }

  if (flags.refresh) {
    console.log('==> Refresh mode: existing products will be updated from WooCommerce (status unchanged)')
  }

  let processed = flags.retryAll || flags.retrySkipped ? 0 : job.processed
  let imported = flags.retryAll || flags.retrySkipped ? 0 : job.imported
  let skipped = flags.retryAll || flags.retrySkipped ? 0 : job.skipped
  let failed = flags.retryAll || flags.retrySkipped ? 0 : job.failed
  let refreshed = 0
  const counters = { processed, imported, skipped, failed, refreshed }

  for (const item of items) {
    try {
      console.log(`==> ${item.album_id}`)
      await wooSleep(300)

      const product = await fetchWooStoreProductForJobItem(storeUrl, item)
      const externalId = wooExternalId(product.id)
      const itemForDedup = { ...item, album_id: externalId }

      const skipCheck = await importExistingOrSkip(
        itemForDedup,
        { sku: externalId } as ProductInput,
        flags,
        counters
      )
      if (skipCheck.done) {
        await updateImportJob(jobId, counters)
        continue
      }

      console.log(
        `==> Product ${externalId}${skipCheck.existing && flags.refresh ? ' (refresh)' : ''}`
      )

      const input = await buildProductInputFromWooStoreProduct(product, source)

      if (!input.image_url) {
        throw new Error('No images found on WooCommerce product')
      }

      const secondCheck = await importExistingOrSkip(itemForDedup, input, flags, counters)
      if (secondCheck.done) {
        await updateImportJob(jobId, counters)
        continue
      }

      await saveImportedProduct(
        itemForDedup,
        jobId,
        input,
        secondCheck.existing,
        flags,
        { product, refreshed: Boolean(secondCheck.existing && flags.refresh) },
        counters
      )

      if (item.album_id !== externalId) {
        await updateJobItem(item.id, { album_id: externalId })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('FAIL:', item.album_id, message)
      await updateJobItem(item.id, { status: 'failed', error_message: message })
      await appendJobErrorLog(jobId, `${item.album_id}: ${message}`)
      counters.failed++
      counters.processed++
      await updateImportJob(jobId, counters)
    }
  }

  return counters
}

async function processLkxoxJob(
  jobId: string,
  job: NonNullable<Awaited<ReturnType<typeof getImportJob>>>,
  source: ImportSourceRow,
  flags: ReturnType<typeof workerFlags>
) {
  const listUrl = resolveLkxoxListUrl(source)
  let items = await listPendingJobItems(jobId)

  if (!items.length && job.total_albums === 0) {
    console.log('==> Discover lkxox products:', listUrl)
    const products = await discoverLkxoxJobItems(source)
    console.log(`==> Found ${products.length} products`)
    await createImportJobItemsFromLkxoxProducts(jobId, products)
    await updateImportJob(jobId, { total_albums: products.length })
    items = await listPendingJobItems(jobId)
  } else if (!items.length && job.total_albums > 0) {
    console.log(
      'No pending items for this job — it may already be finished. Use --refresh --retry-all to re-run.'
    )
  }

  if (flags.refresh) {
    console.log('==> Refresh mode: existing products will be updated from lkxox (status unchanged)')
  }

  let processed = flags.retryAll || flags.retrySkipped ? 0 : job.processed
  let imported = flags.retryAll || flags.retrySkipped ? 0 : job.imported
  let skipped = flags.retryAll || flags.retrySkipped ? 0 : job.skipped
  let failed = flags.retryAll || flags.retrySkipped ? 0 : job.failed
  let refreshed = 0
  const counters = { processed, imported, skipped, failed, refreshed }

  for (const item of items) {
    try {
      console.log(`==> ${item.album_id}`)
      await lkxoxSleep(400)

      const html = await fetchLkxoxHtml(item.album_url)
      const lkxox = parseLkxoxProductPage(html, item.album_url)
      const externalId = lkxox.externalId
      const itemForDedup = { ...item, album_id: externalId }

      const skipCheck = await importExistingOrSkip(
        itemForDedup,
        { sku: lkxox.sku } as ProductInput,
        flags,
        counters
      )
      if (skipCheck.done) {
        await updateImportJob(jobId, counters)
        continue
      }

      console.log(
        `==> Product ${externalId}${skipCheck.existing && flags.refresh ? ' (refresh)' : ''}`
      )

      const input = await buildProductInputFromLkxoxProduct(lkxox, source)

      if (!input.image_url) {
        throw new Error('No images found on lkxox product')
      }

      const secondCheck = await importExistingOrSkip(itemForDedup, input, flags, counters)
      if (secondCheck.done) {
        await updateImportJob(jobId, counters)
        continue
      }

      await saveImportedProduct(
        itemForDedup,
        jobId,
        input,
        secondCheck.existing,
        flags,
        { lkxox, refreshed: Boolean(secondCheck.existing && flags.refresh) },
        counters
      )

      if (item.album_id !== externalId) {
        await updateJobItem(item.id, { album_id: externalId })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('FAIL:', item.album_id, message)
      await updateJobItem(item.id, { status: 'failed', error_message: message })
      await appendJobErrorLog(jobId, `${item.album_id}: ${message}`)
      counters.failed++
      counters.processed++
      await updateImportJob(jobId, counters)
    }
  }

  return counters
}

async function processWecatalogJob(
  jobId: string,
  job: NonNullable<Awaited<ReturnType<typeof getImportJob>>>,
  source: ImportSourceRow,
  flags: ReturnType<typeof workerFlags>
) {
  const listUrl = resolveWecatalogListUrl(source)
  let items = await listPendingJobItems(jobId)

  if (!items.length && job.total_albums === 0) {
    console.log('==> Discover WeCatalog products:', listUrl)
    const products = await discoverWecatalogJobItems(source)
    console.log(`==> Found ${products.length} products`)
    await createImportJobItemsFromWecatalogProducts(jobId, products)
    await updateImportJob(jobId, { total_albums: products.length })
    items = await listPendingJobItems(jobId)
  } else if (!items.length && job.total_albums > 0) {
    console.log(
      'No pending items for this job — it may already be finished. Use --refresh --retry-all to re-run.'
    )
  }

  if (flags.refresh) {
    console.log('==> Refresh mode: existing products will be updated from WeCatalog (status unchanged)')
  }

  let processed = flags.retryAll || flags.retrySkipped ? 0 : job.processed
  let imported = flags.retryAll || flags.retrySkipped ? 0 : job.imported
  let skipped = flags.retryAll || flags.retrySkipped ? 0 : job.skipped
  let failed = flags.retryAll || flags.retrySkipped ? 0 : job.failed
  let refreshed = 0
  const counters = { processed, imported, skipped, failed, refreshed }

  const session = createWecatalogSession(listUrl)
  const brandNames = await getAllBrandNames()

  for (const item of items) {
    try {
      console.log(`==> ${item.album_id}`)
      await wecatalogSleep(400)

      const goodsId = parseWecatalogExternalId(item.album_id)
      if (!goodsId) {
        throw new Error(`Invalid WeCatalog external id: ${item.album_id}`)
      }

      const context = session.getContext()
      const wecatalog = await fetchWecatalogProduct(session, context.shopId, goodsId, brandNames)
      const externalId = wecatalog.externalId
      const itemForDedup = { ...item, album_id: externalId }

      const skipCheck = await importExistingOrSkip(
        itemForDedup,
        { sku: wecatalog.sku } as ProductInput,
        flags,
        counters
      )
      if (skipCheck.done) {
        await updateImportJob(jobId, counters)
        continue
      }

      console.log(
        `==> Product ${externalId}${skipCheck.existing && flags.refresh ? ' (refresh)' : ''}`
      )

      const input = await buildProductInputFromWecatalogProduct(wecatalog, source)

      if (!input.image_url) {
        throw new Error('No images found on WeCatalog product')
      }

      const secondCheck = await importExistingOrSkip(itemForDedup, input, flags, counters)
      if (secondCheck.done) {
        await updateImportJob(jobId, counters)
        continue
      }

      await saveImportedProduct(
        itemForDedup,
        jobId,
        input,
        secondCheck.existing,
        flags,
        { wecatalog, refreshed: Boolean(secondCheck.existing && flags.refresh) },
        counters
      )

      if (item.album_id !== externalId) {
        await updateJobItem(item.id, { album_id: externalId })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('FAIL:', item.album_id, message)
      await updateJobItem(item.id, { status: 'failed', error_message: message })
      await appendJobErrorLog(jobId, `${item.album_id}: ${message}`)
      counters.failed++
      counters.processed++
      await updateImportJob(jobId, counters)
    }
  }

  return counters
}

async function processFacebookJob(
  jobId: string,
  job: NonNullable<Awaited<ReturnType<typeof getImportJob>>>,
  flags: ReturnType<typeof workerFlags>
) {
  const items = await listPendingJobItems(jobId)
  if (!items.length) {
    console.log('No pending Facebook post items for this job.')
  }

  if (flags.refresh) {
    console.log('==> Refresh mode: existing products will be updated from Facebook (status unchanged)')
  }

  let processed = flags.retryAll || flags.retrySkipped ? 0 : job.processed
  let imported = flags.retryAll || flags.retrySkipped ? 0 : job.imported
  let skipped = flags.retryAll || flags.retrySkipped ? 0 : job.skipped
  let failed = flags.retryAll || flags.retrySkipped ? 0 : job.failed
  let refreshed = 0
  const counters = { processed, imported, skipped, failed, refreshed }

  for (const item of items) {
    try {
      console.log(`==> ${item.album_id}`)

      const post = await fetchFacebookPost(item.album_url)
      const itemForDedup = { ...item, album_id: post.externalId }

      const skipCheck = await importExistingOrSkip(
        itemForDedup,
        { sku: post.externalId } as ProductInput,
        flags,
        counters
      )
      if (skipCheck.done) {
        await updateImportJob(jobId, counters)
        continue
      }

      const input = await buildProductInputFromFacebookJobItem(item, post)

      if (!input.image_url) {
        throw new Error('No images found on Facebook post')
      }

      const secondCheck = await importExistingOrSkip(itemForDedup, input, flags, counters)
      if (secondCheck.done) {
        await updateImportJob(jobId, counters)
        continue
      }

      await saveImportedProduct(
        itemForDedup,
        jobId,
        input,
        secondCheck.existing,
        flags,
        { post, detectedPriceHint: post.detectedPriceHint, refreshed: Boolean(secondCheck.existing && flags.refresh) },
        counters
      )

      if (item.album_id !== post.externalId) {
        await updateJobItem(item.id, { album_id: post.externalId })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('FAIL:', item.album_id, message)
      await updateJobItem(item.id, { status: 'failed', error_message: message })
      await appendJobErrorLog(jobId, `${item.album_id}: ${message}`)
      counters.failed++
      counters.processed++
      await updateImportJob(jobId, counters)
    }
  }

  return counters
}

async function processJob(jobId: string) {
  const flags = workerFlags()
  const job = await getImportJob(jobId)
  if (!job) {
    console.error('Job not found:', jobId)
    process.exit(1)
  }

  const source = await getImportSource(job.source_id)
  if (!source) {
    console.error('Source not found for job:', job.source_id)
    process.exit(1)
  }

  if (!isFacebookImportSource(source) && !source.category_name) {
    console.error('Import source must have catalog_category_id mapped to an active category.')
    process.exit(1)
  }

  if (flags.retryAll) {
    const reset = await resetCompletedJobItems(jobId)
    if (reset > 0) {
      console.log(`==> Re-queued ${reset} imported/skipped items`)
    }
  } else if (flags.retrySkipped) {
    const reset = await resetSkippedJobItems(jobId)
    if (reset > 0) {
      console.log(`==> Re-queued ${reset} skipped items`)
    }
  }

  await updateImportJob(jobId, {
    status: 'running',
    started_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    ...(flags.retryAll || flags.retrySkipped
      ? { processed: 0, imported: 0, skipped: 0, failed: 0 }
      : {}),
  })

  let items = await listPendingJobItems(jobId)
  if (!items.length && job.total_albums === 0 && !flags.refresh && !flags.retryAll) {
    console.log('No pending items yet — discovery will run for this source type.')
  } else if (!items.length && (flags.refresh || flags.retryAll)) {
    console.log('No pending items. Use --retry-all on a finished job, or start a new sync in admin.')
  }

  const counters = isFacebookImportSource(source)
    ? await processFacebookJob(jobId, job, flags)
    : isWecatalogImportSource(source)
      ? await processWecatalogJob(jobId, job, source, flags)
      : isLkxoxImportSource(source)
        ? await processLkxoxJob(jobId, job, source, flags)
        : isWooCommerceImportSource(source)
          ? await processWooCommerceJob(jobId, job, source, flags)
          : await processYupooJob(jobId, job, source, flags)

  await updateImportJob(jobId, {
    status:
      counters.failed > 0 && counters.imported === 0 && counters.refreshed === 0
        ? 'failed'
        : 'done',
    finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  })
  await touchImportSourceSynced(source.id)

  const parts = [`imported=${counters.imported}`, `skipped=${counters.skipped}`, `failed=${counters.failed}`]
  if (counters.refreshed > 0) parts.push(`refreshed=${counters.refreshed}`)
  console.log(`Done. ${parts.join(' ')}`)
}

async function main() {
  loadDotEnv()
  ensureEnvLoaded()

  console.log(`==> Image storage: ${describeCatalogImagesWriteTarget()}`)
  if (!isCatalogImagesVpsWrite()) {
    console.log(
      '      Images save under public/images/ — commit and push public/images/ to deploy.'
    )
  }

  const jobId = await resolveJobId()
  if (!jobId) {
    console.error('No queued job. Pass --job=<uuid> or create a sync job in admin.')
    process.exit(1)
  }

  await processJob(jobId)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
