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

  if (isDbAccessDenied(error)) {
    if (isProductionApp()) {
      return 'The shop cannot reach the database. Check DATABASE_URL in .env on the server (CyberPanel DB password).'
    }
    return 'Database access denied — wrong user or password in .env DATABASE_URL.'
  }

  if (isDbConnectionError(error)) {
    if (isProductionApp()) {
      return 'The shop cannot reach MariaDB on this server. Ensure MariaDB is running and DATABASE_URL uses 127.0.0.1.'
    }
    return 'Database is not available. Run npm run db:tunnel in another terminal, then restart the app.'
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}
