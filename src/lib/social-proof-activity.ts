export type SocialProofProduct = {
  label: string
  imageUrl: string | null
  category?: string
}

export type StoredSocialProofNotification = {
  buyerName: string
  productName: string
  productImageUrl?: string | null
  /** Fixed moment the fictional purchase happened — relative label ages automatically. */
  purchasedAt: string
}

const DUTCH_MALE_NAMES = [
  'Daan',
  'Sem',
  'Lucas',
  'Finn',
  'Levi',
  'Jesse',
  'Luuk',
  'Bram',
  'Stijn',
  'Thijs',
  'Ruben',
  'Milan',
  'Mees',
  'Guus',
  'Floris',
  'Teun',
  'Olivier',
  'Victor',
  'Jasper',
  'Sven',
  'Bas',
  'Kai',
  'Noud',
  'Tim',
  'Tom',
  'Lars',
  'Max',
  'Noah',
  'Jan',
  'Pieter',
  'Maarten',
  'Jeroen',
  'Bart',
  'Arjan',
  'Sander',
  'Rick',
  'Roy',
  'Dennis',
  'Kevin',
  'Patrick',
  'Mark',
  'Peter',
  'Henk',
  'Erik',
  'Martijn',
  'Wesley',
  'Jeffrey',
  'Marco',
  'Stefan',
  'Robert',
  'Frank',
  'Kees',
  'Wim',
] as const

const DUTCH_FEMALE_NAMES = [
  'Femke',
  'Emma',
  'Sophie',
  'Julia',
  'Anna',
  'Eva',
  'Lisa',
  'Sara',
  'Sanne',
  'Fleur',
  'Roos',
  'Isa',
  'Lynn',
  'Noa',
  'Lieke',
  'Mila',
  'Nora',
  'Lotte',
  'Fenna',
  'Demi',
  'Amber',
  'Kim',
  'Laura',
  'Michelle',
  'Melanie',
  'Sandra',
  'Linda',
  'Nicole',
  'Manon',
  'Anouk',
  'Britt',
  'Floor',
  'Puck',
  'Sterre',
  'Veerle',
  'Yara',
  'Dewi',
  'Marloes',
  'Ilse',
  'Inge',
  'Mirjam',
  'Renske',
  'Tessa',
  'Charlotte',
  'Iris',
  'Naomi',
] as const

const INTERNATIONAL_MALE_NAMES = [
  'Mehmet',
  'Ahmet',
  'Mustafa',
  'Emre',
  'Burak',
  'Cem',
  'Deniz',
  'Hakan',
  'Can',
  'Mohammed',
  'Youssef',
  'Hamza',
  'Karim',
  'Rachid',
  'Amine',
  'Omar',
  'Marco',
  'Luca',
  'Giuseppe',
  'Giovanni',
  'Alessandro',
  'Matteo',
  'Lorenzo',
  'Pierre',
  'Jean',
  'Louis',
  'Julien',
  'Nicolas',
  'Antoine',
  'Carlos',
  'Javier',
  'Miguel',
  'Pablo',
  'Diego',
  'Sergio',
  'Klaus',
  'Markus',
  'Felix',
  'Lukas',
  'Jonas',
  'Tobias',
  'Piotr',
  'Tomasz',
  'João',
  'Nikos',
  'James',
  'Michael',
  'Daniel',
  'William',
] as const

const INTERNATIONAL_FEMALE_NAMES = [
  'Ayşe',
  'Fatma',
  'Elif',
  'Zeynep',
  'Emine',
  'Özge',
  'Salma',
  'Imane',
  'Safaa',
  'Nadia',
  'Yasmina',
  'Francesca',
  'Giulia',
  'Chiara',
  'Sofia',
  'Valentina',
  'Marie',
  'Camille',
  'Chloé',
  'Léa',
  'Claire',
  'Ana',
  'María',
  'Carmen',
  'Lucía',
  'Elena',
  'Hannah',
  'Lena',
  'Greta',
  'Katrin',
  'Heike',
  'Kasia',
  'Magda',
  'Ania',
  'Eleni',
  'Emily',
  'Sarah',
  'Rebecca',
  'Grace',
] as const

/** ~70% male / ~30% female — catalog skews men’s products. */
const MALE_NAME_WEIGHT = 0.7
/** ~65% Dutch / ~35% international. */
const DUTCH_NAME_WEIGHT = 0.65

function pickFromPool(pool: readonly string[]): string {
  return pool[Math.floor(Math.random() * pool.length)]!
}

function randomBuyerName(): string {
  const isMale = Math.random() < MALE_NAME_WEIGHT
  const isDutch = Math.random() < DUTCH_NAME_WEIGHT

  if (isDutch) {
    return pickFromPool(isMale ? DUTCH_MALE_NAMES : DUTCH_FEMALE_NAMES)
  }
  return pickFromPool(isMale ? INTERNATIONAL_MALE_NAMES : INTERNATIONAL_FEMALE_NAMES)
}

function allBuyerNameCount(): number {
  return (
    DUTCH_MALE_NAMES.length +
    DUTCH_FEMALE_NAMES.length +
    INTERNATIONAL_MALE_NAMES.length +
    INTERNATIONAL_FEMALE_NAMES.length
  )
}

const DAILY_CACHE_KEY = 'catalogus-social-proof-daily-v8'
const PREVIOUS_DAYS_KEY = 'catalogus-social-proof-previous-days'
const DEFAULT_COUNT = 12
/** Remember a few recent days for soft de-dupe; older lines can return anytime. */
const MAX_RECENT_DAYS_MEMORY = 7

type DailySocialProofCache = {
  date: string
  notifications: StoredSocialProofNotification[]
}

type PreviousDaysStore = {
  days: { date: string; signatures: string[] }[]
}

export function messageSignature(buyerName: string, productName: string): string {
  return `${buyerName.trim().toLowerCase()}\0${productName.trim().toLowerCase()}`
}

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function minutesSince(isoOrDate: string | Date): number {
  const then = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  const ms = Date.now() - then.getTime()
  if (!Number.isFinite(ms) || ms < 0) return 0
  return Math.floor(ms / 60_000)
}

export function formatMinutesAgo(minutes: number): string {
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 minute ago'
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const MS_MINUTE = 60_000
const MS_HOUR = 60 * MS_MINUTE
const MS_DAY = 24 * MS_HOUR
const MAX_PURCHASE_DAYS_AGO = 6

/**
 * Random fictional purchase age — from “just now” up to 6 days ago.
 * Mixes minutes, hours, and whole-day offsets (e.g. 2 or 4 days ago).
 */
function pickPurchaseTimeAgoMs(): number {
  const roll = Math.random()
  if (roll < 0.14) {
    return Math.random() * 4 * MS_MINUTE
  }
  if (roll < 0.34) {
    return (4 + Math.random() * 52) * MS_MINUTE
  }
  if (roll < 0.54) {
    return (1 + Math.random() * 14) * MS_HOUR
  }
  const days = 1 + Math.floor(Math.random() * MAX_PURCHASE_DAYS_AGO)
  const dayStartAgo = days * MS_DAY
  const jitterWithinDay = Math.random() * MS_DAY * 0.85
  return dayStartAgo - jitterWithinDay + Math.random() * MS_HOUR
}

function assignPurchaseTimes(count: number, now = Date.now()): string[] {
  const times = Array.from({ length: count }, () =>
    new Date(now - pickPurchaseTimeAgoMs()).toISOString()
  )
  return times.sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )
}

function productCategoryKey(product: SocialProofProduct): string {
  const category = product.category?.trim()
  return category ? category.toLowerCase() : 'other'
}

/** Round-robin across categories so the feed mixes shoes, bags, watches, etc. */
function interleaveProductsByCategory(products: SocialProofProduct[]): SocialProofProduct[] {
  const buckets = new Map<string, SocialProofProduct[]>()
  for (const product of products) {
    const key = productCategoryKey(product)
    const list = buckets.get(key) ?? []
    list.push(product)
    buckets.set(key, list)
  }

  const categoryOrder = shuffle(Array.from(buckets.keys()))
  for (const key of categoryOrder) {
    buckets.set(key, shuffle(buckets.get(key)!))
  }

  const out: SocialProofProduct[] = []
  let round = 0
  const maxRounds = Math.max(...Array.from(buckets.values()).map((b) => b.length), 0)

  while (round < maxRounds) {
    for (const key of categoryOrder) {
      const bucket = buckets.get(key)!
      if (round < bucket.length) out.push(bucket[round]!)
    }
    round++
  }

  return out.length > 0 ? out : shuffle(products)
}

function pickRandomProduct(pool: SocialProofProduct[]): SocialProofProduct {
  return pool[Math.floor(Math.random() * pool.length)]!
}

type RecentSignature = { sig: string; daysAgo: number }

/**
 * Prefer fresh lines, but allow yesterday’s (or older) exact message to return sometimes.
 * Buyer names can repeat across days; only full “name + product” pairs are softened.
 */
function shouldSkipLine(
  sig: string,
  usedToday: Set<string>,
  recent: RecentSignature[]
): boolean {
  if (usedToday.has(sig)) return true

  for (const entry of recent) {
    if (entry.sig !== sig) continue
    if (entry.daysAgo === 1) return Math.random() < 0.75
    if (entry.daysAgo === 2) return Math.random() < 0.5
    if (entry.daysAgo <= 4) return Math.random() < 0.28
    return Math.random() < 0.12
  }
  return false
}

/** New random lines for today; unique within the day, repeats from past days only occasionally. */
export function buildDailySocialProofNotifications(
  productsInput: SocialProofProduct[],
  recentSignatures: RecentSignature[],
  count = DEFAULT_COUNT
): StoredSocialProofNotification[] {
  const byLabel = new Map<string, SocialProofProduct>()
  for (const p of productsInput) {
    const label = p.label.trim()
    if (!label) continue
    if (!byLabel.has(label.toLowerCase())) byLabel.set(label.toLowerCase(), p)
  }
  const products = Array.from(byLabel.values())
  if (products.length === 0 || count < 1) return []

  const mixedProducts = interleaveProductsByCategory(products)
  const usedToday = new Set<string>()
  const notifications: StoredSocialProofNotification[] = []
  const purchaseTimes = assignPurchaseTimes(count)

  let mixedIdx = 0
  let attempts = 0
  const maxAttempts = count * products.length * allBuyerNameCount() * 3

  while (notifications.length < count && attempts < maxAttempts) {
    attempts++
    const buyerName = randomBuyerName()
    const product =
      Math.random() < 0.42
        ? pickRandomProduct(mixedProducts)
        : mixedProducts[mixedIdx++ % mixedProducts.length]!
    const productName = product.label

    const sig = messageSignature(buyerName, productName)
    if (shouldSkipLine(sig, usedToday, recentSignatures)) continue

    usedToday.add(sig)
    notifications.push({
      buyerName,
      productName,
      productImageUrl: product.imageUrl,
      purchasedAt: purchaseTimes[notifications.length]!,
    })
  }

  return notifications
}

function readDailyCache(): DailySocialProofCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DAILY_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DailySocialProofCache
    if (!parsed?.date || !Array.isArray(parsed.notifications)) return null
    return parsed
  } catch {
    return null
  }
}

function writeDailyCache(cache: DailySocialProofCache): void {
  localStorage.setItem(DAILY_CACHE_KEY, JSON.stringify(cache))
}

function readPreviousDays(): PreviousDaysStore {
  if (typeof window === 'undefined') return { days: [] }
  try {
    const raw = localStorage.getItem(PREVIOUS_DAYS_KEY)
    if (!raw) return { days: [] }
    const parsed = JSON.parse(raw) as PreviousDaysStore
    return Array.isArray(parsed?.days) ? parsed : { days: [] }
  } catch {
    return { days: [] }
  }
}

function writePreviousDays(store: PreviousDaysStore): void {
  localStorage.setItem(PREVIOUS_DAYS_KEY, JSON.stringify(store))
}

function archiveDay(cache: DailySocialProofCache | null): void {
  if (!cache?.notifications.length) return
  const prev = readPreviousDays()
  const signatures = cache.notifications.map((n) =>
    messageSignature(n.buyerName, n.productName)
  )
  const days = prev.days.filter((d) => d.date !== cache.date)
  days.unshift({ date: cache.date, signatures })
  writePreviousDays({ days: days.slice(0, MAX_RECENT_DAYS_MEMORY) })
}

function loadRecentSignatures(todayKey: string): RecentSignature[] {
  const prev = readPreviousDays()
  const out: RecentSignature[] = []
  for (const day of prev.days) {
    if (day.date >= todayKey) continue
    const daysAgo = daysBetweenKeys(day.date, todayKey)
    if (daysAgo < 1 || daysAgo > MAX_RECENT_DAYS_MEMORY) continue
    for (const sig of day.signatures) {
      out.push({ sig, daysAgo })
    }
  }
  return out
}

function daysBetweenKeys(older: string, newer: string): number {
  const a = new Date(`${older}T12:00:00`)
  const b = new Date(`${newer}T12:00:00`)
  const diff = b.getTime() - a.getTime()
  if (!Number.isFinite(diff)) return 999
  return Math.max(1, Math.round(diff / (24 * 60 * 60_000)))
}

function validProductNameSet(products: SocialProofProduct[]): Set<string> {
  return new Set(products.map((p) => p.label.trim().toLowerCase()).filter(Boolean))
}

function notificationsHaveImages(notifications: StoredSocialProofNotification[]): boolean {
  return notifications.every((n) => Boolean(n.productImageUrl?.trim()))
}

function cacheMatchesCatalog(
  notifications: StoredSocialProofNotification[],
  validNames: Set<string>
): boolean {
  if (validNames.size === 0) return false
  return notifications.every((n) =>
    validNames.has(n.productName.trim().toLowerCase())
  )
}

/**
 * Load or create today’s feed (new random set each calendar day, all year).
 * Names and lines can reappear after a few days — never a fixed loop.
 */
export function loadOrCreateDailySocialProofFeed(
  products: SocialProofProduct[]
): StoredSocialProofNotification[] {
  const today = getLocalDateKey()
  const cached = readDailyCache()
  const validNames = validProductNameSet(products)

  if (
    cached?.date === today &&
    cached.notifications.length > 0 &&
    cacheMatchesCatalog(cached.notifications, validNames) &&
    notificationsHaveImages(cached.notifications)
  ) {
    return cached.notifications
  }

  if (cached?.date && cached.date !== today) {
    archiveDay(cached)
  }

  const recent = loadRecentSignatures(today)
  const notifications = buildDailySocialProofNotifications(
    products,
    recent,
    DEFAULT_COUNT
  )

  if (notifications.length > 0) {
    writeDailyCache({ date: today, notifications })
  }

  return notifications
}
