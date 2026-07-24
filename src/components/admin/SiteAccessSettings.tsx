'use client'

import { FormEvent, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'

type CodeStats = {
  total: number
  assigned: number
  available: number
}

type AccessStatus = {
  lockActive: boolean
  hasPassword: boolean
  hasCodes: boolean
  codeStats: CodeStats
  version: number
}

export default function SiteAccessSettings() {
  const t = useAppTheme()
  const { user, isAdmin } = useAuth()
  const [adminPassword, setAdminPassword] = useState('')
  const [status, setStatus] = useState<AccessStatus | null>(null)
  const [lockEnabled, setLockEnabled] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const loadStatus = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!user?.email || !adminPassword) {
      setError('Enter your super admin password to view or edit site access settings.')
      return
    }
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(appPath('/api/admin/site-access'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user.email,
          adminPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setStatus(data)
      setLockEnabled(data.lockActive)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!user?.email || !adminPassword) {
      setError('Super admin password is required.')
      return
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (lockEnabled && !status?.hasPassword && !newPassword.trim() && !status?.hasCodes) {
      setError(
        'Set a site access password and/or seed personal buyer codes before enabling the lock.'
      )
      return
    }

    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(appPath('/api/admin/site-access'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user.email,
          adminPassword,
          enabled: lockEnabled,
          newPassword: newPassword.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setStatus(data)
      setLockEnabled(data.lockActive)
      setNewPassword('')
      setConfirmPassword('')
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDisableLock = async () => {
    if (!user?.email || !adminPassword) {
      setError('Super admin password is required.')
      return
    }
    if (!confirm('Disable site access lock for everyone?')) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(appPath('/api/admin/site-access'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user.email,
          adminPassword,
          enabled: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to disable')
      setStatus(data)
      setLockEnabled(false)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) return null

  const stats = status?.codeStats

  return (
    <div className="card max-w-2xl space-y-6 border border-amber-500/30">
      <div>
        <h2 className="card-section-title">Site access</h2>
        <p className="form-hint mt-1">
          One shared <strong>site password</strong> for all visitors (stored encrypted in settings).
          Separate from the pool of personal 4-digit codes assigned to buyers in Admin → Users.
        </p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {saved && <p className="text-primary-400 text-sm">Site access settings saved.</p>}

      <form onSubmit={loadStatus} className="space-y-3">
        <label className="form-label">
          Your super admin password (to manage this section)
        </label>
        <input
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          className="input w-full"
          autoComplete="current-password"
        />
        <button type="submit" disabled={loading} className="btn-secondary text-sm disabled:opacity-50">
          {loading ? 'Loading...' : 'Unlock settings'}
        </button>
      </form>

      {status && (
        <form onSubmit={handleSave} className={`space-y-4 border-t pt-4 ${t.border}`}>
          <p className="form-hint">
            Lock status:{' '}
            <span className={status.lockActive ? 'text-amber-600 dark:text-amber-400' : t.body}>
              {status.lockActive ? 'Active — site is protected' : 'Off'}
            </span>
          </p>

          <div className={`space-y-3 rounded-lg border p-4 ${t.border}`}>
            <h3 className={`text-sm font-medium ${t.heading}`}>Site password (shared)</h3>
            {status.hasPassword && (
              <p className="form-hint">A site password is configured (stored encrypted).</p>
            )}
            <div>
              <label className="form-label">
                {status.hasPassword ? 'Set new site password' : 'Site access password'}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={status.hasPassword ? 'Leave blank to keep current' : 'Min. 4 characters'}
                className="input w-full"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="form-label">Confirm site password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input w-full"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className={`space-y-2 rounded-lg border p-4 ${t.border}`}>
            <h3 className={`text-sm font-medium ${t.heading}`}>Personal buyer codes (separate)</h3>
            <p className="form-hint">
              Codes live in the database table <code className="text-xs">site_access_codes</code>.
              Seed file on the server:{' '}
              <code className="text-xs">db/site_access_codes_seed.txt</code> (private,
              not in git — see <code className="text-xs">db/site_access_codes_seed.example.txt</code>
              ) — run <code className="text-xs">npm run db:seed-site-access-codes</code> after
              deploy.
            </p>
            {stats && (
              <p className="form-hint">
                Pool: {stats.total} total · {stats.available} available · {stats.assigned} assigned
              </p>
            )}
            <p className="form-hint">
              Assign codes when creating buyers in Admin → Users. Only assigned personal codes unlock
              the gate; unassigned pool codes do not work. Deleting a buyer returns their code to the
              available pool. Visitors can also use the shared site password.
            </p>
          </div>

          <label className="flex items-center gap-2 form-check-label cursor-pointer">
            <input
              type="checkbox"
              checked={lockEnabled}
              onChange={(e) => setLockEnabled(e.target.checked)}
              disabled={!status.hasCodes && !status.hasPassword && !newPassword.trim()}
              className="rounded border-dark-500 text-primary-500"
            />
            Require site access password for all visitors
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : 'Save site access'}
            </button>
            {status.lockActive && (
              <button
                type="button"
                disabled={saving}
                onClick={handleDisableLock}
                className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 text-sm disabled:opacity-50"
              >
                Disable lock
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
