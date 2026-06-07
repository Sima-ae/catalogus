'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { EyeIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import AdminPageShell from '@/components/admin/AdminPageShell'
import UserForm from '@/components/admin/UserForm'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from '@/components/admin/AdminTable'
import RoleBadge from '@/components/users/RoleBadge'
import UserStarRating, { UserStarRatingEditor } from '@/components/users/UserStarRating'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { useAppTheme } from '@/lib/theme-classes'
import { appPath } from '@/lib/paths'
import { isSuperAdminUser, type UserListRow } from '@/lib/user-roles'

export default function AdminUsersPage() {
  const t = useAppTheme()
  const { user, isAdmin, isSuperAdmin } = useAuth()
  const [users, setUsers] = useState<UserListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [ratingError, setRatingError] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)

  const loadUsers = useCallback(() => {
    if (!user) return
    setLoading(true)
    fetch(appPath('/api/admin/users'), { headers: adminAuthHeaders(user), cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed to load users')
        setUsers(Array.isArray(d) ? d : [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!isAdmin) return
    loadUsers()
  }, [isAdmin, loadUsers])

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

  const handleDelete = async (target: UserListRow) => {
    if (!isSuperAdmin) return
    if (target.id === user?.id) {
      alert('You cannot delete your own account')
      return
    }
    if (isSuperAdminUser(target)) {
      alert('Super admin account cannot be deleted')
      return
    }
    if (!confirm(`Delete user ${target.email}? This cannot be undone.`)) return

    setDeletingId(target.id)
    try {
      const res = await fetch(appPath(`/api/admin/users/${target.id}`), {
        method: 'DELETE',
        headers: adminAuthHeaders(user),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setUsers((prev) => prev.filter((u) => u.id !== target.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const canEditUser = (u: UserListRow) => isAdmin && (!isSuperAdminUser(u) || isSuperAdmin)

  return (
    <AdminPageShell titleKey="admin.nav.users">
      {isAdmin && !showAddUser && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowAddUser(true)}
          >
            <PlusIcon className="w-5 h-5" />
            Add user
          </button>
        </div>
      )}

      {isAdmin && showAddUser && (
        <div className="mb-6">
          <UserForm
            onCreated={(created) => {
              setUsers((prev) => [created, ...prev])
              setShowAddUser(false)
            }}
            onCancel={() => setShowAddUser(false)}
          />
        </div>
      )}

      {isSuperAdmin && (
        <div className="card p-4 mb-6 border border-amber-500/30 bg-amber-500/5">
          <p className="text-amber-700 dark:text-amber-200 text-sm font-medium mb-2">
            Super Admin — assign star badges
          </p>
          <p className={`${t.muted} text-sm mb-3`}>
            Only you can rate buyers and sellers (1–5 stars, Google-style). All users can see these badges on
            dashboards.
          </p>
          <label className={`block text-sm ${t.muted} mb-1`}>
            Your password (required to save ratings)
          </label>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            className={`w-full max-w-md px-3 py-2 rounded-lg border ${t.input}`}
            placeholder="Super admin password"
            autoComplete="current-password"
          />
          {ratingError && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{ratingError}</p>}
        </div>
      )}

      {loading && <p className={t.muted}>Loading...</p>}
      {error && <p className="text-red-500 dark:text-red-400">{error}</p>}
      {!loading && !error && users.length === 0 && (
        <AdminEmptyState title="No users found" description="Users appear when registered in the database." />
      )}
      {!loading && !error && users.length > 0 && (
        <AdminTable>
          <AdminTableHead>
            <AdminTh>Email</AdminTh>
            <AdminTh>Name</AdminTh>
            <AdminTh>Role</AdminTh>
            <AdminTh>Badge</AdminTh>
            <AdminTh align="right">Actions</AdminTh>
          </AdminTableHead>
          <AdminTableBody>
            {users.map((u) => {
              const canRate =
                isSuperAdmin &&
                u.role !== 'admin' &&
                !u.is_super_admin &&
                u.id !== user?.id

              return (
                <AdminTr key={u.id}>
                  <AdminTd>{u.email}</AdminTd>
                  <AdminTd>{u.name || '—'}</AdminTd>
                  <AdminTd>
                    <RoleBadge role={u.role} email={u.email} is_super_admin={u.is_super_admin} />
                  </AdminTd>
                  <AdminTd>
                    {canRate ? (
                      <UserStarRatingEditor
                        value={u.badge_rating ?? null}
                        disabled={savingId === u.id}
                        onChange={(rating) => saveRating(u, rating)}
                      />
                    ) : (
                      <UserStarRating rating={u.badge_rating} size="sm" />
                    )}
                  </AdminTd>
                  <AdminTd align="right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <Link
                        href={appPath(`/admin/users/${u.id}`)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${t.body} ${t.rowHover}`}
                      >
                        <EyeIcon className="w-4 h-4" />
                        View
                      </Link>
                      {canEditUser(u) && (
                        <Link
                          href={appPath(`/admin/users/${u.id}/edit`)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${t.body} ${t.rowHover}`}
                        >
                          <PencilIcon className="w-4 h-4" />
                          Edit
                        </Link>
                      )}
                      {isSuperAdmin && u.id !== user?.id && !isSuperAdminUser(u) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          disabled={deletingId === u.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${
                            t.isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                          } disabled:opacity-50`}
                        >
                          <TrashIcon className="w-4 h-4" />
                          {deletingId === u.id ? '…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </AdminTd>
                </AdminTr>
              )
            })}
          </AdminTableBody>
        </AdminTable>
      )}
    </AdminPageShell>
  )
}
