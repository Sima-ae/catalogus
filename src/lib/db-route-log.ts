import { isDbConnectionError } from '@/lib/db'

let offlineHintShown = false

/** One-line hint when MariaDB is down in local dev. */
export function warnDbOfflineOnce() {
  if (offlineHintShown) return
  offlineHintShown = true
  console.warn(
    '[catalogus] MariaDB is not reachable. All catalog data requires the database. ' +
      'Start MariaDB with npm run dev:local (local) or check DATABASE_URL on the VPS.'
  )
}

export function logDbRouteError(context: string, error: unknown) {
  if (isDbConnectionError(error)) {
    warnDbOfflineOnce()
    return
  }
  console.error(`${context}:`, error)
}
