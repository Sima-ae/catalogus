import type { Locale } from '@/lib/i18n-locale-registry'

export type AdminMessageKey =
  | 'admin.nav.dashboard'
  | 'admin.nav.pricelist'
  | 'admin.nav.pricelistPages'
  | 'admin.nav.products'
  | 'admin.nav.trash'
  | 'admin.nav.orders'
  | 'admin.nav.users'
  | 'admin.nav.categories'
  | 'admin.nav.brands'
  | 'admin.nav.import'
  | 'admin.nav.reviews'
  | 'admin.nav.analytics'
  | 'admin.nav.settings'
  | 'admin.nav.catalogCleanup'
  | 'admin.quickActions'
  | 'admin.addProduct'
  | 'admin.addCategory'
  | 'admin.visitSite'
  | 'admin.logout'
  | 'admin.searchPlaceholder'
  | 'admin.openMenu'
  | 'admin.closeMenu'
  | 'admin.closeOverlay'
  | 'admin.page.yupooImport'
  | 'admin.page.importReview'
  | 'admin.page.editUser'
  | 'admin.page.viewUser'
  | 'admin.page.editBrand'
  | 'admin.page.viewBrand'
  | 'admin.page.addBrand'
  | 'admin.page.editCategory'
  | 'admin.page.addCategory'
  | 'admin.page.editProduct'
  | 'admin.page.addProduct'
  | 'admin.page.catalogCleanup'
  | 'admin.products.publishAllDrafts'
  | 'admin.products.addProduct'
  | 'admin.products.statTotal'
  | 'admin.products.statPublished'
  | 'admin.products.statDraft'
  | 'admin.products.statInactive'
  | 'admin.products.statTrash'
  | 'admin.products.search'
  | 'admin.products.searchPlaceholder'
  | 'admin.products.filterStatus'
  | 'admin.products.allStatuses'
  | 'admin.products.filterCategory'
  | 'admin.products.allCategories'
  | 'admin.products.filterBrand'
  | 'admin.products.allBrands'
  | 'admin.products.perPage'
  | 'admin.products.matchingSummary'
  | 'admin.products.filterStatusPrefix'
  | 'admin.products.filterCategoryPrefix'
  | 'admin.products.filterBrandPrefix'
  | 'admin.products.selected'
  | 'admin.products.pricelistTarget'
  | 'admin.products.addToPricelist'
  | 'admin.products.removeFromPricelist'
  | 'admin.products.bulkEdit'
  | 'admin.products.restoreToShop'
  | 'admin.products.publish'
  | 'admin.products.setDraft'
  | 'admin.products.setInactive'
  | 'admin.products.moveToTrash'
  | 'admin.products.clearSelection'
  | 'admin.products.noProducts'
  | 'admin.products.addFirstProduct'
  | 'admin.products.noMatches'
  | 'admin.products.clearFilters'
  | 'admin.products.confirmBulkStatus'
  | 'admin.products.confirmPublishAll'
  | 'admin.products.confirmMoveToTrash'
  | 'admin.products.bulkUpdateFailed'
  | 'admin.products.bulkPublishFailed'
  | 'admin.products.bulkPublishDone'
  | 'admin.products.bulkEditFailed'
  | 'admin.products.duplicateScan'
  | 'admin.products.duplicateScanTitle'
  | 'admin.products.duplicateScanHint'
  | 'admin.products.duplicateScanLoading'
  | 'admin.products.duplicateScanEmpty'
  | 'admin.products.duplicateScanSummary'
  | 'admin.products.duplicateScanGroupLabel'
  | 'admin.products.duplicateScanRescan'
  | 'admin.products.duplicateScanClose'
  | 'admin.products.duplicateScanFailed'
  | 'admin.products.duplicateTitleScan'
  | 'admin.products.duplicateTitleScanTitle'
  | 'admin.products.duplicateTitleScanHint'
  | 'admin.products.duplicateTitleScanLoading'
  | 'admin.products.duplicateTitleScanEmpty'
  | 'admin.products.duplicateTitleScanSummary'
  | 'admin.products.duplicateTitleScanGroupLabel'
  | 'admin.products.duplicateTitleScanRescan'
  | 'admin.products.duplicateTitleScanClose'
  | 'admin.products.duplicateTitleScanFailed'
  | 'admin.products.zeroDraftPurchasePrices'
  | 'admin.products.confirmZeroDraftPurchasePrices'
  | 'admin.products.zeroDraftPurchasePricesDone'
  | 'admin.products.zeroDraftPurchasePricesFailed'
  | 'adminProducts.col.product'
  | 'adminProducts.col.sku'
  | 'adminProducts.col.category'
  | 'adminProducts.col.brand'
  | 'adminProducts.col.price'
  | 'adminProducts.col.status'
  | 'adminProducts.col.actions'
  | 'adminProducts.status.published'
  | 'adminProducts.status.draft'
  | 'adminProducts.status.inactive'
  | 'adminProducts.status.trash'
  | 'adminProducts.selectAll'
  | 'adminProducts.selectProduct'
  | 'adminProducts.edit'
  | 'adminProducts.delete'
  | 'admin.catalogCleanup.intro'
  | 'admin.catalogCleanup.categories'
  | 'admin.catalogCleanup.brands'
  | 'admin.catalogCleanup.createdBefore'
  | 'admin.catalogCleanup.createdBeforeHelp'
  | 'admin.catalogCleanup.preview'
  | 'admin.catalogCleanup.previewCount'
  | 'admin.catalogCleanup.setInactive'
  | 'admin.catalogCleanup.moveToTrash'
  | 'admin.catalogCleanup.confirmInactive'
  | 'admin.catalogCleanup.confirmTrash'
  | 'admin.catalogCleanup.needSelection'
  | 'admin.catalogCleanup.doneInactive'
  | 'admin.catalogCleanup.doneTrash'
  | 'admin.catalogCleanup.failed'
  | 'admin.catalogCleanup.searchCategories'
  | 'admin.catalogCleanup.searchBrands'

type AdminMessages = Record<AdminMessageKey, string>

const EN: AdminMessages = {
  'admin.nav.dashboard': "Dashboard",
  'admin.nav.pricelist': "Pricelist",
  'admin.nav.pricelistPages': "Pricelist pages",
  'admin.nav.products': "Products",
  'admin.nav.trash': "Trash",
  'admin.nav.orders': "Orders",
  'admin.nav.users': "Users",
  'admin.nav.categories': "Categories",
  'admin.nav.brands': "Brands",
  'admin.nav.import': "Import",
  'admin.nav.reviews': "Reviews",
  'admin.nav.analytics': "Analytics",
  'admin.nav.settings': "Settings",
  'admin.nav.catalogCleanup': "Catalog cleanup",
  'admin.quickActions': "Quick Actions",
  'admin.addProduct': "Add Product",
  'admin.addCategory': "Add Category",
  'admin.visitSite': "Visit Site",
  'admin.logout': "Logout",
  'admin.searchPlaceholder': "SEARCH...",
  'admin.openMenu': "Open admin menu",
  'admin.closeMenu': "Close",
  'admin.closeOverlay': "Close overlay",
  'admin.page.yupooImport': "Yupoo Import",
  'admin.page.importReview': "Import review",
  'admin.page.editUser': "Edit user",
  'admin.page.viewUser': "View user",
  'admin.page.editBrand': "Edit brand",
  'admin.page.viewBrand': "View brand",
  'admin.page.addBrand': "Add brand",
  'admin.page.editCategory': "Edit category",
  'admin.page.addCategory': "Add category",
  'admin.page.editProduct': "Edit product",
  'admin.page.addProduct': "Add product",
  'admin.page.catalogCleanup': "Catalog cleanup",
  'admin.products.publishAllDrafts': "Publish all drafts ({count})",
  'admin.products.addProduct': "Add product",
  'admin.products.statTotal': "Total products",
  'admin.products.statPublished': "Published",
  'admin.products.statDraft': "Draft",
  'admin.products.statInactive': "Inactive",
  'admin.products.statTrash': "Trash",
  'admin.products.search': "Search",
  'admin.products.searchPlaceholder': "Name, SKU, category...",
  'admin.products.filterStatus': "Status",
  'admin.products.allStatuses': "All statuses",
  'admin.products.filterCategory': "Category",
  'admin.products.allCategories': "All categories",
  'admin.products.filterBrand': "Brand",
  'admin.products.allBrands': "All brands",
  'admin.products.perPage': "Per page",
  'admin.products.matchingSummary': "{matching} matching · {total} total in catalog",
  'admin.products.filterStatusPrefix': "status",
  'admin.products.filterCategoryPrefix': "category",
  'admin.products.filterBrandPrefix': "brand",
  'admin.products.selected': "{count} selected",
  'admin.products.pricelistTarget': "Target pricelist",
  'admin.products.addToPricelist': "Add to pricelist",
  'admin.products.removeFromPricelist': "Remove from pricelist",
  'admin.products.bulkEdit': "Bulk edit",
  'admin.products.restoreToShop': "Restore to shop",
  'admin.products.publish': "Publish",
  'admin.products.setDraft': "Set draft",
  'admin.products.setInactive': "Set inactive",
  'admin.products.moveToTrash': "Move to trash",
  'admin.products.clearSelection': "Clear selection",
  'admin.products.noProducts': "No products yet.",
  'admin.products.addFirstProduct': "Add your first product",
  'admin.products.noMatches': "No products match your search or filter.",
  'admin.products.clearFilters': "Clear filters",
  'admin.products.confirmBulkStatus': "Set {count} product(s) to \"{label}\"?",
  'admin.products.confirmPublishAll': "Publish all {count} draft product(s)?",
  'admin.products.confirmMoveToTrash': "Move this product to trash? You can restore it later from the trash filter.",
  'admin.products.bulkUpdateFailed': "Bulk update failed",
  'admin.products.bulkPublishFailed': "Bulk publish failed",
  'admin.products.bulkPublishDone': "Published {count} draft product(s).",
  'admin.products.bulkEditFailed': "Bulk edit failed",
  'admin.products.duplicateScan': "Scan duplicate images",
  'admin.products.duplicateScanTitle': "Possible duplicate products",
  'admin.products.duplicateScanHint': "Products grouped by matching main or gallery image.",
  'admin.products.duplicateScanLoading': "Scanning catalog for duplicate images…",
  'admin.products.duplicateScanEmpty': "No duplicate images found.",
  'admin.products.duplicateScanSummary': "{groups} duplicate group(s) · {products} product(s) involved · {scanned} scanned",
  'admin.products.duplicateScanGroupLabel': "{count} products share this image",
  'admin.products.duplicateScanRescan': "Scan again",
  'admin.products.duplicateScanClose': "Close",
  'admin.products.duplicateScanFailed': "Duplicate scan failed",
  'admin.products.duplicateTitleScan': "Scan duplicate titles",
  'admin.products.duplicateTitleScanTitle': "Possible duplicate titles",
  'admin.products.duplicateTitleScanHint': "Products grouped by matching title keywords (model nicknames, references, or distinctive words).",
  'admin.products.duplicateTitleScanLoading': "Scanning catalog for duplicate titles…",
  'admin.products.duplicateTitleScanEmpty': "No duplicate title groups found.",
  'admin.products.duplicateTitleScanSummary': "{groups} duplicate group(s) · {products} product(s) involved · {scanned} scanned",
  'admin.products.duplicateTitleScanGroupLabel': "{count} products match · {keywords}",
  'admin.products.duplicateTitleScanRescan': "Scan again",
  'admin.products.duplicateTitleScanClose': "Close",
  'admin.products.duplicateTitleScanFailed': "Title duplicate scan failed",
  'admin.products.zeroDraftPurchasePrices': "Zero concept purchase prices",
  'admin.products.confirmZeroDraftPurchasePrices':
    'Set purchase price to €0 on all {count} concept (draft) products? This is a one-time bulk action.',
  'admin.products.zeroDraftPurchasePricesDone':
    'Purchase price set to €0 on {total} concept product(s) ({cleared} had a non-zero price).',
  'admin.products.zeroDraftPurchasePricesFailed': "Failed to zero concept purchase prices",
  'adminProducts.col.product': "Product",
  'adminProducts.col.sku': "SKU",
  'adminProducts.col.category': "Category",
  'adminProducts.col.brand': "Brand",
  'adminProducts.col.price': "Price",
  'adminProducts.col.status': "Status",
  'adminProducts.col.actions': "Actions",
  'adminProducts.status.published': "Published",
  'adminProducts.status.draft': "Draft",
  'adminProducts.status.inactive': "Inactive",
  'adminProducts.status.trash': "Trash",
  'adminProducts.selectAll': "Select all on this page",
  'adminProducts.selectProduct': "Select {name}",
  'adminProducts.edit': "Edit",
  'adminProducts.delete': "Delete",
  'admin.catalogCleanup.intro':
    "Select categories and/or brands, then archive active or draft products imported before the cutoff date. Products are hidden from the shop but remain in the database.",
  'admin.catalogCleanup.categories': "Categories",
  'admin.catalogCleanup.brands': "Brands",
  'admin.catalogCleanup.createdBefore': "Imported before",
  'admin.catalogCleanup.createdBeforeHelp':
    "Only products created before this date are affected (active and draft only).",
  'admin.catalogCleanup.preview': "Preview count",
  'admin.catalogCleanup.previewCount': "{count} matching products",
  'admin.catalogCleanup.setInactive': "Set inactive",
  'admin.catalogCleanup.moveToTrash': "Move to trash",
  'admin.catalogCleanup.confirmInactive':
    "Set {count} products to inactive? They will be hidden from the shop.",
  'admin.catalogCleanup.confirmTrash':
    "Move {count} products to trash? You can restore them from the trash page.",
  'admin.catalogCleanup.needSelection': "Select at least one category or brand.",
  'admin.catalogCleanup.doneInactive': "Set {count} products to inactive.",
  'admin.catalogCleanup.doneTrash': "Moved {count} products to trash.",
  'admin.catalogCleanup.failed': "Archive failed",
  'admin.catalogCleanup.searchCategories': "Search categories…",
  'admin.catalogCleanup.searchBrands': "Search brands…",
}

const BY_LOCALE: Partial<Record<Locale, Partial<AdminMessages>>> = {
  nl: {
  'admin.nav.dashboard': "Dashboard",
  'admin.nav.pricelist': "Prijslijst",
  'admin.nav.products': "Producten",
  'admin.nav.trash': "Prullenbak",
  'admin.nav.orders': "Bestellingen",
  'admin.nav.users': "Gebruikers",
  'admin.nav.categories': "Categorieën",
  'admin.nav.brands': "Merken",
  'admin.nav.import': "Importeren",
  'admin.nav.reviews': "Beoordelingen",
  'admin.nav.analytics': "Analyses",
  'admin.nav.settings': "Instellingen",
  'admin.nav.catalogCleanup': "Catalogus opschonen",
  'admin.quickActions': "Snelle acties",
  'admin.addProduct': "Product toevoegen",
  'admin.addCategory': "Categorie toevoegen",
  'admin.visitSite': "Site bekijken",
  'admin.logout': "Uitloggen",
  'admin.openMenu': "Adminmenu openen",
  'admin.closeMenu': "Sluiten",
  'admin.closeOverlay': "Overlay sluiten",
  'admin.page.yupooImport': "Yupoo-import",
  'admin.page.importReview': "Importcontrole",
  'admin.page.editUser': "Gebruiker bewerken",
  'admin.page.viewUser': "Gebruiker bekijken",
  'admin.page.editBrand': "Merk bewerken",
  'admin.page.viewBrand': "Merk bekijken",
  'admin.page.addBrand': "Merk toevoegen",
  'admin.page.editCategory': "Categorie bewerken",
  'admin.page.addCategory': "Categorie toevoegen",
  'admin.page.editProduct': "Product bewerken",
  'admin.page.addProduct': "Product toevoegen",
  'admin.products.publishAllDrafts': "Alle concepten publiceren ({count})",
  'admin.products.addProduct': "Product toevoegen",
  'admin.products.statTotal': "Totaal producten",
  'admin.products.statPublished': "Gepubliceerd",
  'admin.products.statDraft': "Concept",
  'admin.products.statInactive': "Inactief",
  'admin.products.statTrash': "Prullenbak",
  'admin.products.search': "Zoeken",
  'admin.products.searchPlaceholder': "Naam, SKU, categorie...",
  'admin.products.allStatuses': "Alle statussen",
  'admin.products.filterCategory': "Categorie",
  'admin.products.allCategories': "Alle categorieën",
  'admin.products.filterBrand': "Merk",
  'admin.products.allBrands': "Alle merken",
  'admin.products.perPage': "Per pagina",
  'admin.products.matchingSummary': "{matching} resultaten · {total} totaal in catalogus",
  'admin.products.filterCategoryPrefix': "categorie",
  'admin.products.filterBrandPrefix': "merk",
  'admin.products.selected': "{count} geselecteerd",
  'admin.products.pricelistTarget': "Doelprijslijst",
  'admin.products.addToPricelist': "Toevoegen aan prijslijst",
  'admin.products.removeFromPricelist': "Verwijderen van prijslijst",
  'admin.products.bulkEdit': "Bulk bewerken",
  'admin.products.restoreToShop': "Herstellen in shop",
  'admin.products.publish': "Publiceren",
  'admin.products.setDraft': "Als concept",
  'admin.products.setInactive': "Inactief maken",
  'admin.products.moveToTrash': "Naar prullenbak",
  'admin.products.clearSelection': "Selectie wissen",
  'admin.products.noProducts': "Nog geen producten.",
  'admin.products.addFirstProduct': "Voeg je eerste product toe",
  'admin.products.noMatches': "Geen producten gevonden voor je zoekopdracht of filter.",
  'admin.products.clearFilters': "Filters wissen",
  'admin.products.confirmBulkStatus': "{count} product(en) instellen op \"{label}\"?",
  'admin.products.confirmPublishAll': "Alle {count} conceptproduct(en) publiceren?",
  'admin.products.confirmMoveToTrash': "Dit product naar de prullenbak verplaatsen? Je kunt het later herstellen via het prullenbakfilter.",
  'admin.products.bulkUpdateFailed': "Bulkupdate mislukt",
  'admin.products.bulkPublishFailed': "Bulkpublicatie mislukt",
  'admin.products.bulkPublishDone': "{count} conceptproduct(en) gepubliceerd.",
  'admin.products.bulkEditFailed': "Bulk bewerken mislukt",
  'admin.products.duplicateScan': "Duplicaten scannen (afbeelding)",
  'admin.products.duplicateScanTitle': "Mogelijke dubbele producten",
  'admin.products.duplicateScanHint': "Producten gegroepeerd op dezelfde hoofd- of galerijafbeelding.",
  'admin.products.duplicateScanLoading': "Catalogus scannen op dubbele afbeeldingen…",
  'admin.products.duplicateScanEmpty': "Geen dubbele afbeeldingen gevonden.",
  'admin.products.duplicateScanSummary': "{groups} duplicaatgroep(en) · {products} product(en) · {scanned} gescand",
  'admin.products.duplicateScanGroupLabel': "{count} producten delen deze afbeelding",
  'admin.products.duplicateScanRescan': "Opnieuw scannen",
  'admin.products.duplicateScanClose': "Sluiten",
  'admin.products.duplicateScanFailed': "Duplicaatscan mislukt",
  'admin.products.duplicateTitleScan': "Duplicaten scannen (titel)",
  'admin.products.duplicateTitleScanTitle': "Mogelijke dubbele titels",
  'admin.products.duplicateTitleScanHint': "Producten gegroepeerd op overeenkomende titel-trefwoorden (modelnamen, referenties of onderscheidende woorden).",
  'admin.products.duplicateTitleScanLoading': "Catalogus scannen op dubbele titels…",
  'admin.products.duplicateTitleScanEmpty': "Geen dubbele titelgroepen gevonden.",
  'admin.products.duplicateTitleScanSummary': "{groups} duplicaatgroep(en) · {products} product(en) · {scanned} gescand",
  'admin.products.duplicateTitleScanGroupLabel': "{count} producten · {keywords}",
  'admin.products.duplicateTitleScanRescan': "Opnieuw scannen",
  'admin.products.duplicateTitleScanClose': "Sluiten",
  'admin.products.duplicateTitleScanFailed': "Titel-duplicaatscan mislukt",
  'admin.products.zeroDraftPurchasePrices': "Inkoopprijs concept op €0",
  'admin.products.confirmZeroDraftPurchasePrices':
    'Inkoopprijs op €0 zetten voor alle {count} conceptproducten? Dit is een eenmalige bulkactie.',
  'admin.products.zeroDraftPurchasePricesDone':
    'Inkoopprijs op €0 gezet voor {total} conceptproduct(en) ({cleared} hadden een prijs > €0).',
  'admin.products.zeroDraftPurchasePricesFailed': "Inkoopprijs op nul zetten mislukt",
  'adminProducts.col.category': "Categorie",
  'adminProducts.col.brand': "Merk",
  'adminProducts.col.price': "Prijs",
  'adminProducts.col.actions': "Acties",
  'adminProducts.status.published': "Gepubliceerd",
  'adminProducts.status.draft': "Concept",
  'adminProducts.status.inactive': "Inactief",
  'adminProducts.status.trash': "Prullenbak",
  'adminProducts.selectAll': "Alles op deze pagina selecteren",
  'adminProducts.selectProduct': "{name} selecteren",
  'adminProducts.edit': "Bewerken",
  'adminProducts.delete': "Verwijderen",
  'admin.page.catalogCleanup': "Catalogus opschonen",
  'admin.catalogCleanup.intro':
    "Selecteer categorieën en/of merken en archiveer actieve of conceptproducten die vóór de grensdatum zijn geïmporteerd. Producten verdwijnen uit de shop maar blijven in de database.",
  'admin.catalogCleanup.categories': "Categorieën",
  'admin.catalogCleanup.brands': "Merken",
  'admin.catalogCleanup.createdBefore': "Geïmporteerd vóór",
  'admin.catalogCleanup.createdBeforeHelp':
    "Alleen producten die vóór deze datum zijn aangemaakt (actief en concept).",
  'admin.catalogCleanup.preview': "Aantal bekijken",
  'admin.catalogCleanup.previewCount': "{count} overeenkomende producten",
  'admin.catalogCleanup.setInactive': "Inactief maken",
  'admin.catalogCleanup.moveToTrash': "Naar prullenbak",
  'admin.catalogCleanup.confirmInactive':
    "{count} producten inactief maken? Ze worden verborgen in de shop.",
  'admin.catalogCleanup.confirmTrash':
    "{count} producten naar de prullenbak verplaatsen? Je kunt ze herstellen via de prullenbak.",
  'admin.catalogCleanup.needSelection': "Selecteer minstens één categorie of merk.",
  'admin.catalogCleanup.doneInactive': "{count} producten inactief gemaakt.",
  'admin.catalogCleanup.doneTrash': "{count} producten naar de prullenbak verplaatst.",
  'admin.catalogCleanup.failed': "Archiveren mislukt",
  'admin.catalogCleanup.searchCategories': "Zoek categorieën…",
  'admin.catalogCleanup.searchBrands': "Zoek merken…",
  },
  de: {
  'admin.nav.pricelist': "Preisliste",
  'admin.nav.products': "Produkte",
  'admin.nav.trash': "Papierkorb",
  'admin.nav.orders': "Bestellungen",
  'admin.nav.users': "Benutzer",
  'admin.nav.categories': "Kategorien",
  'admin.nav.brands': "Marken",
  'admin.nav.reviews': "Bewertungen",
  'admin.nav.analytics': "Analysen",
  'admin.nav.settings': "Einstellungen",
  'admin.quickActions': "Schnellaktionen",
  'admin.addProduct': "Produkt hinzufügen",
  'admin.addCategory': "Kategorie hinzufügen",
  'admin.visitSite': "Website besuchen",
  'admin.logout': "Abmelden",
  'admin.openMenu': "Admin-Menü öffnen",
  'admin.closeMenu': "Schließen",
  'admin.closeOverlay': "Overlay schließen",
  'admin.page.yupooImport': "Yupoo-Import",
  'admin.page.importReview': "Import-Überprüfung",
  'admin.page.editUser': "Benutzer bearbeiten",
  'admin.page.viewUser': "Benutzer anzeigen",
  'admin.page.editBrand': "Marke bearbeiten",
  'admin.page.viewBrand': "Marke anzeigen",
  'admin.page.addBrand': "Marke hinzufügen",
  'admin.page.editCategory': "Kategorie bearbeiten",
  'admin.page.addCategory': "Kategorie hinzufügen",
  'admin.page.editProduct': "Produkt bearbeiten",
  'admin.page.addProduct': "Produkt hinzufügen",
  'admin.products.publishAllDrafts': "Alle Entwürfe veröffentlichen ({count})",
  'admin.products.addProduct': "Produkt hinzufügen",
  'admin.products.statTotal': "Produkte gesamt",
  'admin.products.statPublished': "Veröffentlicht",
  'admin.products.statDraft': "Entwurf",
  'admin.products.statInactive': "Inaktiv",
  'admin.products.statTrash': "Papierkorb",
  'admin.products.search': "Suche",
  'admin.products.searchPlaceholder': "Name, SKU, Kategorie...",
  'admin.products.allStatuses': "Alle Status",
  'admin.products.filterCategory': "Kategorie",
  'admin.products.allCategories': "Alle Kategorien",
  'admin.products.filterBrand': "Marke",
  'admin.products.allBrands': "Alle Marken",
  'admin.products.perPage': "Pro Seite",
  'admin.products.matchingSummary': "{matching} Treffer · {total} gesamt im Katalog",
  'admin.products.filterStatusPrefix': "Status",
  'admin.products.filterCategoryPrefix': "Kategorie",
  'admin.products.filterBrandPrefix': "Marke",
  'admin.products.selected': "{count} ausgewählt",
  'admin.products.bulkEdit': "Massenbearbeitung",
  'admin.products.restoreToShop': "Im Shop wiederherstellen",
  'admin.products.publish': "Veröffentlichen",
  'admin.products.setDraft': "Als Entwurf",
  'admin.products.setInactive': "Inaktiv setzen",
  'admin.products.moveToTrash': "In Papierkorb",
  'admin.products.clearSelection': "Auswahl aufheben",
  'admin.products.noProducts': "Noch keine Produkte.",
  'admin.products.addFirstProduct': "Erstes Produkt hinzufügen",
  'admin.products.noMatches': "Keine Produkte für Suche oder Filter.",
  'admin.products.clearFilters': "Filter zurücksetzen",
  'admin.products.confirmBulkStatus': "{count} Produkt(e) auf „{label}\" setzen?",
  'admin.products.confirmPublishAll': "Alle {count} Entwürfe veröffentlichen?",
  'admin.products.confirmMoveToTrash': "Produkt in den Papierkorb verschieben? Später über Papierkorb wiederherstellbar.",
  'admin.products.bulkUpdateFailed': "Massenaktualisierung fehlgeschlagen",
  'admin.products.bulkPublishFailed': "Massenveröffentlichung fehlgeschlagen",
  'admin.products.bulkEditFailed': "Massenbearbeitung fehlgeschlagen",
  'adminProducts.col.product': "Produkt",
  'adminProducts.col.category': "Kategorie",
  'adminProducts.col.brand': "Marke",
  'adminProducts.col.price': "Preis",
  'adminProducts.col.actions': "Aktionen",
  'adminProducts.status.published': "Veröffentlicht",
  'adminProducts.status.draft': "Entwurf",
  'adminProducts.status.inactive': "Inaktiv",
  'adminProducts.status.trash': "Papierkorb",
  'adminProducts.selectAll': "Alle auf dieser Seite auswählen",
  'adminProducts.selectProduct': "{name} auswählen",
  'adminProducts.edit': "Bearbeiten",
  'adminProducts.delete': "Löschen",
  },
  fr: {
  'admin.nav.dashboard': "Tableau de bord",
  'admin.nav.pricelist': "Liste de prix",
  'admin.nav.products': "Produits",
  'admin.nav.trash': "Corbeille",
  'admin.nav.orders': "Commandes",
  'admin.nav.users': "Utilisateurs",
  'admin.nav.categories': "Catégories",
  'admin.nav.brands': "Marques",
  'admin.nav.reviews': "Avis",
  'admin.nav.analytics': "Analyses",
  'admin.nav.settings': "Paramètres",
  'admin.quickActions': "Actions rapides",
  'admin.addProduct': "Ajouter un produit",
  'admin.addCategory': "Ajouter une catégorie",
  'admin.visitSite': "Visiter le site",
  'admin.logout': "Déconnexion",
  'admin.openMenu': "Ouvrir le menu admin",
  'admin.closeMenu': "Fermer",
  'admin.closeOverlay': "Fermer l’overlay",
  'admin.page.yupooImport': "Import Yupoo",
  'admin.page.importReview': "Revue d’import",
  'admin.page.editUser': "Modifier l’utilisateur",
  'admin.page.viewUser': "Voir l’utilisateur",
  'admin.page.editBrand': "Modifier la marque",
  'admin.page.viewBrand': "Voir la marque",
  'admin.page.addBrand': "Ajouter une marque",
  'admin.page.editCategory': "Modifier la catégorie",
  'admin.page.addCategory': "Ajouter une catégorie",
  'admin.page.editProduct': "Modifier le produit",
  'admin.page.addProduct': "Ajouter un produit",
  'admin.products.publishAllDrafts': "Publier tous les brouillons ({count})",
  'admin.products.addProduct': "Ajouter un produit",
  'admin.products.statTotal': "Total produits",
  'admin.products.statPublished': "Publié",
  'admin.products.statDraft': "Brouillon",
  'admin.products.statInactive': "Inactif",
  'admin.products.statTrash': "Corbeille",
  'admin.products.search': "Recherche",
  'admin.products.searchPlaceholder': "Nom, SKU, catégorie...",
  'admin.products.filterStatus': "Statut",
  'admin.products.allStatuses': "Tous les statuts",
  'admin.products.filterCategory': "Catégorie",
  'admin.products.allCategories': "Toutes les catégories",
  'admin.products.filterBrand': "Marque",
  'admin.products.allBrands': "Toutes les marques",
  'admin.products.perPage': "Par page",
  'admin.products.matchingSummary': "{matching} correspondances · {total} au total",
  'admin.products.filterStatusPrefix': "statut",
  'admin.products.filterCategoryPrefix': "catégorie",
  'admin.products.filterBrandPrefix': "marque",
  'admin.products.selected': "{count} sélectionné(s)",
  'admin.products.bulkEdit': "Modification groupée",
  'admin.products.restoreToShop': "Restaurer en boutique",
  'admin.products.publish': "Publier",
  'admin.products.setDraft': "Mettre en brouillon",
  'admin.products.setInactive': "Mettre inactif",
  'admin.products.moveToTrash': "Mettre à la corbeille",
  'admin.products.clearSelection': "Effacer la sélection",
  'admin.products.noProducts': "Aucun produit pour l’instant.",
  'admin.products.addFirstProduct': "Ajouter votre premier produit",
  'admin.products.noMatches': "Aucun produit ne correspond.",
  'admin.products.clearFilters': "Effacer les filtres",
  'admin.products.confirmBulkStatus': "Définir {count} produit(s) sur « {label} » ?",
  'admin.products.confirmPublishAll': "Publier les {count} brouillon(s) ?",
  'admin.products.confirmMoveToTrash': "Mettre ce produit à la corbeille ? Restaurable plus tard.",
  'admin.products.bulkUpdateFailed': "Mise à jour groupée échouée",
  'admin.products.bulkPublishFailed': "Publication groupée échouée",
  'admin.products.bulkEditFailed': "Modification groupée échouée",
  'adminProducts.col.product': "Produit",
  'adminProducts.col.category': "Catégorie",
  'adminProducts.col.brand': "Marque",
  'adminProducts.col.price': "Prix",
  'adminProducts.col.status': "Statut",
  'adminProducts.status.published': "Publié",
  'adminProducts.status.draft': "Brouillon",
  'adminProducts.status.inactive': "Inactif",
  'adminProducts.status.trash': "Corbeille",
  'adminProducts.selectAll': "Tout sélectionner sur cette page",
  'adminProducts.selectProduct': "Sélectionner {name}",
  'adminProducts.edit': "Modifier",
  'adminProducts.delete': "Supprimer",
  },
  es: {
  'admin.nav.dashboard': "Panel",
  'admin.nav.pricelist': "Lista de precios",
  'admin.nav.products': "Productos",
  'admin.nav.trash': "Papelera",
  'admin.nav.orders': "Pedidos",
  'admin.nav.users': "Usuarios",
  'admin.nav.categories': "Categorías",
  'admin.nav.brands': "Marcas",
  'admin.nav.import': "Importar",
  'admin.nav.reviews': "Reseñas",
  'admin.nav.analytics': "Análisis",
  'admin.nav.settings': "Ajustes",
  'admin.quickActions': "Acciones rápidas",
  'admin.addProduct': "Añadir producto",
  'admin.addCategory': "Añadir categoría",
  'admin.visitSite': "Visitar sitio",
  'admin.logout': "Cerrar sesión",
  'admin.openMenu': "Abrir menú admin",
  'admin.closeMenu': "Cerrar",
  'admin.closeOverlay': "Cerrar superposición",
  'admin.products.publishAllDrafts': "Publicar todos los borradores ({count})",
  'admin.products.addProduct': "Añadir producto",
  'admin.products.statTotal': "Total productos",
  'admin.products.statPublished': "Publicado",
  'admin.products.statDraft': "Borrador",
  'admin.products.statInactive': "Inactivo",
  'admin.products.statTrash': "Papelera",
  'admin.products.search': "Buscar",
  'admin.products.searchPlaceholder': "Nombre, SKU, categoría...",
  'admin.products.allStatuses': "Todos los estados",
  'admin.products.allCategories': "Todas las categorías",
  'admin.products.allBrands': "Todas las marcas",
  'admin.products.perPage': "Por página",
  'admin.products.matchingSummary': "{matching} coincidencias · {total} en catálogo",
  'admin.products.selected': "{count} seleccionados",
  'admin.products.bulkEdit': "Edición masiva",
  'admin.products.restoreToShop': "Restaurar en tienda",
  'admin.products.publish': "Publicar",
  'admin.products.setDraft': "Marcar borrador",
  'admin.products.setInactive': "Marcar inactivo",
  'admin.products.moveToTrash': "Mover a papelera",
  'admin.products.clearSelection': "Limpiar selección",
  'admin.products.noProducts': "Aún no hay productos.",
  'admin.products.addFirstProduct': "Añade tu primer producto",
  'admin.products.noMatches': "Ningún producto coincide.",
  'admin.products.clearFilters': "Limpiar filtros",
  'adminProducts.col.product': "Producto",
  'adminProducts.col.category': "Categoría",
  'adminProducts.col.brand': "Marca",
  'adminProducts.col.price': "Precio",
  'adminProducts.col.status': "Estado",
  'adminProducts.col.actions': "Acciones",
  'adminProducts.status.published': "Publicado",
  'adminProducts.status.draft': "Borrador",
  'adminProducts.status.inactive': "Inactivo",
  'adminProducts.status.trash': "Papelera",
  'adminProducts.edit': "Editar",
  'adminProducts.delete': "Eliminar",
  },
  pt: {
  'admin.nav.dashboard': "Painel",
  'admin.nav.pricelist': "Lista de preços",
  'admin.nav.products': "Produtos",
  'admin.nav.trash': "Lixo",
  'admin.nav.orders': "Encomendas",
  'admin.nav.users': "Utilizadores",
  'admin.nav.categories': "Categorias",
  'admin.nav.brands': "Marcas",
  'admin.nav.import': "Importar",
  'admin.nav.reviews': "Avaliações",
  'admin.nav.analytics': "Análises",
  'admin.nav.settings': "Definições",
  'admin.quickActions': "Ações rápidas",
  'admin.addProduct': "Adicionar produto",
  'admin.addCategory': "Adicionar categoria",
  'admin.visitSite': "Visitar site",
  'admin.logout': "Terminar sessão",
  'admin.products.addProduct': "Adicionar produto",
  'admin.products.statTotal': "Total de produtos",
  'admin.products.statPublished': "Publicado",
  'admin.products.statDraft': "Rascunho",
  'admin.products.statInactive': "Inativo",
  'admin.products.search': "Pesquisar",
  'admin.products.allStatuses': "Todos os estados",
  'admin.products.allCategories': "Todas as categorias",
  'admin.products.allBrands': "Todas as marcas",
  'admin.products.perPage': "Por página",
  'adminProducts.col.product': "Produto",
  'adminProducts.col.category': "Categoria",
  'adminProducts.col.brand': "Marca",
  'adminProducts.col.price': "Preço",
  'adminProducts.status.published': "Publicado",
  'adminProducts.status.draft': "Rascunho",
  'adminProducts.status.inactive': "Inativo",
  },
  it: {
  'admin.nav.pricelist': "Listino prezzi",
  'admin.nav.products': "Prodotti",
  'admin.nav.trash': "Cestino",
  'admin.nav.orders': "Ordini",
  'admin.nav.users': "Utenti",
  'admin.nav.categories': "Categorie",
  'admin.nav.brands': "Marchi",
  'admin.nav.import': "Importa",
  'admin.nav.reviews': "Recensioni",
  'admin.nav.analytics': "Analisi",
  'admin.nav.settings': "Impostazioni",
  'admin.quickActions': "Azioni rapide",
  'admin.addProduct': "Aggiungi prodotto",
  'admin.addCategory': "Aggiungi categoria",
  'admin.visitSite': "Visita sito",
  'admin.logout': "Esci",
  'admin.products.addProduct': "Aggiungi prodotto",
  'admin.products.statTotal': "Prodotti totali",
  'admin.products.statPublished': "Pubblicato",
  'admin.products.statDraft': "Bozza",
  'admin.products.statInactive': "Inattivo",
  'admin.products.search': "Cerca",
  'admin.products.allStatuses': "Tutti gli stati",
  'admin.products.allCategories': "Tutte le categorie",
  'admin.products.allBrands': "Tutti i marchi",
  'admin.products.perPage': "Per pagina",
  'adminProducts.col.product': "Prodotto",
  'adminProducts.col.category': "Categoria",
  'adminProducts.col.brand': "Marca",
  'adminProducts.col.price': "Prezzo",
  'adminProducts.status.published': "Pubblicato",
  'adminProducts.status.draft': "Bozza",
  'adminProducts.status.inactive': "Inattivo",
  },
  zh: {
    'admin.products.perPage': '每页',
  },
}

/** Admin header search — short uppercase-style placeholder per locale. */
const ADMIN_SEARCH_PLACEHOLDER: Record<Locale, string> = {
  nl: 'ZOEKEN...',
  en: 'SEARCH...',
  fr: 'RECHERCHER...',
  de: 'SUCHEN...',
  es: 'BUSCAR...',
  pt: 'PESQUISAR...',
  it: 'CERCA...',
  gr: 'ΑΝΑΖΗΤΗΣΗ...',
  pl: 'SZUKAJ...',
  cz: 'HLEDAT...',
  sk: 'HĽADAŤ...',
  hu: 'KERESÉS...',
  ro: 'CĂUTARE...',
  bg: 'ТЪРСЕНЕ...',
  hr: 'PRETRAŽI...',
  sr: 'ПРЕТРАГА...',
  ba: 'PRETRAŽI...',
  me: 'PRETRAŽI...',
  sq: 'KËRKO...',
  mk: 'ПРЕБАРАЈ...',
  lt: 'IEŠKOTI...',
  da: 'SØG...',
  sv: 'SÖK...',
  nb: 'SØK...',
  fi: 'HAE...',
  uk: 'ПОШУК...',
  ru: 'ПОИСК...',
  tr: 'ARA...',
  he: 'חיפוש...',
  eg: 'بحث...',
  at: 'بحث...',
  ps: 'بحث...',
  ma: 'بحث...',
  dz: 'بحث...',
  ka: 'ძებნა...',
  hy: 'ՈՐՈՆԵԼ...',
  az: 'AXTAR...',
  ja: '検索...',
  zh: '搜索...',
}

export function getAdminMessages(locale: Locale): AdminMessages {
  return {
    ...EN,
    ...(BY_LOCALE[locale] ?? {}),
    'admin.searchPlaceholder': ADMIN_SEARCH_PLACEHOLDER[locale] ?? ADMIN_SEARCH_PLACEHOLDER.en,
  } as AdminMessages
}
