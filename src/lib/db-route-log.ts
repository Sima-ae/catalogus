import { isDbConnectionError } from '@/lib/db'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'

let offlineHintShown = false

/** One-line hint when MariaDB is down in local dev (avoids stack traces every request). */
export function warnDbOfflineOnce() {
  if (offlineHintShown || !isDevDataFallbackEnabled()) return
  offlineHintShown = true
  console.warn(
    '[catalogus] MariaDB is not reachable (127.0.0.1:3306). Using dev fallbacks. ' +
      'To use the database: start MariaDB (e.g. npm run db:local with Docker) or run npm run db:tunnel to the VPS.'
  )
}

export function logDbRouteError(context: string, error: unknown) {
  if (isDevDataFallbackEnabled() && isDbConnectionError(error)) {
    warnDbOfflineOnce()
    return
  }
  console.error(`${context}:`, error)
}
