#!/usr/bin/env npx tsx
/**
 * Apply catalog performance DB upgrades (FULLTEXT search index, brand composite index).
 *
 *   npm run db:apply-catalog-performance
 */
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { queryDb, resetDbPool } from '@/lib/db'
import { PRODUCTS_FULLTEXT_INDEX } from '@/lib/product-search-sql'

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const rows = await queryDb<{ cnt: number }[]>(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND index_name = ?`,
    [table, indexName]
  )
  return Number(rows[0]?.cnt ?? 0) > 0
}

async function main() {
  ensureEnvLoaded()

  if (!(await indexExists('products', PRODUCTS_FULLTEXT_INDEX))) {
    console.log(`Adding FULLTEXT index ${PRODUCTS_FULLTEXT_INDEX}…`)
    await queryDb(
      `ALTER TABLE products
       ADD FULLTEXT INDEX ${PRODUCTS_FULLTEXT_INDEX} (name, sku, brand, short_description, category)`
    )
    console.log('FULLTEXT index created.')
  } else {
    console.log(`FULLTEXT index ${PRODUCTS_FULLTEXT_INDEX} already exists.`)
  }

  if (!(await indexExists('products', 'idx_products_status_brand_id'))) {
    console.log('Adding idx_products_status_brand_id…')
    await queryDb(
      `ALTER TABLE products ADD KEY idx_products_status_brand_id (status, brand_id)`
    )
    console.log('Composite brand index created.')
  } else {
    console.log('idx_products_status_brand_id already exists.')
  }

  if (!(await indexExists('products', 'idx_products_status_category_created'))) {
    console.log('Adding idx_products_status_category_created…')
    await queryDb(
      `ALTER TABLE products ADD KEY idx_products_status_category_created (status, category_id, created_at)`
    )
    console.log('Category listing index created.')
  } else {
    console.log('idx_products_status_category_created already exists.')
  }

  if (!(await indexExists('products', 'idx_products_status_brand_created'))) {
    console.log('Adding idx_products_status_brand_created…')
    await queryDb(
      `ALTER TABLE products ADD KEY idx_products_status_brand_created (status, brand_id, created_at)`
    )
    console.log('Brand listing index created.')
  } else {
    console.log('idx_products_status_brand_created already exists.')
  }

  console.log('Done.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => resetDbPool())
