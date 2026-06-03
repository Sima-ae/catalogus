'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'
import { isSuperAdminUser, type UserListRow } from '@/lib/user-roles'
import SellerPricelistAccessPanel from '@/components/admin/SellerPricelistAccessPanel'

type Props = {
  userId?: string
  readOnly?: boolean
  onCreated?: (user: UserListRow) => void
  onCancel?: () => void
}

const emptyForm = {
  email: '',
  password: '',
  name: '',
  role: 'buyer' as 'buyer' | 'seller' | 'admin',
  badge_rating: '',
  site_access_code: '',
}

export default function UserForm({
  userId,
  readOnly = false,
  onCreated,
  onCancel,
}: Props) {
  const router = useRouter()
  const t = useAppTheme()
  const { user: actor, isAdmin, isSuperAdmin } = useAuth()
  const isEdit = Boolean(userId)
  const isCreate = !isEdit

  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [targetSuperAdmin, setTargetSuperAdmin] = useState(false)

  useEffect(() => {
    if (!isEdit || !userId) return

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(appPath(`/api/admin/users/${userId}`), {
      headers: adminAuthHeaders(actor),
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load user')
        const row = data as UserListRow
        setTargetSuperAdmin(isSuperAdminUser(row))
        setForm({
          email: row.email,
          password: '',
          name: row.name || '',
          role: (row.role as 'buyer' | 'seller' | 'admin') || 'buyer',
          badge_rating: row.badge_rating != null ? String(row.badge_rating) : '',
          site_access_code: row.site_access_code || '',
        })
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load user')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [isEdit, userId, actor])

  const effectiveReadOnly =
    readOnly || (targetSuperAdmin && !isSuperAdmin)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (effectiveReadOnly) return

    setSaving(true)
    setError(null)

    if (isCreate && isAdmin && form.role === 'buyer' && !form.site_access_code.trim()) {
      setError('Enter the personal site access code you are assigning to this buyer')
      setSaving(false)
      return
    }

    const payload: Record<string, unknown> = {
      email: form.email.trim(),
      name: form.name.trim() || null,
      role: form.role,
    }
    if (form.password) payload.password = form.password
    if (isSuperAdmin) {
      payload.badge_rating = form.badge_rating ? Number(form.badge_rating) : null
    }

    try {
      const url = isCreate
        ? appPath('/api/admin/users')
        : appPath(`/api/admin/users/${userId}`)
      const method = isCreate ? 'POST' : 'PATCH'

      if (isCreate) {
        payload.password = form.password
        if (!form.password) {
          setError('Password is required')
          setSaving(false)
          return
        }
        if (form.site_access_code.trim()) {
          payload.site_access_code = form.site_access_code.trim()
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders(actor),
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Save failed')
        return
      }

      if (isCreate && onCreated) {
        onCreated(data as UserListRow)
        setForm(emptyForm)
      } else {
        router.push(appPath(`/admin/users/${userId}`))
        router.refresh()
      }
    } catch {
      setError('Network error — could not save user')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className={t.muted}>Loading user…</p>
  }

  const title = isCreate ? 'Add user' : effectiveReadOnly ? 'User details' : 'Edit user'

  return (
    <>
    <form onSubmit={handleSubmit} className="card space-y-4 max-w-xl">
      <h2 className="card-section-title">{title}</h2>
      {effectiveReadOnly && targetSuperAdmin && !isSuperAdmin && (
        <p className={`text-sm ${t.muted}`}>Super admin accounts can only be edited by super admin.</p>
      )}
      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}
      <label className="block space-y-1">
        <span className="form-label">Email *</span>
        <input
          type="email"
          className="input w-full"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
          readOnly={effectiveReadOnly}
          disabled={effectiveReadOnly}
          autoComplete="off"
        />
      </label>
      <label className="block space-y-1">
        <span className="form-label">{isCreate ? 'Password *' : 'New password'}</span>
        <input
          type="password"
          className="input w-full"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required={isCreate}
          minLength={isCreate ? 8 : undefined}
          readOnly={effectiveReadOnly}
          disabled={effectiveReadOnly}
          autoComplete="new-password"
          placeholder={isEdit ? 'Leave blank to keep current password' : undefined}
        />
      </label>
      <label className="block space-y-1">
        <span className="form-label">Name</span>
        <input
          type="text"
          className="input w-full"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Display name"
          readOnly={effectiveReadOnly}
          disabled={effectiveReadOnly}
        />
      </label>
      <label className="block space-y-1">
        <span className="form-label">Role *</span>
        <select
          className="input w-full"
          value={form.role}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              role: e.target.value as 'buyer' | 'seller' | 'admin',
            }))
          }
          disabled={effectiveReadOnly || targetSuperAdmin}
        >
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      {isAdmin && isCreate && form.role === 'buyer' && (
        <label className="block space-y-1">
          <span className="form-label">Assign personal site access code *</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="input w-full font-mono"
            value={form.site_access_code}
            onChange={(e) => setForm((f) => ({ ...f, site_access_code: e.target.value }))}
            required
            disabled={effectiveReadOnly}
            placeholder="e.g. 0005"
          />
          <p className="form-hint">
            Type the code you are giving this buyer (from your offline list). Buyers cannot choose
            or browse codes — only admins assign them here.
          </p>
        </label>
      )}
      {isAdmin && isCreate && form.role === 'seller' && (
        <label className="block space-y-1">
          <span className="form-label">Assign personal site access code (optional)</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="input w-full font-mono"
            value={form.site_access_code}
            onChange={(e) => setForm((f) => ({ ...f, site_access_code: e.target.value }))}
            disabled={effectiveReadOnly}
            placeholder="e.g. 0005"
          />
        </label>
      )}
      {isAdmin && isEdit && form.site_access_code && (
        <div className="block space-y-1">
          <span className="form-label">Assigned site access code</span>
          <p className={`font-mono text-sm ${t.heading}`}>{form.site_access_code}</p>
          <p className="form-hint">Codes cannot be changed after creation. Assign only when adding a user.</p>
        </div>
      )}
      {(isSuperAdmin || isCreate) && (
        <label className="block space-y-1">
          <span className="form-label">Badge rating (optional)</span>
          <select
            className="input w-full"
            value={form.badge_rating}
            onChange={(e) => setForm((f) => ({ ...f, badge_rating: e.target.value }))}
            disabled={effectiveReadOnly}
          >
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={String(n)}>
                {n} star{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex flex-wrap gap-3 pt-2">
        {!effectiveReadOnly && (
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isCreate ? 'Create user' : 'Save changes'}
          </button>
        )}
        {isCreate && onCancel ? (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        ) : (
          <Link href={appPath('/admin/users')} className="btn-secondary">
            Back to users
          </Link>
        )}
        {isEdit && !readOnly && !effectiveReadOnly && userId && (
          <Link href={appPath(`/admin/users/${userId}`)} className="btn-secondary">
            View
          </Link>
        )}
        {readOnly && isEdit && userId && isAdmin && (!targetSuperAdmin || isSuperAdmin) && (
          <Link href={appPath(`/admin/users/${userId}/edit`)} className="btn-primary">
            Edit
          </Link>
        )}
      </div>
    </form>
    {isEdit && userId && (form.role === 'seller' || form.role === 'buyer') ? (
      <SellerPricelistAccessPanel userId={userId} userRole={form.role} />
    ) : null}
  </>
  )
}
