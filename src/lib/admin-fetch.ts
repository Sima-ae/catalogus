import type { AuthUser } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'

export function adminAuthHeaders(user: AuthUser | null): Record<string, string> {
  if (!user || user.role !== 'admin') return {}
  return catalogAuthHeaders(user)
}
