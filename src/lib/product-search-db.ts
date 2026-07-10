import 'server-only'

import { queryDb } from '@/lib/db'
import { PRODUCTS_FULLTEXT_INDEX } from '@/lib/product-search-sql'

type GlobalSchema = typeof globalThis & {
  __productsFulltextAvailable?: Promise<boolean>
}

/** Whether the catalog FULLTEXT index exists (cached for process lifetime). */
export async function productsFulltextSearchAvailable(): Promise<boolean> {
  const g = globalThis as GlobalSchema
  if (!g.__productsFulltextAvailable) {
    g.__productsFulltextAvailable = queryDb<{ cnt: number }[]>(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'products'
         AND index_name = ?`,
      [PRODUCTS_FULLTEXT_INDEX]
    )
      .then((rows) => Number(rows[0]?.cnt ?? 0) > 0)
      .catch(() => false)
  }
  return g.__productsFulltextAvailable
}
