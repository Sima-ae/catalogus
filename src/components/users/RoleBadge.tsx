import { useI18n } from '@/lib/i18n-context'
import { ROLE_BADGE_STYLES, resolveRoleDisplayKey, type RoleDisplayKey } from '@/lib/user-roles'

type RoleBadgeProps = {
  role: string
  email?: string
  is_super_admin?: boolean | number
  className?: string
}

const ROLE_I18N_KEYS: Record<RoleDisplayKey, string> = {
  super_admin: 'admin.users.role.super_admin',
  admin: 'admin.users.role.admin',
  buyer: 'admin.users.role.buyer',
  seller: 'admin.users.role.seller',
}

export default function RoleBadge({ role, email, is_super_admin, className = '' }: RoleBadgeProps) {
  const { t } = useI18n()
  const key = resolveRoleDisplayKey({ role, email, is_super_admin })
  const { label, className: style } = ROLE_BADGE_STYLES[key]
  const translated = t(ROLE_I18N_KEYS[key])
  const displayLabel = translated !== ROLE_I18N_KEYS[key] ? translated : label

  return (
    <span
      className={`role-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${style} ${className}`}
      data-role={key}
    >
      {displayLabel}
    </span>
  )
}
