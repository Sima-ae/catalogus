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
      'Database is not available. Use one dev server only, run MariaDB (npm run dev:local) or the DB tunnel ' +
      '(npm run db:tunnel), then restart the app.'
    )
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
