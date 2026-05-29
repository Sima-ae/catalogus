import type { AuthUser } from '@/lib/auth-local'

export function adminAuthHeaders(user: AuthUser | null): Record<string, string> {
  if (!user || user.role !== 'admin') return {}
  return {
    'X-Catalogus-User-Id': user.id,
    'X-Catalogus-User-Email': user.email,
  }
}
