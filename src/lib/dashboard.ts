import type { AuthUser } from '@/lib/auth-local'

export function getDashboardPath(role: AuthUser['role']): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'seller':
      return '/seller'
    case 'buyer':
    default:
      return '/buyer'
  }
}
