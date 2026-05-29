import type { AuthUser } from '@/lib/auth-local'

/** Auth headers for admin or seller API routes (server verifies role). */
export function catalogAuthHeaders(user: AuthUser | null): Record<string, string> {
  if (!user || (user.role !== 'admin' && user.role !== 'seller')) return {}
  return {
    'X-Catalogus-User-Id': user.id,
    'X-Catalogus-User-Email': user.email,
  }
}
