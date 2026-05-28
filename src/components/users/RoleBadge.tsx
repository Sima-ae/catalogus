import { ROLE_BADGE_STYLES, resolveRoleDisplayKey } from '@/lib/user-roles'

type RoleBadgeProps = {
  role: string
  email?: string
  is_super_admin?: boolean | number
  className?: string
}

export default function RoleBadge({ role, email, is_super_admin, className = '' }: RoleBadgeProps) {
  const key = resolveRoleDisplayKey({ role, email, is_super_admin })
  const { label, className: style } = ROLE_BADGE_STYLES[key]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${style} ${className}`}
    >
      {label}
    </span>
  )
}
