/**
 * Generate tag_translations for every distinct product tag and all supported locales.
 * Run after applying db/upgrade.sql tag_translations section:
 *   npx tsx scripts/sync-tag-translations.ts
 */
import { syncAllTagTranslations } from '../src/lib/tag-translations-db'

async function main() {
  const count = await syncAllTagTranslations()
  console.log(`Synced translations for ${count} tag(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
