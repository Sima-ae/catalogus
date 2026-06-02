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
    'pricelist.col.image': 'Image',
    'pricelist.col.title': 'Title',
    'pricelist.col.sku': 'SKU',
    'pricelist.col.category': 'Category',
    'pricelist.col.brand': 'Brand',
    'pricelist.col.price': 'Price',
    'pricelist.col.starAria': 'Pricelist',
    'pricelist.remove': 'Remove',
    'pricelist.savePrice': 'Save price',
    'pricelist.savePriceFor': 'Price for {name}',
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
    'pricelist.access.hintPlatform':
      'Enter the platform pricelist share password (not your site or account password).',
    'pricelist.access.hintOwner':
      'Enter the pricelist share password from the list owner (not your site or account password).',
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
    'pricelist.col.image': 'Afbeelding',
    'pricelist.col.title': 'Titel',
    'pricelist.col.sku': 'SKU',
    'pricelist.col.category': 'Categorie',
    'pricelist.col.brand': 'Merk',
    'pricelist.col.price': 'Prijs',
    'pricelist.col.starAria': 'Prijslijst',
    'pricelist.remove': 'Verwijderen',
    'pricelist.savePrice': 'Prijs opslaan',
    'pricelist.savePriceFor': 'Prijs voor {name}',
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
    'pricelist.access.hintPlatform':
      'Voer het platform prijslijst-deelwachtwoord in (niet uw site- of accountwachtwoord).',
    'pricelist.access.hintOwner':
      'Voer het prijslijst-deelwachtwoord van de eigenaar in (niet uw site- of accountwachtwoord).',
    'pricelist.access.noPassword':
      'Deze lijst heeft nog geen deelwachtwoord. Log in als u toegang heeft, of vraag de eigenaar om de link zodra een wachtwoord is ingesteld.',
    'pricelist.access.passwordLabel': 'Prijslijst-deelwachtwoord',
    'pricelist.access.passwordPlaceholder': 'Prijslijst-wachtwoord',
    'pricelist.access.remember': 'Onthouden op dit apparaat (30 dagen)',
    'pricelist.access.viewPricelist': 'Prijslijst bekijken',
    'pricelist.access.loginRequired':
      'Log in om deze prijslijst te bekijken, of open een gedeelde link met ?owner= (gebruik owner=platform voor de platformlijst).',
    'pricelist.access.denied': 'U heeft geen toegang tot deze prijslijst.',
    'pricelist.access.signIn': 'Inloggen op uw account',
    'pricelist.access.backToShop': 'Terug naar de shop',
    'pricelist.access.verifyFailed': 'Verificatie mislukt. Probeer opnieuw.',
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

