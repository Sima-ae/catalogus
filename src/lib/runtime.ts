/**
 * Auth-only dev fallback: bcrypt logins when MariaDB is unreachable (AUTH_DEV_FALLBACK=true).
 * Catalog data (products, categories, orders, etc.) always comes from the database.
 */
export function isAuthDevFallbackEnabled(): boolean {
  const flag = process.env.AUTH_DEV_FALLBACK
  if (flag === 'false') return false
  if (flag === 'true') return true
  return process.env.NODE_ENV !== 'production'
}
