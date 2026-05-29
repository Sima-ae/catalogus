import { isDbConnectionError } from '@/lib/db'

/** User-facing message when a route requires MariaDB. */
export function getDbErrorMessage(error: unknown, fallback = 'Database operation failed'): string {
  if (isDbConnectionError(error)) {
    return (
      'Database is not available. Start MariaDB (npm run dev:local) or connect to production ' +
      '(npm run db:tunnel), then restart the app.'
    )
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
