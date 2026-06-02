export const SUPPORTED_LOCALES = ['nl', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'nl'

export const LOCALE_COOKIE = 'catalogus_locale'

type Messages = Record<string, string>

export const MESSAGES: Record<Locale, Messages> = {
  en: {
    // Shop / nav
    'nav.home': 'Home',
    'nav.new': 'New',
    'nav.categories': 'Categories',
    'nav.settings': 'Settings',
    'nav.becomeBuyer': 'BUY ?',
    'nav.becomeSeller': 'SELL ?',
    'nav.contact': 'Contact',
    'badge.catalog2026': 'Catalog 2026',

    // Header / catalog pages
    'shop.home.title': 'WELCOME',
    'shop.home.searchPlaceholder': 'Search products...',
    'shop.new.title': 'New Arrivals',
    'shop.new.searchPlaceholder': 'Search new products...',
    'shop.new.metaTitle': 'New Arrivals',
    'shop.new.metaDescription': 'Products added to the catalog this week (Sunday through Sunday).',

    // Pagination
    'pagination.showing': 'Showing {start}–{end} of {total}{pagePart}',
    'pagination.pagePart': ' · page {page} of {totalPages}',
    'pagination.previous': 'Previous',
    'pagination.next': 'Next',
    'pagination.pageLabel': 'Page',
    'pagination.go': 'Go',

    // Footer
    'footer.copyright': 'Super Clones © {year}',

    // Password gates
    'password.correctLoading': 'The password is correct! Loading...',

    // Loading / preloaders
    'loading.generic': 'Loading…',
    'loading.products': 'Loading products…',
    'loading.pricelist': 'Loading pricelist…',
    'loading.dashboard': 'Loading dashboard…',
    'loading.checking': 'Checking…',

    // Social proof bubble
    'activity.justOrderedPrefix': '{buyer} just ordered ',
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

    // Categories
    'category.all': 'All',
    'category.clothes': 'Clothes',
    'category.kids': 'Kids',
    'category.shoes': 'Shoes',
    'category.slippers': 'Slippers',
    'category.sneakers': 'Sneakers',
    'category.soccer': 'Soccer',
    'category.watches': 'Watches',

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
    'product.noReviewsYet': 'No reviews for this product yet.',
    'product.select.sizeAndColor': 'Please select a size and color',
    'product.select.size': 'Please select a size',
    'product.select.color': 'Please select a color',
  },
  nl: {
    // Shop / nav
    'nav.home': 'Home',
    'nav.new': 'Nieuw',
    'nav.categories': 'Categorieën',
    'nav.settings': 'Instellingen',
    'nav.becomeBuyer': 'KOPEN ?',
    'nav.becomeSeller': 'VERKOPEN ?',
    'nav.contact': 'Contact',
    'badge.catalog2026': 'Catalogus 2026',

    // Header / catalog pages
    'shop.home.title': 'WELKOM',
    'shop.home.searchPlaceholder': 'Zoek producten...',
    'shop.new.title': 'Nieuw binnen',
    'shop.new.searchPlaceholder': 'Zoek nieuwe producten...',
    'shop.new.metaTitle': 'Nieuw binnen',
    'shop.new.metaDescription': 'Producten die deze week zijn toegevoegd (zondag t/m zondag).',

    // Pagination
    'pagination.showing': 'Toont {start}–{end} van {total}{pagePart}',
    'pagination.pagePart': ' · pagina {page} van {totalPages}',
    'pagination.previous': 'Vorige',
    'pagination.next': 'Volgende',
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
    'activity.justOrderedPrefix': '{buyer} heeft zojuist besteld: ',
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

    // Categories
    'category.all': 'Alle',
    'category.clothes': 'Kleding',
    'category.kids': 'Kinderen',
    'category.shoes': 'Schoenen',
    'category.slippers': 'Slippers',
    'category.sneakers': 'Sneakers',
    'category.soccer': 'Voetbal',
    'category.watches': 'Horloges',

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
    'product.noReviewsYet': 'Nog geen reviews voor dit product.',
    'product.select.sizeAndColor': 'Selecteer een maat en kleur',
    'product.select.size': 'Selecteer een maat',
    'product.select.color': 'Selecteer een kleur',
  },
}

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value) && (SUPPORTED_LOCALES as readonly string[]).includes(String(value))
}

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE]
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

