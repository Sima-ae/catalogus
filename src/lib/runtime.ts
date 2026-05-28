/**
 * Dev fallback: in-memory products/users and bcrypt dev logins when DB is offline.
 * Enabled when AUTH_DEV_FALLBACK=true, or in development unless explicitly false.
 */
export function useDevFallback(): boolean {
  const flag = process.env.AUTH_DEV_FALLBACK
  if (flag === 'false') return false
  if (flag === 'true') return true
  return process.env.NODE_ENV !== 'production'
}
