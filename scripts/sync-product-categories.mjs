#!/usr/bin/env node
/**
 * Link products.category to categories table (category_id + label sync).
 * Usage: npm run db:sync-product-categories
 */
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = path.join(__dirname, '../.env')
  if (!fs.existsSync(envPath)) return {}
  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split('\n')
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      })
  )
}

function resolveDatabaseUrl() {
  const env = { ...loadEnv(), ...process.env }
  const url = env.DATABASE_URL?.trim()
  if (url) return url.replace(/^mariadb:\/\//, 'mysql://')
  const host = env.DB_HOST
  const user = env.DB_USER
  const password = env.DB_PASSWORD
  const database = env.DB_NAME
  const port = env.DB_PORT || '3306'
  if (!host || !user || !password || !database) {
    throw new Error('Set DATABASE_URL or DB_* in .env')
  }
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`
}

const STEPS = [
  `ALTER TABLE products
   ADD COLUMN IF NOT EXISTS category_id VARCHAR(36) NULL AFTER category`,
  `ALTER TABLE products
   ADD KEY IF NOT EXISTS idx_products_category_id (category_id)`,
  `UPDATE products p
   INNER JOIN import_job_items i ON i.product_id = p.id AND i.status IN ('imported', 'skipped')
   INNER JOIN import_jobs j ON j.id = i.job_id
   INNER JOIN import_sources s ON s.id = j.source_id AND s.catalog_category_id IS NOT NULL
   INNER JOIN categories c ON c.id = s.catalog_category_id AND c.active = 1
   SET p.category_id = c.id, p.category = c.name
   WHERE p.source_album_id IS NOT NULL`,
  `UPDATE products p
   INNER JOIN categories c ON c.active = 1 AND c.name = p.category
     AND c.id = (
       SELECT c2.id FROM categories c2
       WHERE c2.active = 1 AND c2.name = p.category
       ORDER BY CASE WHEN c2.parent_id IS NULL THEN 0 ELSE 1 END, c2.name ASC
       LIMIT 1
     )
   SET p.category_id = c.id, p.category = c.name
   WHERE p.category_id IS NULL AND TRIM(IFNULL(p.category, '')) <> ''
     AND (
       SELECT COUNT(*) FROM categories c3 WHERE c3.active = 1 AND c3.name = p.category
     ) = 1`,
  `UPDATE products p
   INNER JOIN categories c
     ON c.slug = LOWER(REPLACE(TRIM(p.category), ' ', '-')) AND c.active = 1
     AND c.id = (
       SELECT c2.id FROM categories c2
       WHERE c2.active = 1 AND c2.slug = LOWER(REPLACE(TRIM(p.category), ' ', '-'))
       ORDER BY CASE WHEN c2.parent_id IS NULL THEN 0 ELSE 1 END, c2.name ASC
       LIMIT 1
     )
   SET p.category_id = c.id, p.category = c.name
   WHERE p.category_id IS NULL AND TRIM(IFNULL(p.category, '')) <> ''`,
]

async function main() {
  const conn = await mysql.createConnection(resolveDatabaseUrl())
  try {
    for (const sql of STEPS) {
      await conn.query(sql)
      console.log('OK:', sql.split('\n')[0].trim())
    }

    const [orphans] = await conn.query(
      `SELECT p.id, p.name, p.category FROM products p
       WHERE p.category_id IS NULL AND TRIM(IFNULL(p.category, '')) <> ''`
    )
    if (orphans.length) {
      console.warn('\nProducts without a linked category (pick a valid category in Admin → Products):')
      for (const row of orphans) {
        console.warn(`  - ${row.name} (${row.id}): "${row.category}"`)
      }
    } else {
      console.log('\nAll products are linked to categories.')
    }
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
