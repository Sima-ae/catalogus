/**
 * Backfill localized category labels for every category and locale.
 * Run after db/upgrade.sql (category_translations table).
 *
 *   npm run db:sync-category-translations
 *
 * Optional: set DEEPL_API_KEY in .env for higher-quality translations.
 */
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { syncAllCategoryTranslations } from '@/lib/category-translations-db'

async function main() {
  ensureEnvLoaded()
  console.log('Syncing category translations for all locales…')
  const count = await syncAllCategoryTranslations()
  console.log(`Done — synced ${count} categories.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
