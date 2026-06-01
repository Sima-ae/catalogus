export type RoleDisplayKey = 'super_admin' | 'admin' | 'buyer' | 'seller'

export type UserListRow = {
  id: string
  email: string
  role: string
  name: string | null
  is_super_admin?: boolean | number
  badge_rating?: number | null
  created_at?: string
  updated_at?: string
}

export const SUPER_ADMIN_EMAIL = 'info@superclones.cloud'

export function isSuperAdminUser(user: {
  email?: string
  role?: string
  is_super_admin?: boolean | number
}): boolean {
  if (user.is_super_admin === true || user.is_super_admin === 1) return true
  return (
    user.role === 'admin' &&
    Boolean(user.email && user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL)
  )
}

export function resolveRoleDisplayKey(user: {
  role: string
  is_super_admin?: boolean | number
  email?: string
}): RoleDisplayKey {
  if (isSuperAdminUser(user)) return 'super_admin'
  const role = user.role?.toLowerCase()
  if (role === 'admin') return 'admin'
  if (role === 'seller') return 'seller'
  return 'buyer'
}

export const ROLE_BADGE_STYLES: Record<
  RoleDisplayKey,
  { label: string; className: string }
> = {
  super_admin: {
    label: 'Super Admin',
    className: 'bg-black text-white border border-gray-700',
  },
  admin: {
    label: 'Admin',
    className: 'bg-black text-white border border-gray-700',
  },
  buyer: {
    label: 'Buyer',
    className: 'bg-green-950 text-white border border-green-900',
  },
  seller: {
    label: 'Seller',
    className: 'bg-green-500 text-white',
  },
}

export function clampBadgeRating(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < 1 || n > 5) return null
  return n
}
