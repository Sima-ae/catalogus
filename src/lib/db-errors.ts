import { isDbConnectionError, isDbTooManyConnections } from '@/lib/db'

/** User-facing message when a route requires MariaDB. */
export function getDbErrorMessage(error: unknown, fallback = 'Database operation failed'): string {
  if (isDbTooManyConnections(error)) {
    return (
      'Database has too many open connections. Stop extra `npm run dev` processes, wait a minute, ' +
      'then restart the app. On shared hosting, lower DB_CONNECTION_LIMIT in .env (try 2).'
    )
  }
  if (isDbConnectionError(error)) {
    return (
      'Database is not available. Run npm run dev:local (Docker MariaDB) or check DATABASE_URL on the VPS.'
    )
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
