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
    'nav.becomeBuyer': 'Become a Buyer',
    'nav.becomeSeller': 'Become a Seller',
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
    'language.close': 'Close',
    'language.en': 'English',
    'language.nl': 'Dutch',
  },
  nl: {
    // Shop / nav
    'nav.home': 'Home',
    'nav.new': 'Nieuw',
    'nav.categories': 'Categorieën',
    'nav.settings': 'Instellingen',
    'nav.becomeBuyer': 'Word koper',
    'nav.becomeSeller': 'Word verkoper',
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
    'language.close': 'Sluiten',
    'language.en': 'Engels',
    'language.nl': 'Nederlands',
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

