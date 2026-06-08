import type { Locale } from '@/lib/i18n-locale-registry'

export type PricelistBulkMessageKey =
  | 'pricelist.bulk.selected'
  | 'pricelist.bulk.selectAllPage'
  | 'pricelist.bulk.selectAllFiltered'
  | 'pricelist.bulk.selectAllMissing'
  | 'pricelist.bulk.clearSelection'
  | 'pricelist.bulk.setOutOfStock'
  | 'pricelist.bulk.setTemporarilyOutOfStock'
  | 'pricelist.bulk.setPrice'
  | 'pricelist.bulk.working'
  | 'pricelist.bulk.done'
  | 'pricelist.bulk.partial'
  | 'pricelist.bulk.failed'
  | 'pricelist.bulk.modalTitle'
  | 'pricelist.bulk.modalHint'
  | 'pricelist.bulk.applyPrice'
  | 'pricelist.bulk.cancel'
  | 'pricelist.bulk.colSelect'

type BulkMessages = Record<PricelistBulkMessageKey, string>

const EN: BulkMessages = {
  'pricelist.bulk.selected': '{count} selected',
  'pricelist.bulk.selectAllPage': 'Select all on this page',
  'pricelist.bulk.selectAllFiltered': 'Select all {count} matching filters',
  'pricelist.bulk.selectAllMissing': 'Select all missing prices ({count})',
  'pricelist.bulk.clearSelection': 'Clear selection',
  'pricelist.bulk.setOutOfStock': 'Out of stock',
  'pricelist.bulk.setTemporarilyOutOfStock': 'Temporarily out of stock',
  'pricelist.bulk.setPrice': 'Set price…',
  'pricelist.bulk.working': 'Updating…',
  'pricelist.bulk.done': 'Updated {count} product(s)',
  'pricelist.bulk.partial': 'Updated {updated}, skipped {skipped}',
  'pricelist.bulk.failed': 'Bulk update failed',
  'pricelist.bulk.modalTitle': 'Set price for selected products',
  'pricelist.bulk.modalHint': 'The same price will be applied to all selected editable rows.',
  'pricelist.bulk.applyPrice': 'Apply price',
  'pricelist.bulk.cancel': 'Cancel',
  'pricelist.bulk.colSelect': 'Select',
}

const BY_LOCALE: Partial<Record<Locale, Partial<BulkMessages>>> = {
  nl: {
    'pricelist.bulk.selected': '{count} geselecteerd',
    'pricelist.bulk.selectAllPage': 'Alles op deze pagina selecteren',
    'pricelist.bulk.selectAllFiltered': 'Alle {count} met deze filters selecteren',
    'pricelist.bulk.selectAllMissing': 'Alle ontbrekende prijzen selecteren ({count})',
    'pricelist.bulk.clearSelection': 'Selectie wissen',
    'pricelist.bulk.setOutOfStock': 'Uitverkocht',
    'pricelist.bulk.setTemporarilyOutOfStock': 'Tijdelijk uitverkocht',
    'pricelist.bulk.setPrice': 'Prijs instellen…',
    'pricelist.bulk.working': 'Bijwerken…',
    'pricelist.bulk.done': '{count} product(en) bijgewerkt',
    'pricelist.bulk.partial': '{updated} bijgewerkt, {skipped} overgeslagen',
    'pricelist.bulk.failed': 'Bulkupdate mislukt',
    'pricelist.bulk.modalTitle': 'Prijs instellen voor geselecteerde producten',
    'pricelist.bulk.modalHint': 'Dezelfde prijs wordt toegepast op alle geselecteerde bewerkbare rijen.',
    'pricelist.bulk.applyPrice': 'Prijs toepassen',
    'pricelist.bulk.cancel': 'Annuleren',
    'pricelist.bulk.colSelect': 'Selecteren',
  },
  de: {
    'pricelist.bulk.setOutOfStock': 'Nicht auf Lager',
    'pricelist.bulk.setTemporarilyOutOfStock': 'Vorübergehend nicht auf Lager',
    'pricelist.bulk.setPrice': 'Preis festlegen…',
    'pricelist.bulk.selectAllMissing': 'Alle fehlenden Preise auswählen ({count})',
  },
  fr: {
    'pricelist.bulk.setOutOfStock': 'Rupture de stock',
    'pricelist.bulk.setTemporarilyOutOfStock': 'Temporairement en rupture',
    'pricelist.bulk.setPrice': 'Définir le prix…',
    'pricelist.bulk.selectAllMissing': 'Sélectionner tous les prix manquants ({count})',
  },
}

export function getPricelistBulkMessages(locale: Locale): BulkMessages {
  return { ...EN, ...(BY_LOCALE[locale] ?? {}) }
}
