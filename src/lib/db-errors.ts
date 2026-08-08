import { isDbConnectionError, isDbTooManyConnections } from '@/lib/db'

function isProductionApp(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isDbAccessDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code
  const errno = (error as { errno?: number }).errno
  return code === 'ER_ACCESS_DENIED_ERROR' || errno === 1045
}

/** User-facing message when a route requires MariaDB. */
export function getDbErrorMessage(error: unknown, fallback = 'Database operation failed'): string {
  if (isDbTooManyConnections(error)) {
    if (isProductionApp()) {
      return 'The shop is busy. Please try again in a minute.'
    }
    return (
      'Database has too many open connections. Stop extra dev servers, wait a minute, then restart.'
    )
  }

  if (isDbAccessDenied(error) || isDbConnectionError(error)) {
    if (isProductionApp()) {
      return 'The shop is temporarily unavailable. Please try again shortly.'
    }
    if (isDbAccessDenied(error)) {
      return 'Database access denied — wrong user or password in .env DATABASE_URL.'
    }
    return 'Database is not available. Run npm run db:tunnel in another terminal, then restart the app.'
  }

  // Never leak raw SQL / stack / paths to clients in production.
  if (isProductionApp()) return fallback
  if (error instanceof Error && error.message) return error.message
  return fallback
}
