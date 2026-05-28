'use client'

import { useEffect, useState } from 'react'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import RoleBadge from '@/components/users/RoleBadge'
import UserStarRating, { UserStarRatingEditor } from '@/components/users/UserStarRating'
import { useAuth } from '@/lib/auth-local'
import { appPath } from '@/lib/paths'
import type { UserListRow } from '@/lib/user-roles'

export default function AdminUsersPage() {
  const { user, isSuperAdmin } = useAuth()
  const [users, setUsers] = useState<UserListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [ratingError, setRatingError] = useState('')

  const loadUsers = () => {
    setLoading(true)
    fetch(appPath('/api/users'))
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed to load users')
        setUsers(Array.isArray(d) ? d : [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const saveRating = async (targetUser: UserListRow, rating: number | null) => {
    if (!isSuperAdmin || !user?.email) return
    if (!adminPassword.trim()) {
      setRatingError('Enter your super admin password below to assign badges.')
      return
    }
    setRatingError('')
    setSavingId(targetUser.id)
    try {
      const res = await fetch(appPath(`/api/admin/users/${targetUser.id}/badge-rating`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user.email,
          adminPassword,
          rating,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update rating')
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, badge_rating: data.badge_rating } : u))
      )
    } catch (e) {
      setRatingError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AdminPageShell
      title="Users"
      description="Registered accounts, roles, and marketplace badges."
    >
      {isSuperAdmin && (
        <div className="card p-4 mb-6 border border-amber-500/30 bg-amber-500/5">
          <p className="text-amber-200 text-sm font-medium mb-2">Super Admin — assign star badges</p>
          <p className="text-gray-400 text-sm mb-3">
            Only you can rate buyers and sellers (1–5 stars, Google-style). All users can see these badges on
            dashboards.
          </p>
          <label className="block text-sm text-gray-400 mb-1">Your password (required to save ratings)</label>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            className="w-full max-w-md px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white"
            placeholder="Super admin password"
            autoComplete="current-password"
          />
          {ratingError && <p className="text-red-400 text-sm mt-2">{ratingError}</p>}
        </div>
      )}

      {loading && <p className="text-gray-400">Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && users.length === 0 && (
        <AdminEmptyState title="No users found" description="Users appear when registered in the database." />
      )}
      {!loading && !error && users.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-gray-400">Email</th>
                <th className="text-left py-3 px-4 text-gray-400">Name</th>
                <th className="text-left py-3 px-4 text-gray-400">Role</th>
                <th className="text-left py-3 px-4 text-gray-400">Badge</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const canRate =
                  isSuperAdmin &&
                  u.role !== 'admin' &&
                  !u.is_super_admin &&
                  u.id !== user?.id

                return (
                  <tr key={u.id} className="border-b border-dark-700">
                    <td className="py-3 px-4 text-white">{u.email}</td>
                    <td className="py-3 px-4 text-gray-300">{u.name || '—'}</td>
                    <td className="py-3 px-4">
                      <RoleBadge role={u.role} email={u.email} is_super_admin={u.is_super_admin} />
                    </td>
                    <td className="py-3 px-4">
                      {canRate ? (
                        <UserStarRatingEditor
                          value={u.badge_rating ?? null}
                          disabled={savingId === u.id}
                          onChange={(rating) => saveRating(u, rating)}
                        />
                      ) : (
                        <UserStarRating rating={u.badge_rating} size="sm" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  )
}
