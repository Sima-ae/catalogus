'use client'

import { useEffect, useState } from 'react'
import RoleBadge from '@/components/users/RoleBadge'
import UserStarRating from '@/components/users/UserStarRating'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'
import type { AuthUser } from '@/lib/auth-local'

type Profile = {
  badge_rating: number | null
  role: string
  is_super_admin?: boolean
}

type UserBadgeCardProps = {
  user: AuthUser | null
  title?: string
}

/** Shows role label + marketplace badge stars for the signed-in user. */
export default function UserBadgeCard({ user, title = 'Your marketplace badge' }: UserBadgeCardProps) {
  const t = useAppTheme()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!user?.id) return
    fetch(appPath(`/api/users/${user.id}/profile`))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && !data.error) setProfile(data)
      })
      .catch(() => {})
  }, [user?.id])

  if (!user) return null

  const rating = profile?.badge_rating ?? user.badge_rating ?? null

  return (
    <div className="card p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className={`font-semibold ${t.heading}`}>{title}</h3>
          <p className={`text-sm mt-1 ${t.muted}`}>
            Badges are assigned by Super Admin and visible to all buyers and sellers.
          </p>
        </div>
        <RoleBadge
          role={user.role}
          email={user.email}
          is_super_admin={user.is_super_admin ?? profile?.is_super_admin}
        />
      </div>
      <div className={`mt-4 pt-4 border-t ${t.border}`}>
        <p className={`text-xs uppercase tracking-wide mb-2 ${t.muted}`}>Reputation</p>
        <UserStarRating rating={rating} size="lg" />
      </div>
    </div>
  )
}
