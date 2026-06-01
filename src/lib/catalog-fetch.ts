import type { AuthUser } from '@/lib/auth-local'

/** Auth headers for catalog API routes (server verifies role). */
export function catalogAuthHeaders(user: AuthUser | null): Record<string, string> {
  if (!user) return {}
  if (user.role !== 'admin' && user.role !== 'seller' && user.role !== 'buyer') return {}
  return {
    'X-Catalogus-User-Id': user.id,
    'X-Catalogus-User-Email': user.email,
  }
}
