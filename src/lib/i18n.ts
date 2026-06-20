import { MESSAGES_DE } from '@/lib/i18n-de'
import { MESSAGES_ES } from '@/lib/i18n-es'
import { MESSAGES_FR } from '@/lib/i18n-fr'
import { MESSAGES_IT } from '@/lib/i18n-it'
import { MESSAGES_GR } from '@/lib/i18n-gr'
import { MESSAGES_PT } from '@/lib/i18n-pt'
import { MESSAGES_MA } from '@/lib/i18n-ma'
import { MESSAGES_DZ } from '@/lib/i18n-dz'
import { MESSAGES_CZ } from '@/lib/i18n-cz'
import { MESSAGES_PL } from '@/lib/i18n-pl'
import { MESSAGES_BG } from '@/lib/i18n-bg'
import { MESSAGES_HU } from '@/lib/i18n-hu'
import { MESSAGES_RO } from '@/lib/i18n-ro'
import { MESSAGES_TR } from '@/lib/i18n-tr'
import { MESSAGES_SR } from '@/lib/i18n-sr'
import { MESSAGES_SQ } from '@/lib/i18n-sq'
import { MESSAGES_DA } from '@/lib/i18n-da'
import { MESSAGES_FI } from '@/lib/i18n-fi'
import { MESSAGES_SK } from '@/lib/i18n-sk'
import { MESSAGES_BA } from '@/lib/i18n-ba'
import { MESSAGES_MK } from '@/lib/i18n-mk'
import { MESSAGES_SV } from '@/lib/i18n-sv'
import { MESSAGES_UK } from '@/lib/i18n-uk'
import { MESSAGES_HE } from '@/lib/i18n-he'
import { MESSAGES_HY } from '@/lib/i18n-hy'
import { MESSAGES_JA } from '@/lib/i18n-ja'
import { MESSAGES_HR } from '@/lib/i18n-hr'
import { MESSAGES_ME } from '@/lib/i18n-me'
import { MESSAGES_LT } from '@/lib/i18n-lt'
import { MESSAGES_NB } from '@/lib/i18n-nb'
import { MESSAGES_RU } from '@/lib/i18n-ru'
import { MESSAGES_AZ } from '@/lib/i18n-az'
import { MESSAGES_ZH } from '@/lib/i18n-zh'
import { MESSAGES_KA } from '@/lib/i18n-ka'
import { MESSAGES_EG } from '@/lib/i18n-eg'
import { MESSAGES_AT } from '@/lib/i18n-at'
import { MESSAGES_PS } from '@/lib/i18n-ps'
import type { Locale } from '@/lib/i18n-locale-registry'
import { DEFAULT_LOCALE } from '@/lib/i18n-locale-registry'
import { getGateMessages } from '@/lib/i18n-gate-messages'
import { getAccessOverlay } from '@/lib/i18n-access-overlay'
import { getProductTrashMessages } from '@/lib/i18n-product-trash'
import { getProductFormMessages } from '@/lib/i18n-product-form'
import { getAdminMessages } from '@/lib/i18n-admin'
import { getAdminPricelistPagesMessages } from '@/lib/i18n-admin-pricelist-pages'
import { getAdminUsersMessages } from '@/lib/i18n-admin-users'
import { getPricelistOutOfStockMessages } from '@/lib/i18n-pricelist-out-of-stock'
import { getPricelistBulkMessages } from '@/lib/i18n-pricelist-bulk'
import { getPricelistShippingSaveMessages } from '@/lib/i18n-pricelist-shipping-save'
import { getShopSoldOutMessages } from '@/lib/i18n-shop-sold-out'
import { getShopPreOrderMessages } from '@/lib/i18n-shop-pre-order'
import { getProductOptionMessages } from '@/lib/i18n-product-options'
import { getActivityOrderMessages } from '@/lib/i18n-activity-order'
import { getDashboardMessages } from '@/lib/i18n-dashboard'
import { getContactMessages } from '@/lib/i18n-contact'
import { getCategoryExtraMessages } from '@/lib/i18n-category-extra'

export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_REGISTRY,
  getLocaleMeta,
  getLocaleFlag,
  getLocaleNativeName,
  getLocaleSlug,
  localeFromSlug,
  isLocaleSlug,
  isLocale,
  type Locale,
} from '@/lib/i18n-locale-registry'

export { LOCALE_COOKIE, localizedPath, parseLocaleFromPathname } from '@/lib/i18n-routing'

type Messages = Record<string, string>

const MESSAGES: Partial<Record<Locale, Messages>> = {
  en: {
    // Shop / nav
    'nav.home': 'Home',
    'nav.new': 'New',
    'nav.categories': 'Categories',
    'nav.settings': 'Settings',
    'nav.becomeBuyer': 'Buy?',
    'nav.becomeSeller': 'Sell?',
    'nav.contact': 'Contact',
    'badge.catalog2026': 'Catalog 2026',
    'site.tagline': 'Catalog 2026',

    // Header / catalog pages
    'shop.home.title': 'WELCOME',
    'shop.home.searchPlaceholder': 'Search products...',
    'shop.pricelistBulk.label': 'Pricelist',
    'shop.pricelistBulk.addCategory': 'Add all {category} ({count}) to pricelist',
    'shop.pricelistBulk.addCategoryShort': 'Add all {category} to pricelist',
    'shop.pricelistBulk.addBrand': 'Add all {brand} ({count}) to pricelist',
    'shop.pricelistBulk.addBrandShort': 'Add all {brand} to pricelist',
    'shop.pricelistBulk.adding': 'Adding…',
    'shop.pricelistBulk.done': '{inserted} added to pricelist ({skipped} already on list)',
    'shop.pricelistBulk.failed': 'Failed to add to pricelist',
    'shop.pricelistBulk.viewPricelist': 'View pricelist',
    'shop.pricelistBulk.selectFilterHint': 'Filter by category or brand to bulk-add products.',
    'shop.new.title': 'New Arrivals',
    'shop.new.searchPlaceholder': 'Search new products...',
    'shop.new.metaTitle': 'New Arrivals',
    'shop.new.metaDescription': 'Products added to the catalog this week (Sunday through Sunday).',

    // Pagination
    'pagination.showing': 'Showing {start}–{end} of {total}{pagePart}',
    'pagination.pagePart': ' · page {page} of {totalPages}',
    'pagination.previous': 'Previous',
    'pagination.next': 'Next',
    'pagination.previousShort': 'Prev',
    'pagination.nextShort': 'Next',
    'pagination.pageLabel': 'Page',
    'pagination.go': 'Go',

    // Footer
    'footer.copyright': 'Super Clones © {year}',

    // Password gates (siteAccess.* also in i18n-gate-messages.ts overlay)
    'password.correctLoading': 'The password is correct! Loading...',

    // Loading / preloaders
    'loading.generic': 'Loading…',
    'loading.products': 'Loading products…',
    'loading.pricelist': 'Loading pricelist…',
    'loading.dashboard': 'Loading dashboard…',
    'loading.checking': 'Checking…',

    // Social proof bubble
    'activity.justOrderedPrefix': '{buyer} just ordered',
    'activity.time.justNow': 'just now',
    'activity.time.minuteAgo': '1 minute ago',
    'activity.time.minutesAgo': '{count} minutes ago',
    'activity.time.hourAgo': '1 hour ago',
    'activity.time.hoursAgo': '{count} hours ago',
    'activity.time.dayAgo': '1 day ago',
    'activity.time.daysAgo': '{count} days ago',

    // Language names
    'language.chooseTitle': 'Choose your language',
    'language.menu': 'Language',
    'language.close': 'Close',
    'language.en': 'English',
    'language.nl': 'Dutch',
    'language.es': 'Spanish',
    'language.fr': 'French',
    'language.de': 'German',
    'language.it': 'Italian',
    'language.pt': 'Portuguese',
    'language.gr': 'Greek',
    'language.tr': 'Turkish',
    'language.ma': 'Moroccan Arabic',
    'language.cz': 'Czech',
    'language.pl': 'Polish',
    'language.bg': 'Bulgarian',
    'language.hu': 'Hungarian',
    'language.ro': 'Romanian',

    // Categories
    'category.all': 'All',
    'category.clothes': 'Clothes',
    'category.kids': 'Kids',
    'category.shoes': 'Shoes',
    'category.slippers': 'Slippers',
    'category.sneakers': 'Sneakers',
    'category.soccer': 'Soccer',
    'category.watches': 'Watches',
    'category.glasses': 'Glasses',
    'category.perfumes': 'Perfumes',
    'category.bags': 'Bags',
    'category.wallets': 'Wallets',
    'category.bags-and-wallets': 'Bags and wallets',
    'category.tassen-en-portemonnees': 'Bags and wallets',

    // Product page
    'product.loading': 'Loading product…',
    'product.backToShop': 'Back to shop',
    'product.editProduct': 'Edit product',
    'product.noImage': 'No image',
    'product.breadcrumb': 'Breadcrumb',
    'product.images': 'Product images',
    'product.imageNOfM': 'Image {index} of {total}',
    'product.viewImageFullSize': 'View {name} image full size',
    'product.closeImage': 'Close image',
    'product.close': 'Close',
    'product.previousImage': 'Previous image',
    'product.nextImage': 'Next image',
    'product.meta.sku': 'SKU:',
    'product.meta.version': 'Version:',
    'product.priceOnRequest': 'Price on request',
    'product.instantDownload': 'Instant Download',
    'product.instantDownload.subtitle': 'Get your files immediately after purchase',
    'product.securePayment': 'Secure Payment',
    'product.securePayment.subtitle': 'SSL encrypted, secure checkout',
    'product.licenseType': 'License Type:',
    'product.license.standard': 'Standard License',
    'product.license.standard.desc': 'Use for 1 project',
    'product.license.extended': 'Extended License',
    'product.license.extended.desc': 'Use for multiple projects',
    'product.license.unlimited': 'Unlimited License',
    'product.license.unlimited.desc': 'Unlimited use',
    'product.addedToCart': '✓ Added to Cart',
    'product.quantityInCart': 'Quantity in cart: {count}',
    'product.viewCart': 'View Cart',
    'product.quantity': 'Quantity:',
    'product.addingToCart': 'Adding to Cart…',
    'product.addToCart': 'Add to Cart',
    'product.reviews': 'Reviews',
    'product.reviewsCount': '({count} reviews)',
    'product.downloads': '{count} downloads',
    'product.customerReviews': 'Customer Reviews',
    'product.noReviewsYet': 'There are no reviews for this product yet.',
    'product.select.sizeAndColor': 'Please select a size and color',
    'product.select.size': 'Please select a size',
    'product.select.color': 'Please select a color',
    'product.select.options': 'Please choose all product options',
    'product.option.choose': 'Choose an option',
    'product.option.clear': 'Clear',

    // Pricelist
    'pricelist.title': 'Pricelist',
    'pricelist.subtitle.platform': 'See my request(s) below!',
    'pricelist.owner.platform': 'Platform pricelist',
    'pricelist.owner.self': 'My pricelist',
    'pricelist.search.placeholder': 'Search by title or SKU…',
    'pricelist.search.aria': 'Search pricelist',
    'pricelist.selectOwner.aria': 'Select pricelist',
    'pricelist.view.table': 'Table',
    'pricelist.view.grid': 'Grid',
    'pricelist.guest.line1': 'Enter all prices in the empty fields below.',
    'pricelist.guest.line2':
      'Changes are automatically saved when you leave each field or tap the check button.',
    'pricelist.empty.none': 'No products on this pricelist yet.',
    'pricelist.empty.starHint': 'Use the star icon on product pages to add items.',
    'pricelist.empty.search': 'No products match your search.',
    'pricelist.empty.filters': 'No products match the selected filters.',
    'pricelist.filter.allCategories': 'All categories',
    'pricelist.filter.allBrands': 'All brands',
    'pricelist.filter.categoryAria': 'Filter by category',
    'pricelist.filter.brandAria': 'Filter by brand',
    'pricelist.filter.showMissingPrices': 'Missing ({count})',
    'pricelist.filter.showWithPrices': 'With price ({count})',
    'pricelist.filter.showOutOfStock': 'Out of stock ({count})',
    'pricelist.filter.showAllProducts': 'Show all products',
    'pricelist.filter.showAllProductsShort': 'All',
    'pricelist.export.download': 'Download',
    'pricelist.export.xls': 'Excel (.xlsx)',
    'pricelist.export.pdf': 'PDF (.pdf)',
    'pricelist.export.exporting': 'Exporting…',
    'pricelist.export.sheetName': 'Pricelist',
    'pricelist.export.pdfTitle': 'Pricelist — {owner}',
    'pricelist.empty.missingPrices': 'All products on this list already have a price and shipping cost.',
    'pricelist.col.image': 'Image',
    'pricelist.col.title': 'Title',
    'pricelist.col.sku': 'SKU',
    'pricelist.col.category': 'Category',
    'pricelist.col.brand': 'Brand',
    'pricelist.col.shippingCost': 'Shipping',
    'pricelist.saveShipping': 'Save shipping cost',
    'pricelist.saveShippingFor': 'Shipping cost for {name}',
    'pricelist.col.price': 'Price',
    'pricelist.col.starAria': 'Pricelist',
    'pricelist.remove': 'Remove',
    'pricelist.savePrice': 'Save price',
    'pricelist.savePriceFor': 'Price for {name}',
    'pricelist.outOfStock': 'Out of stock',
    'pricelist.temporarilyOutOfStock': 'Temporarily out of stock',
    'pricelist.stockStatusAria': 'Stock status',
    'pricelist.stockStatusSetPrice': 'Set price',
    'pricelist.pricePlaceholder': '0.00',
    'pricelist.error.invalidPrice': 'Invalid price',
    'pricelist.error.clearFailed': 'Clear failed',
    'pricelist.error.saveFailed': 'Save failed',
    'pricelist.error.requestFailed': 'Request failed',
    'pricelist.error.approveFailed': 'Approve failed',
    'pricelist.error.onlySuperAdminClear': 'Only super admin can clear a price',
    'pricelist.editRequestedBy': 'Edit requested by {seller}',
    'pricelist.markHandled': 'Mark handled ({seller})',
    'pricelist.markHandledTitle': 'Mark edit request from {seller} as handled',
    'pricelist.saving': 'Saving…',
    'pricelist.sending': 'Sending…',
    'pricelist.editRequestedAdmin': 'Edit requested — admin will update',
    'pricelist.requestEdit': 'Request edit',
    'pricelist.share.titlePlatform': 'Platform share password',
    'pricelist.share.title': 'Share password',
    'pricelist.share.active': 'Active',
    'pricelist.share.hintPlatform':
      'Guests use this password at the link below (not your site login).',
    'pricelist.share.hintOwner':
      'Guests need this password at your link (not site login). Empty + save = sign-in only.',
    'pricelist.share.newPassword': 'New password',
    'pricelist.share.setPassword': 'Set password',
    'pricelist.share.update': 'Update',
    'pricelist.share.set': 'Set',
    'pricelist.share.saved': 'Password saved.',
    'pricelist.share.removed': 'Password removed.',
    'pricelist.share.linkLabel': 'Share link',
    'pricelist.share.copy': 'Copy',
    'pricelist.share.copied': 'Copied',
    'pricelist.share.copyTitle': 'Click to copy link',
    'pricelist.share.copyError': 'Could not copy link',
    'pricelist.access.noPassword':
      'This list does not have a share password yet. Sign in if you have access, or ask the owner for the link once a password is set.',
    'pricelist.access.passwordLabel': 'Pricelist share password',
    'pricelist.access.passwordPlaceholder': 'Pricelist password',
    'pricelist.access.remember': 'Remember on this device (30 days)',
    'pricelist.access.viewPricelist': 'View pricelist',
    'pricelist.access.loginRequired':
      'Sign in to view this pricelist, or open a shared link with ?owner= (use owner=platform for the platform list).',
    'pricelist.access.denied': 'You do not have access to this pricelist.',
    'pricelist.access.signIn': 'Sign in to your account',
    'pricelist.access.backToShop': 'Back to shop',
    'pricelist.access.verifyFailed': 'Unable to verify. Try again.',
    'pricelist.access.incorrectPassword': 'Incorrect pricelist password',
    'pricelist.access.checkAccessFailed': 'Unable to check access',

    // Chat (self-hosted)
    'chat.title': 'Live chat',
    'chat.subtitle': 'Ask a question or request a quote.',
    'chat.loading': 'Connecting…',
    'chat.ready': 'Connected. (Message UI will appear in the next step.)',
    'chat.notAvailable': 'Chat is not available for this account.',
    'chat.v1Hint': 'Tip: Click “Price on request” on a product to request a quote.',
  },
  nl: {
    // Shop / nav
    'nav.home': 'Home',
    'nav.new': 'Nieuw',
    'nav.categories': 'Categorieën',
    'nav.settings': 'Instellingen',
    'nav.becomeBuyer': 'Kopen?',
    'nav.becomeSeller': 'Verkopen?',
    'nav.contact': 'Contact',
    'badge.catalog2026': 'Catalogus 2026',
    'site.tagline': 'Catalogus 2026',

    // Header / catalog pages
    'shop.home.title': 'WELKOM',
    'shop.home.searchPlaceholder': 'Zoek producten...',
    'shop.pricelistBulk.label': 'Prijslijst',
    'shop.pricelistBulk.addCategory': 'Voeg alle {category} ({count}) toe aan prijslijst',
    'shop.pricelistBulk.addCategoryShort': 'Voeg alle {category} toe aan prijslijst',
    'shop.pricelistBulk.addBrand': 'Voeg alle {brand} ({count}) toe aan prijslijst',
    'shop.pricelistBulk.addBrandShort': 'Voeg alle {brand} toe aan prijslijst',
    'shop.pricelistBulk.adding': 'Toevoegen…',
    'shop.pricelistBulk.done': '{inserted} toegevoegd aan prijslijst ({skipped} stonden er al op)',
    'shop.pricelistBulk.failed': 'Toevoegen aan prijslijst mislukt',
    'shop.pricelistBulk.viewPricelist': 'Bekijk prijslijst',
    'shop.pricelistBulk.selectFilterHint': 'Filter op categorie of merk om producten bulk toe te voegen.',
    'shop.new.title': 'Nieuw binnen',
    'shop.new.searchPlaceholder': 'Zoek nieuwe producten...',
    'shop.new.metaTitle': 'Nieuw binnen',
    'shop.new.metaDescription': 'Producten die deze week zijn toegevoegd (zondag t/m zondag).',

    // Pagination
    'pagination.showing': 'Toont {start}–{end} van {total}{pagePart}',
    'pagination.pagePart': ' · pagina {page} van {totalPages}',
    'pagination.previous': 'Vorige',
    'pagination.next': 'Volgende',
    'pagination.previousShort': 'Vorige',
    'pagination.nextShort': 'Volgende',
    'pagination.pageLabel': 'Pagina',
    'pagination.go': 'Ga',

    // Footer
    'footer.copyright': 'Super Clones © {year}',

    // Password gates
    'password.correctLoading': 'Het wachtwoord is correct! Aan het laden...',

    // Loading / preloaders
    'loading.generic': 'Aan het laden…',
    'loading.products': 'Producten laden…',
    'loading.pricelist': 'Prijslijst laden…',
    'loading.dashboard': 'Dashboard laden…',
    'loading.checking': 'Controleren…',

    // Social proof bubble
    'activity.justOrderedPrefix': '{buyer} heeft zojuist besteld',
    'activity.time.justNow': 'zojuist',
    'activity.time.minuteAgo': '1 minuut geleden',
    'activity.time.minutesAgo': '{count} minuten geleden',
    'activity.time.hourAgo': '1 uur geleden',
    'activity.time.hoursAgo': '{count} uur geleden',
    'activity.time.dayAgo': '1 dag geleden',
    'activity.time.daysAgo': '{count} dagen geleden',

    // Language names
    'language.chooseTitle': 'Kies uw taal',
    'language.menu': 'Taal',
    'language.close': 'Sluiten',
    'language.en': 'Engels',
    'language.nl': 'Nederlands',
    'language.es': 'Spaans',
    'language.fr': 'Frans',
    'language.de': 'Duits',
    'language.it': 'Italiaans',
    'language.pt': 'Portugees',
    'language.gr': 'Grieks',
    'language.tr': 'Turks',
    'language.ma': 'Marokkaans-Arabisch',
    'language.cz': 'Tsjechisch',
    'language.pl': 'Pools',
    'language.bg': 'Bulgaars',
    'language.hu': 'Hongaars',
    'language.ro': 'Roemeens',

    // Categories
    'category.all': 'Alle',
    'category.clothes': 'Kleding',
    'category.kids': 'Kinderen',
    'category.shoes': 'Schoenen',
    'category.slippers': 'Slippers',
    'category.sneakers': 'Sneakers',
    'category.soccer': 'Voetbal',
    'category.watches': 'Horloges',
    'category.glasses': 'Brillen',
    'category.perfumes': 'Parfums',
    'category.bags': 'Tassen',
    'category.wallets': 'Portemonnees',
    'category.bags-and-wallets': 'Tassen en portemonnees',
    'category.tassen-en-portemonnees': 'Tassen en portemonnees',

    // Product page
    'product.loading': 'Product laden…',
    'product.backToShop': 'Terug naar de shop',
    'product.editProduct': 'Product bewerken',
    'product.noImage': 'Geen afbeelding',
    'product.breadcrumb': 'Breadcrumb',
    'product.images': 'Productafbeeldingen',
    'product.imageNOfM': 'Afbeelding {index} van {total}',
    'product.viewImageFullSize': 'Bekijk afbeelding van {name} op volledig formaat',
    'product.closeImage': 'Afbeelding sluiten',
    'product.close': 'Sluiten',
    'product.previousImage': 'Vorige afbeelding',
    'product.nextImage': 'Volgende afbeelding',
    'product.meta.sku': 'SKU:',
    'product.meta.version': 'Versie:',
    'product.priceOnRequest': 'Prijs op aanvraag',
    'product.instantDownload': 'Direct downloaden',
    'product.instantDownload.subtitle': 'Ontvang uw bestanden direct na aankoop',
    'product.securePayment': 'Veilige betaling',
    'product.securePayment.subtitle': 'SSL versleuteld, veilig afrekenen',
    'product.licenseType': 'Licentietype:',
    'product.license.standard': 'Standaard licentie',
    'product.license.standard.desc': 'Gebruik voor 1 project',
    'product.license.extended': 'Uitgebreide licentie',
    'product.license.extended.desc': 'Gebruik voor meerdere projecten',
    'product.license.unlimited': 'Onbeperkte licentie',
    'product.license.unlimited.desc': 'Onbeperkt gebruik',
    'product.addedToCart': '✓ Toegevoegd aan winkelwagen',
    'product.quantityInCart': 'Aantal in winkelwagen: {count}',
    'product.viewCart': 'Bekijk winkelwagen',
    'product.quantity': 'Aantal:',
    'product.addingToCart': 'Toevoegen aan winkelwagen…',
    'product.addToCart': 'In winkelwagen',
    'product.reviews': 'Reviews',
    'product.reviewsCount': '({count} reviews)',
    'product.downloads': '{count} downloads',
    'product.customerReviews': 'Klantreviews',
    'product.noReviewsYet': 'Er zijn nog geen reviews voor dit product.',
    'product.select.sizeAndColor': 'Selecteer een maat en kleur',
    'product.select.size': 'Selecteer een maat',
    'product.select.color': 'Selecteer een kleur',
    'product.select.options': 'Kies alle productopties',
    'product.option.choose': 'Kies een optie',
    'product.option.clear': 'Wissen',

    // Pricelist
    'pricelist.title': 'Prijslijst',
    'pricelist.subtitle.platform': 'Zie hieronder mijn aanvraag(en)!',
    'pricelist.owner.platform': 'Platform prijslijst',
    'pricelist.owner.self': 'Mijn prijslijst',
    'pricelist.search.placeholder': 'Zoek op titel of SKU…',
    'pricelist.search.aria': 'Prijslijst doorzoeken',
    'pricelist.selectOwner.aria': 'Prijslijst kiezen',
    'pricelist.view.table': 'Tabel',
    'pricelist.view.grid': 'Raster',
    'pricelist.guest.line1': 'Vul alle prijzen in de lege velden hieronder in.',
    'pricelist.guest.line2':
      'Wijzigingen worden automatisch opgeslagen wanneer u een veld verlaat of op het vinkje tikt.',
    'pricelist.empty.none': 'Nog geen producten op deze prijslijst.',
    'pricelist.empty.starHint': 'Gebruik het ster-icoon op productpagina’s om items toe te voegen.',
    'pricelist.empty.search': 'Geen producten gevonden voor uw zoekopdracht.',
    'pricelist.empty.filters': 'Geen producten voor de gekozen filters.',
    'pricelist.filter.allCategories': 'Alle categorieën',
    'pricelist.filter.allBrands': 'Alle merken',
    'pricelist.filter.categoryAria': 'Filter op categorie',
    'pricelist.filter.brandAria': 'Filter op merk',
    'pricelist.filter.showMissingPrices': 'Ontbrekend ({count})',
    'pricelist.filter.showWithPrices': 'Met prijs ({count})',
    'pricelist.filter.showOutOfStock': 'Uitverkocht ({count})',
    'pricelist.filter.showAllProducts': 'Toon alle producten',
    'pricelist.filter.showAllProductsShort': 'Alle',
    'pricelist.export.download': 'Downloaden',
    'pricelist.export.xls': 'Excel (.xlsx)',
    'pricelist.export.pdf': 'PDF (.pdf)',
    'pricelist.export.exporting': 'Exporteren…',
    'pricelist.export.sheetName': 'Prijslijst',
    'pricelist.export.pdfTitle': 'Prijslijst — {owner}',
    'pricelist.empty.missingPrices': 'Alle producten op deze lijst hebben al een prijs en verzendkosten.',
    'pricelist.col.image': 'Afbeelding',
    'pricelist.col.title': 'Titel',
    'pricelist.col.sku': 'SKU',
    'pricelist.col.category': 'Categorie',
    'pricelist.col.brand': 'Merk',
    'pricelist.col.shippingCost': 'Verzenden',
    'pricelist.saveShipping': 'Verzendkosten opslaan',
    'pricelist.saveShippingFor': 'Verzendkosten voor {name}',
    'pricelist.col.price': 'Prijs',
    'pricelist.col.starAria': 'Prijslijst',
    'pricelist.remove': 'Verwijderen',
    'pricelist.savePrice': 'Prijs opslaan',
    'pricelist.savePriceFor': 'Prijs voor {name}',
    'pricelist.outOfStock': 'Uitverkocht',
    'pricelist.temporarilyOutOfStock': 'Tijdelijk uitverkocht',
    'pricelist.stockStatusAria': 'Voorraadstatus',
    'pricelist.stockStatusSetPrice': 'Prijs invoeren',
    'pricelist.pricePlaceholder': '0,00',
    'pricelist.error.invalidPrice': 'Ongeldige prijs',
    'pricelist.error.clearFailed': 'Wissen mislukt',
    'pricelist.error.saveFailed': 'Opslaan mislukt',
    'pricelist.error.requestFailed': 'Aanvraag mislukt',
    'pricelist.error.approveFailed': 'Goedkeuren mislukt',
    'pricelist.error.onlySuperAdminClear': 'Alleen super admin kan een prijs wissen',
    'pricelist.editRequestedBy': 'Bewerking aangevraagd door {seller}',
    'pricelist.markHandled': 'Afgehandeld ({seller})',
    'pricelist.markHandledTitle': 'Bewerkingsverzoek van {seller} als afgehandeld markeren',
    'pricelist.saving': 'Opslaan…',
    'pricelist.sending': 'Verzenden…',
    'pricelist.editRequestedAdmin': 'Bewerking aangevraagd — admin past aan',
    'pricelist.requestEdit': 'Bewerking aanvragen',
    'pricelist.share.titlePlatform': 'Platform deelwachtwoord',
    'pricelist.share.title': 'Deelwachtwoord',
    'pricelist.share.active': 'Actief',
    'pricelist.share.hintPlatform':
      'Gasten gebruiken dit wachtwoord via de link hieronder (niet uw site-inlog).',
    'pricelist.share.hintOwner':
      'Gasten hebben dit wachtwoord nodig via uw link (niet site-inlog). Leeg + opslaan = alleen inloggen.',
    'pricelist.share.newPassword': 'Nieuw wachtwoord',
    'pricelist.share.setPassword': 'Wachtwoord instellen',
    'pricelist.share.update': 'Bijwerken',
    'pricelist.share.set': 'Instellen',
    'pricelist.share.saved': 'Wachtwoord opgeslagen.',
    'pricelist.share.removed': 'Wachtwoord verwijderd.',
    'pricelist.share.linkLabel': 'Deellink',
    'pricelist.share.copy': 'Kopiëren',
    'pricelist.share.copied': 'Gekopieerd',
    'pricelist.share.copyTitle': 'Klik om link te kopiëren',
    'pricelist.share.copyError': 'Link kopiëren mislukt',
    'pricelist.access.noPassword':
      'Deze lijst heeft nog geen deelwachtwoord. Log in als u toegang heeft, of vraag de eigenaar om de link zodra een wachtwoord is ingesteld.',
    'pricelist.access.passwordLabel': 'Prijslijst-deelwachtwoord',
    'pricelist.access.passwordPlaceholder': 'Prijslijst-wachtwoord',
    'pricelist.access.remember': 'Onthouden op dit apparaat (30 dagen)',
    'pricelist.access.viewPricelist': 'Prijslijst bekijken',
    'pricelist.access.loginRequired':
      'Log in om deze prijslijst te bekijken.',
    'pricelist.access.denied': 'U heeft geen toegang tot deze prijslijst.',
    'pricelist.access.signIn': 'Inloggen op uw account',
    'pricelist.access.backToShop': 'Terug naar de shop',
    'pricelist.access.verifyFailed': 'Verificatie mislukt. Probeer opnieuw.',
    'pricelist.access.incorrectPassword': 'Onjuist prijslijstwachtwoord',
    'pricelist.access.checkAccessFailed': 'Toegang kan niet worden gecontroleerd',

    // Chat (self-hosted)
    'chat.title': 'Live chat',
    'chat.subtitle': 'Stel een vraag of vraag een offerte aan.',
    'chat.loading': 'Verbinden…',
    'chat.ready': 'Verbonden. (Berichten komen in de volgende stap.)',
    'chat.notAvailable': 'Chat is niet beschikbaar voor dit account.',
    'chat.v1Hint': 'Tip: Klik “Prijs op aanvraag” bij een product om een offerte aan te vragen.',
  },
  es: MESSAGES_ES,
  fr: MESSAGES_FR,
  de: MESSAGES_DE,
  it: MESSAGES_IT,
  pt: MESSAGES_PT,
  gr: MESSAGES_GR,
  tr: MESSAGES_TR,
  ma: MESSAGES_MA,
  dz: MESSAGES_DZ,
  cz: MESSAGES_CZ,
  pl: MESSAGES_PL,
  bg: MESSAGES_BG,
  hu: MESSAGES_HU,
  ro: MESSAGES_RO,
  sr: MESSAGES_SR,
  sq: MESSAGES_SQ,
  da: MESSAGES_DA,
  fi: MESSAGES_FI,
  sk: MESSAGES_SK,
  ba: MESSAGES_BA,
  mk: MESSAGES_MK,
  sv: MESSAGES_SV,
  uk: MESSAGES_UK,
  he: MESSAGES_HE,
  hy: MESSAGES_HY,
  ja: MESSAGES_JA,
  hr: MESSAGES_HR,
  me: MESSAGES_ME,
  lt: MESSAGES_LT,
  nb: MESSAGES_NB,
  ru: MESSAGES_RU,
  az: MESSAGES_AZ,
  zh: MESSAGES_ZH,
  ka: MESSAGES_KA,
  eg: MESSAGES_EG,
  at: MESSAGES_AT,
  ps: MESSAGES_PS,
}

export function getMessages(locale: Locale): Messages {
  const en = MESSAGES.en ?? {}
  const bundle = MESSAGES[locale] ?? {}
  return {
    ...en,
    ...bundle,
    ...getGateMessages(locale),
    ...getAccessOverlay(locale),
    ...getProductTrashMessages(locale),
    ...getProductFormMessages(locale),
    ...getAdminMessages(locale),
    ...getAdminPricelistPagesMessages(locale),
    ...getAdminUsersMessages(locale),
    ...getPricelistOutOfStockMessages(locale),
    ...getPricelistBulkMessages(locale),
    ...getPricelistShippingSaveMessages(locale),
    ...getShopSoldOutMessages(locale),
    ...getShopPreOrderMessages(locale),
    ...getProductOptionMessages(locale),
    ...getActivityOrderMessages(locale),
    ...getDashboardMessages(locale),
    ...getContactMessages(locale),
    ...getCategoryExtraMessages(locale),
  }
}

export function formatMessage(
  template: string,
  values?: Record<string, string | number | null | undefined>
): string {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = values[key]
    return v === null || v === undefined ? '' : String(v)
  })
}

