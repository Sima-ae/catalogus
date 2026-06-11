'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { EyeIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import AdminPageShell from '@/components/admin/AdminPageShell'
import UserForm from '@/components/admin/UserForm'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import {
  AdminSortableTh,
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
import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'
import {
  isSuperAdminUser,
  resolveRoleDisplayKey,
  type RoleDisplayKey,
  type UserListRow,
} from '@/lib/user-roles'

const ROLE_FILTER_KEYS: RoleDisplayKey[] = ['buyer', 'seller', 'admin', 'super_admin']

type UserSortKey = 'status' | 'name' | 'email' | 'role' | 'badge'
type UserSortDir = 'asc' | 'desc'

function compareUsers(
  a: UserListRow,
  b: UserListRow,
  sortKey: UserSortKey,
  sortDir: UserSortDir,
  roleLabel: (key: RoleDisplayKey) => string
): number {
  let cmp = 0
  switch (sortKey) {
    case 'status':
      cmp = Number(userHasActiveCode(a)) - Number(userHasActiveCode(b))
      break
    case 'name':
      cmp = (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' })
      break
    case 'email':
      cmp = a.email.localeCompare(b.email, undefined, { sensitivity: 'base' })
      break
    case 'role':
      cmp = roleLabel(resolveRoleDisplayKey(a)).localeCompare(
        roleLabel(resolveRoleDisplayKey(b)),
        undefined,
        { sensitivity: 'base' }
      )
      break
    case 'badge': {
      const ar = a.badge_rating ?? -1
      const br = b.badge_rating ?? -1
      cmp = ar - br
      break
    }
  }
  return sortDir === 'asc' ? cmp : -cmp
}

function userHasActiveCode(user: UserListRow): boolean {
  return Boolean(user.site_access_code?.trim())
}

export default function AdminUsersPage() {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const { user, isAdmin, isSuperAdmin } = useAuth()
  const [users, setUsers] = useState<UserListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [ratingError, setRatingError] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | RoleDisplayKey>('all')
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'none' | '1' | '2' | '3' | '4' | '5'>('all')
  const [sortKey, setSortKey] = useState<UserSortKey | null>(null)
  const [sortDir, setSortDir] = useState<UserSortDir>('asc')

  const roleLabel = (key: RoleDisplayKey) => tr(`admin.users.role.${key}`)

  const handleSort = (key: string) => {
    const nextKey = key as UserSortKey
    if (sortKey === nextKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(nextKey)
      setSortDir('asc')
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (q) {
        const haystack = `${u.email} ${u.name ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (roleFilter !== 'all' && resolveRoleDisplayKey(u) !== roleFilter) return false
      if (badgeFilter === 'none') {
        if (u.badge_rating != null) return false
      } else if (badgeFilter !== 'all') {
        if (u.badge_rating !== Number(badgeFilter)) return false
      }
      return true
    })
  }, [users, search, roleFilter, badgeFilter])

  const sortedUsers = useMemo(() => {
    if (!sortKey) return filteredUsers
    return [...filteredUsers].sort((a, b) => compareUsers(a, b, sortKey, sortDir, roleLabel))
  }, [filteredUsers, sortKey, sortDir, tr])

  const hasActiveFilters = search.trim() !== '' || roleFilter !== 'all' || badgeFilter !== 'all'

  const loadUsers = useCallback(() => {
    if (!user) return
    setLoading(true)
    fetch(appPath('/api/admin/users'), { headers: adminAuthHeaders(user), cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || tr('admin.users.noUsers'))
        setUsers(Array.isArray(d) ? d : [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [user, tr])

  useEffect(() => {
    if (!isAdmin) return
    loadUsers()
  }, [isAdmin, loadUsers])

  const saveRating = async (targetUser: UserListRow, rating: number | null) => {
    if (!isSuperAdmin || !user?.email) return
    if (!adminPassword.trim()) {
      setRatingError(tr('admin.users.ratingPasswordRequired'))
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
      if (!res.ok) throw new Error(data.error || tr('admin.users.ratingUpdateFailed'))
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, badge_rating: data.badge_rating } : u))
      )
    } catch (e) {
      setRatingError(e instanceof Error ? e.message : tr('admin.users.ratingUpdateFailed'))
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (target: UserListRow) => {
    if (!isSuperAdmin) return
    if (target.id === user?.id) {
      alert(tr('admin.users.cannotDeleteSelf'))
      return
    }
    if (isSuperAdminUser(target)) {
      alert(tr('admin.users.cannotDeleteSuperAdmin'))
      return
    }
    if (!confirm(formatMessage(tr('admin.users.confirmDelete'), { email: target.email }))) return

    setDeletingId(target.id)
    try {
      const res = await fetch(appPath(`/api/admin/users/${target.id}`), {
        method: 'DELETE',
        headers: adminAuthHeaders(user),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || tr('admin.users.deleteFailed'))
      setUsers((prev) => prev.filter((u) => u.id !== target.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : tr('admin.users.deleteFailed'))
    } finally {
      setDeletingId(null)
    }
  }

  const canEditUser = (u: UserListRow) => isAdmin && (!isSuperAdminUser(u) || isSuperAdmin)

  return (
    <AdminPageShell
      titleKey="admin.nav.users"
      actions={
        isAdmin && !showAddUser ? (
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowAddUser(true)}
          >
            <PlusIcon className="w-5 h-5" />
            {tr('admin.users.addUser')}
          </button>
        ) : null
      }
    >

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
            {tr('admin.users.superAdminBadgesTitle')}
          </p>
          <p className={`${t.muted} text-sm mb-3`}>{tr('admin.users.superAdminBadgesHint')}</p>
          <label className={`block text-sm ${t.muted} mb-1`}>
            {tr('admin.users.superAdminPasswordLabel')}
          </label>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            className={`w-full max-w-md px-3 py-2 rounded-lg border ${t.input}`}
            placeholder={tr('admin.users.superAdminPasswordPlaceholder')}
            autoComplete="current-password"
          />
          {ratingError && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{ratingError}</p>}
        </div>
      )}

      {loading && <p className={t.muted}>{tr('admin.users.loading')}</p>}
      {error && <p className="text-red-500 dark:text-red-400">{error}</p>}
      {!loading && !error && users.length === 0 && (
        <AdminEmptyState
          title={tr('admin.users.noUsers')}
          description={tr('admin.users.noUsersHint')}
        />
      )}
      {!loading && !error && users.length > 0 && (
        <div className="card mb-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <label className="flex-1 space-y-1">
              <span className={`text-sm font-medium ${t.muted}`}>{tr('admin.users.search')}</span>
              <input
                type="search"
                className="input w-full"
                placeholder={tr('admin.users.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="sm:w-44 space-y-1">
              <span className={`text-sm font-medium ${t.muted}`}>{tr('admin.users.filterRole')}</span>
              <select
                className="input w-full"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | RoleDisplayKey)}
              >
                <option value="all">{tr('admin.users.allRoles')}</option>
                {ROLE_FILTER_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {roleLabel(key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:w-40 space-y-1">
              <span className={`text-sm font-medium ${t.muted}`}>{tr('admin.users.filterBadge')}</span>
              <select
                className="input w-full"
                value={badgeFilter}
                onChange={(e) =>
                  setBadgeFilter(e.target.value as 'all' | 'none' | '1' | '2' | '3' | '4' | '5')
                }
              >
                <option value="all">{tr('admin.users.allBadges')}</option>
                <option value="none">{tr('admin.users.badgeNone')}</option>
                {(['5', '4', '3', '2', '1'] as const).map((n) => (
                  <option key={n} value={n}>
                    {formatMessage(tr('admin.users.starsCount'), { count: n })}
                  </option>
                ))}
              </select>
            </label>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-secondary sm:mb-0.5"
                onClick={() => {
                  setSearch('')
                  setRoleFilter('all')
                  setBadgeFilter('all')
                }}
              >
                {tr('admin.users.clearFilters')}
              </button>
            )}
          </div>
          <p className={`text-sm ${t.muted}`}>
            {formatMessage(tr('admin.users.matchingSummary'), {
              matching: sortedUsers.length,
              total: users.length,
            })}
            {roleFilter !== 'all' && (
              <> · {tr('admin.users.filterRolePrefix')}: {roleLabel(roleFilter)}</>
            )}
            {badgeFilter === 'none' && (
              <> · {tr('admin.users.filterBadgePrefix')}: {tr('admin.users.badgeNone')}</>
            )}
            {badgeFilter !== 'all' && badgeFilter !== 'none' && (
              <>
                {' '}
                · {tr('admin.users.filterBadgePrefix')}:{' '}
                {formatMessage(tr('admin.users.starsCount'), { count: badgeFilter })}
              </>
            )}
            {search.trim() && (
              <>
                {' '}
                · {tr('admin.users.filterSearchPrefix')}: “{search.trim()}”
              </>
            )}
          </p>
        </div>
      )}
      {!loading && !error && users.length > 0 && sortedUsers.length === 0 && (
        <AdminEmptyState
          title={tr('admin.users.noMatches')}
          description={tr('admin.users.noMatchesHint')}
        />
      )}
      {!loading && !error && sortedUsers.length > 0 && (
        <AdminTable>
          <AdminTableHead>
            <AdminSortableTh
              label={tr('admin.users.col.status')}
              sortKey="status"
              activeSortKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <AdminSortableTh
              label={tr('admin.users.col.name')}
              sortKey="name"
              activeSortKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <AdminSortableTh
              label={tr('admin.users.col.email')}
              sortKey="email"
              activeSortKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <AdminSortableTh
              label={tr('admin.users.col.role')}
              sortKey="role"
              activeSortKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <AdminSortableTh
              label={tr('admin.users.col.badge')}
              sortKey="badge"
              activeSortKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <AdminTh align="right">{tr('admin.users.col.actions')}</AdminTh>
          </AdminTableHead>
          <AdminTableBody>
            {sortedUsers.map((u) => {
              const canRate =
                isSuperAdmin &&
                u.role !== 'admin' &&
                !u.is_super_admin &&
                u.id !== user?.id
              const codeActive = userHasActiveCode(u)

              return (
                <AdminTr key={u.id}>
                  <AdminTd>
                    <span
                      className={
                        codeActive
                          ? 'text-green-600 dark:text-green-400 font-medium'
                          : 'text-red-500 dark:text-red-400 font-medium'
                      }
                    >
                      {codeActive
                        ? tr('admin.users.status.active')
                        : tr('admin.users.status.inactive')}
                    </span>
                  </AdminTd>
                  <AdminTd>{u.name || '—'}</AdminTd>
                  <AdminTd>{u.email}</AdminTd>
                  <AdminTd>
                    <RoleBadge role={u.role} email={u.email} is_super_admin={u.is_super_admin} />
                  </AdminTd>
                  <AdminTd>
                    {canRate ? (
                      <UserStarRatingEditor
                        value={u.badge_rating ?? null}
                        disabled={savingId === u.id}
                        clearLabel={tr('admin.users.clearRating')}
                        onChange={(rating) => saveRating(u, rating)}
                      />
                    ) : (
                      <UserStarRating
                        rating={u.badge_rating}
                        size="sm"
                        emptyLabel={tr('admin.users.noRating')}
                      />
                    )}
                  </AdminTd>
                  <AdminTd align="right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <Link
                        href={appPath(`/admin/users/${u.id}`)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${t.body} ${t.rowHover}`}
                      >
                        <EyeIcon className="w-4 h-4" />
                        {tr('admin.users.view')}
                      </Link>
                      {canEditUser(u) && (
                        <Link
                          href={appPath(`/admin/users/${u.id}/edit`)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${t.body} ${t.rowHover}`}
                        >
                          <PencilIcon className="w-4 h-4" />
                          {tr('admin.users.edit')}
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
                          {deletingId === u.id ? '…' : tr('admin.users.delete')}
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
