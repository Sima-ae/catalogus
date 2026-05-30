export type StoredSocialProofNotification = {
  buyerName: string
  productName: string
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

const DAILY_CACHE_KEY = 'catalogus-social-proof-daily-v6'
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

function startOfLocalDayMs(date: Date | number = Date.now()): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
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

/** Gaps between fictional purchases — mostly 45min–3h, sometimes several hours apart. */
function pickPurchaseGapMs(minGap: number, maxGap: number): number {
  const roll = Math.random()
  let gap: number
  if (roll < 0.28) {
    gap = (40 + Math.random() * 35) * MS_MINUTE
  } else if (roll < 0.72) {
    gap = (75 + Math.random() * 105) * MS_MINUTE
  } else {
    gap = (2.5 + Math.random() * 4.5) * MS_HOUR
  }
  return Math.min(Math.max(gap, minGap), maxGap)
}

/** Newest purchase in the daily set — sometimes “just now”, usually a bit older. */
function pickNewestPurchaseTime(now: number): number {
  const roll = Math.random()
  if (roll < 0.22) {
    return now - Math.random() * 90_000
  }
  if (roll < 0.48) {
    return now - (2 + Math.random() * 16) * MS_MINUTE
  }
  return now - (12 + Math.random() * 38) * MS_MINUTE
}

/**
 * Spread purchases across the day with realistic spacing (not clustered in minutes).
 * The freshest line can be “just now”; older lines are minutes to hours ago.
 */
function assignPurchaseTimes(count: number, now = Date.now()): string[] {
  const dayStart = startOfLocalDayMs(now)
  const earliest = dayStart + 25 * MS_MINUTE
  const newest = pickNewestPurchaseTime(now)

  if (newest <= earliest || count < 1) {
    const span = Math.max(now - earliest, 20 * MS_MINUTE)
    const step = span / count
    const first = pickNewestPurchaseTime(now)
    return Array.from({ length: count }, (_, i) =>
      new Date(
        i === 0 ? first : first - i * step - Math.random() * step * 0.25
      ).toISOString()
    )
  }

  const window = newest - earliest
  const minGap = Math.max(35 * MS_MINUTE, window / (count * 2.2))
  const maxGap = Math.max(minGap * 1.5, Math.min(6 * MS_HOUR, window / Math.max(count - 1, 1)))

  const times: number[] = [newest]
  let cursor = newest

  for (let i = 1; i < count; i++) {
    const remaining = count - i
    const room = cursor - earliest
    const gapCap = Math.max(minGap, room / remaining - minGap * 0.25)
    const gap = pickPurchaseGapMs(minGap, Math.min(maxGap, gapCap))
    cursor -= gap
    if (cursor < earliest) {
      cursor = earliest + (room / (remaining + 1)) * (0.35 + Math.random() * 0.55)
    }
    times.push(cursor)
  }

  return times.map((t) => new Date(t).toISOString())
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
  productNames: string[],
  recentSignatures: RecentSignature[],
  count = DEFAULT_COUNT
): StoredSocialProofNotification[] {
  const products = Array.from(
    new Set(productNames.map((n) => n.trim()).filter(Boolean))
  )
  if (products.length === 0 || count < 1) return []

  const shuffledProducts = shuffle(products)
  const usedToday = new Set<string>()
  const notifications: StoredSocialProofNotification[] = []
  const purchaseTimes = assignPurchaseTimes(count)

  let productIdx = 0
  let attempts = 0
  const maxAttempts = count * products.length * allBuyerNameCount() * 3

  while (notifications.length < count && attempts < maxAttempts) {
    attempts++
    const buyerName = randomBuyerName()
    const productName = shuffledProducts[productIdx % shuffledProducts.length]!
    productIdx++

    const sig = messageSignature(buyerName, productName)
    if (shouldSkipLine(sig, usedToday, recentSignatures)) continue

    usedToday.add(sig)
    notifications.push({
      buyerName,
      productName,
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

function validProductNameSet(productNames: string[]): Set<string> {
  return new Set(productNames.map((n) => n.trim().toLowerCase()).filter(Boolean))
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
  productNames: string[]
): StoredSocialProofNotification[] {
  const today = getLocalDateKey()
  const cached = readDailyCache()
  const validNames = validProductNameSet(productNames)

  if (
    cached?.date === today &&
    cached.notifications.length > 0 &&
    cacheMatchesCatalog(cached.notifications, validNames)
  ) {
    return cached.notifications
  }

  if (cached?.date && cached.date !== today) {
    archiveDay(cached)
  }

  const recent = loadRecentSignatures(today)
  const notifications = buildDailySocialProofNotifications(
    productNames,
    recent,
    DEFAULT_COUNT
  )

  if (notifications.length > 0) {
    writeDailyCache({ date: today, notifications })
  }

  return notifications
}
