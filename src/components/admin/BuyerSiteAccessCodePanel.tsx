'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'

type Assignment = {
  code: string
  assignedAt: string | null
}

type PoolStats = {
  total: number
  assigned: number
  available: number
}

type Props = {
  userId?: string
  role: 'buyer' | 'seller' | 'admin'
  readOnly?: boolean
  /** Create flow: controlled draft before user exists */
  draftCode?: string
  onDraftCodeChange?: (code: string) => void
  onAssigned?: (code: string) => void
}

export default function BuyerSiteAccessCodePanel({
  userId,
  role,
  readOnly = false,
  draftCode = '',
  onDraftCodeChange,
  onAssigned,
}: Props) {
  const t = useAppTheme()
  const { user: actor, isAdmin, isSuperAdmin } = useAuth()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(Boolean(userId && role === 'buyer'))
  const [input, setInput] = useState(draftCode)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pickingRandom, setPickingRandom] = useState(false)
  const [inputLocked, setInputLocked] = useState(false)
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isCreate = !userId
  const isBuyer = role === 'buyer'

  const loadAssignment = useCallback(() => {
    if (!userId || !isBuyer || !isAdmin) return
    setLoading(true)
    setError(null)
    fetch(appPath(`/api/admin/users/${userId}/site-access-code`), {
      headers: adminAuthHeaders(actor),
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load access code')
        if (data && typeof data.code === 'string') {
          setAssignment({ code: data.code, assignedAt: data.assignedAt ?? null })
        } else {
          setAssignment(null)
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load access code')
      })
      .finally(() => setLoading(false))
  }, [userId, isBuyer, isAdmin, actor])

  const loadPoolStats = useCallback(() => {
    if (!isAdmin) return
    fetch(appPath('/api/admin/site-access/codes'), {
      headers: adminAuthHeaders(actor),
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) return
        if (data?.stats) setPoolStats(data.stats as PoolStats)
      })
      .catch(() => {})
  }, [isAdmin, actor])

  useEffect(() => {
    loadAssignment()
    loadPoolStats()
  }, [loadAssignment, loadPoolStats])

  useEffect(() => {
    if (isCreate) {
      setInput(draftCode)
      if (!draftCode) setInputLocked(false)
    }
  }, [draftCode, isCreate])

  const handleInputChange = (value: string) => {
    if (inputLocked) return
    setInput(value)
    if (isCreate) onDraftCodeChange?.(value)
    setSaved(false)
  }

  const handlePickRandom = async () => {
    setPickingRandom(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(appPath('/api/admin/site-access/codes/random'), {
        method: 'POST',
        headers: adminAuthHeaders(actor),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to pick a random code')
      const code = String(data.code ?? '')
      if (!code) throw new Error('No code returned')
      setInput(code)
      setInputLocked(true)
      if (isCreate) onDraftCodeChange?.(code)
      if (data.stats) setPoolStats(data.stats as PoolStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pick a random code')
    } finally {
      setPickingRandom(false)
    }
  }

  const handleAssign = async () => {
    const code = input.trim()
    if (!code) {
      setError('Enter an access code from your offline pool')
      return
    }
    if (isCreate) return

    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(appPath(`/api/admin/users/${userId}/site-access-code`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(actor) },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to assign code')
      setAssignment({ code: data.code, assignedAt: data.assignedAt ?? null })
      setInput(data.code)
      setInputLocked(false)
      setEditing(false)
      setSaved(true)
      loadPoolStats()
      onAssigned?.(data.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign code')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!userId) return
    const code = input.trim()
    if (!code) {
      setError('Enter a new access code')
      return
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(appPath(`/api/admin/users/${userId}/site-access-code`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(actor) },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update code')
      setAssignment({ code: data.code, assignedAt: data.assignedAt ?? null })
      setInput(data.code)
      setInputLocked(false)
      setEditing(false)
      setSaved(true)
      loadPoolStats()
      onAssigned?.(data.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update code')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!userId || !confirm('Remove this access code from the buyer? The code returns to the pool.')) {
      return
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(appPath(`/api/admin/users/${userId}/site-access-code`), {
        method: 'DELETE',
        headers: adminAuthHeaders(actor),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove code')
      setAssignment(null)
      setInput('')
      setInputLocked(false)
      setEditing(false)
      loadPoolStats()
      onAssigned?.('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove code')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin || !isBuyer) return null

  const locked = Boolean(assignment) && !editing
  const canAssign = !readOnly && !isCreate && !assignment
  const canEditDraft = isCreate && !readOnly
  const canPickRandom =
    !readOnly && !assignment && !editing && (canAssign || canEditDraft)
  const inputReadOnly =
    readOnly || (inputLocked && !editing) || (Boolean(assignment) && !editing)
  const showSuperAdminActions = isSuperAdmin && !readOnly && Boolean(assignment) && !isCreate

  return (
    <div className="card h-full flex flex-col space-y-4">
      <div>
        <h2 className="card-section-title">Personal access code</h2>
        <p className={`form-hint mt-1 ${t.muted}`}>
          One code from your pool per buyer. Codes work at the site gate without login — assignment
          is for your records only.
        </p>
        {poolStats && poolStats.total > 0 && (
          <p className={`form-hint mt-1 ${t.muted}`}>
            {poolStats.available} of {poolStats.total} codes still free in the pool.
          </p>
        )}
      </div>

      {loading ? (
        <p className={t.muted}>Loading code…</p>
      ) : (
        <>
          {error && (
            <p className="text-red-500 dark:text-red-400 text-sm" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="text-primary-600 dark:text-primary-400 text-sm">Code saved.</p>
          )}

          {locked ? (
            <div className={`rounded-lg border p-4 ${t.border}`}>
              <p className="form-label mb-1">Assigned code</p>
              <p className={`font-mono text-2xl tracking-widest ${t.heading}`}>{assignment?.code}</p>
              {assignment?.assignedAt && (
                <p className={`text-xs mt-2 ${t.muted}`}>
                  Assigned {new Date(assignment.assignedAt).toLocaleString()}
                </p>
              )}
              <p className={`form-hint mt-2`}>
                Locked — only super admin can change or remove after assignment.
              </p>
            </div>
          ) : (
            <label className="block space-y-1">
              <span className="form-label">
                {isCreate ? 'Access code (optional)' : 'Enter access code'}
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="input w-full font-mono text-lg tracking-widest"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="0000"
                disabled={saving || pickingRandom || (!canAssign && !canEditDraft && !editing)}
                readOnly={inputReadOnly}
              />
              {inputLocked && !locked && (
                <p className="form-hint">
                  Code locked — use Assign code to confirm, or pick another random code.
                </p>
              )}
              {isCreate && !inputLocked && (
                <p className="form-hint">
                  Optional now — you can assign after saving the user, enter manually, or pick a
                  random free code.
                </p>
              )}
            </label>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {canPickRandom && (
              <button
                type="button"
                className="btn-secondary"
                disabled={saving || pickingRandom || (poolStats?.available === 0)}
                onClick={() => void handlePickRandom()}
              >
                {pickingRandom
                  ? 'Picking…'
                  : inputLocked
                    ? 'Pick another code'
                    : 'Pick random code'}
              </button>
            )}
            {canAssign && (
              <button
                type="button"
                className="btn-primary"
                disabled={saving || !input.trim()}
                onClick={() => void handleAssign()}
              >
                {saving ? 'Saving…' : 'Assign code'}
              </button>
            )}
            {showSuperAdminActions && !editing && (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={saving}
                  onClick={() => {
                    setEditing(true)
                    setInput(assignment?.code ?? '')
                    setError(null)
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-red-500/50 text-red-500 dark:text-red-400 hover:bg-red-500/10 text-sm disabled:opacity-50"
                  disabled={saving}
                  onClick={() => void handleRemove()}
                >
                  Remove
                </button>
              </>
            )}
            {showSuperAdminActions && editing && (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving || !input.trim()}
                  onClick={() => void handleSaveEdit()}
                >
                  {saving ? 'Saving…' : 'Save code'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false)
                    setInput(assignment?.code ?? '')
                    setError(null)
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
