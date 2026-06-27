'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'
import type { SiteTickerMessageRow } from '@/lib/site-ticker-db'
import { parseTickerTranslations } from '@/lib/site-ticker'

function sortRows(a: SiteTickerMessageRow, b: SiteTickerMessageRow) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return a.id - b.id
}

export default function SiteTickerMessagesAdmin() {
  const t = useAppTheme()
  const { user } = useAuth()
  const [items, setItems] = useState<SiteTickerMessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newNl, setNewNl] = useState('')
  const [newEn, setNewEn] = useState('')
  const [savingId, setSavingId] = useState<number | 'new' | null>(null)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(appPath('/api/admin/site-ticker-messages'), {
        headers: adminAuthHeaders(user),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load ticker messages')
      const list = Array.isArray(data.items) ? (data.items as SiteTickerMessageRow[]) : []
      list.sort(sortRows)
      setItems(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticker messages')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!notice) return
    const tid = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(tid)
  }, [notice])

  const createMessage = async () => {
    const nl = newNl.trim()
    const en = newEn.trim()
    if (!nl && !en) {
      setError('Enter at least a Dutch or English message.')
      return
    }
    setSavingId('new')
    setError('')
    try {
      const translations: Record<string, string> = {}
      if (nl) translations.nl = nl
      if (en) translations.en = en
      const res = await fetch(appPath('/api/admin/site-ticker-messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(user) },
        body: JSON.stringify({ translations, isActive: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create message')
      setNewNl('')
      setNewEn('')
      setNotice('Ticker message added.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create message')
    } finally {
      setSavingId(null)
    }
  }

  const saveRow = async (row: SiteTickerMessageRow, nl: string, en: string) => {
    const translations = { ...parseTickerTranslations(row.translations) }
    const nlTrim = nl.trim()
    const enTrim = en.trim()
    if (nlTrim) translations.nl = nlTrim
    else delete translations.nl
    if (enTrim) translations.en = enTrim
    else delete translations.en
    if (!Object.values(translations).some((v) => v.trim())) {
      setError('At least one language is required.')
      return
    }
    setSavingId(row.id)
    setError('')
    try {
      const res = await fetch(appPath(`/api/admin/site-ticker-messages/${row.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(user) },
        body: JSON.stringify({ translations }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save message')
      setNotice('Ticker message saved.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save message')
    } finally {
      setSavingId(null)
    }
  }

  const toggleActive = async (row: SiteTickerMessageRow) => {
    setSavingId(row.id)
    setError('')
    try {
      const res = await fetch(appPath(`/api/admin/site-ticker-messages/${row.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(user) },
        body: JSON.stringify({ isActive: !row.isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update message')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update message')
    } finally {
      setSavingId(null)
    }
  }

  const deleteRow = async (row: SiteTickerMessageRow) => {
    if (!window.confirm('Delete this ticker message?')) return
    setSavingId(row.id)
    setError('')
    try {
      const res = await fetch(appPath(`/api/admin/site-ticker-messages/${row.id}`), {
        method: 'DELETE',
        headers: adminAuthHeaders(user),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete message')
      setNotice('Ticker message deleted.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message')
    } finally {
      setSavingId(null)
    }
  }

  const moveRow = async (row: SiteTickerMessageRow, direction: -1 | 1) => {
    const sorted = [...items].sort(sortRows)
    const index = sorted.findIndex((r) => r.id === row.id)
    const neighbor = sorted[index + direction]
    if (!neighbor) return
    setSavingId(row.id)
    setError('')
    try {
      await Promise.all([
        fetch(appPath(`/api/admin/site-ticker-messages/${row.id}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(user) },
          body: JSON.stringify({ sortOrder: neighbor.sortOrder }),
        }),
        fetch(appPath(`/api/admin/site-ticker-messages/${neighbor.id}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(user) },
          body: JSON.stringify({ sortOrder: row.sortOrder }),
        }),
      ])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder messages')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="card max-w-3xl space-y-4">
      <div>
        <h2 className="card-section-title">Message ticker</h2>
        <p className={`text-sm ${t.muted}`}>
          Manage scrolling messages shown in the bar below the header on all pages (shop,
          dashboards, admin).
        </p>
      </div>

      {error ? <p className="text-red-600 dark:text-red-400 text-sm">{error}</p> : null}
      {notice ? (
        <p className="text-gray-900 dark:text-primary-400 text-sm font-medium">{notice}</p>
      ) : null}

      <div className="space-y-3 rounded-lg border border-gray-200 dark:border-dark-700 p-4">
        <h3 className="text-sm font-semibold">Add message</h3>
        <div>
          <label className="form-label">Dutch (NL)</label>
          <input
            type="text"
            value={newNl}
            onChange={(e) => setNewNl(e.target.value)}
            className="input w-full"
            placeholder="Bijv. Gratis verzending vanaf €50"
            maxLength={600}
          />
        </div>
        <div>
          <label className="form-label">English (EN, optional)</label>
          <input
            type="text"
            value={newEn}
            onChange={(e) => setNewEn(e.target.value)}
            className="input w-full"
            placeholder="e.g. Free shipping from €50"
            maxLength={600}
          />
        </div>
        <button
          type="button"
          onClick={() => void createMessage()}
          disabled={savingId === 'new'}
          className="btn-primary disabled:opacity-50"
        >
          {savingId === 'new' ? 'Adding...' : 'Add message'}
        </button>
      </div>

      {loading ? (
        <p className={t.muted}>Loading ticker messages...</p>
      ) : items.length === 0 ? (
        <p className={t.muted}>No ticker messages yet.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((row) => (
            <TickerRowEditor
              key={row.id}
              row={row}
              saving={savingId === row.id}
              onSave={saveRow}
              onToggleActive={() => void toggleActive(row)}
              onDelete={() => void deleteRow(row)}
              onMoveUp={() => void moveRow(row, -1)}
              onMoveDown={() => void moveRow(row, 1)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function TickerRowEditor({
  row,
  saving,
  onSave,
  onToggleActive,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  row: SiteTickerMessageRow
  saving: boolean
  onSave: (row: SiteTickerMessageRow, nl: string, en: string) => void
  onToggleActive: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const t = useAppTheme()
  const translations = parseTickerTranslations(row.translations)
  const [nl, setNl] = useState(translations.nl ?? '')
  const [en, setEn] = useState(translations.en ?? '')

  useEffect(() => {
    const tr = parseTickerTranslations(row.translations)
    setNl(tr.nl ?? '')
    setEn(tr.en ?? '')
  }, [row])

  return (
    <li className="rounded-lg border border-gray-200 dark:border-dark-700 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`text-xs font-medium ${row.isActive ? 'text-green-600' : t.muted}`}>
          {row.isActive ? 'Active' : 'Hidden'}
        </span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onMoveUp} className="btn-secondary text-xs px-2 py-1">
            ↑
          </button>
          <button type="button" onClick={onMoveDown} className="btn-secondary text-xs px-2 py-1">
            ↓
          </button>
          <button type="button" onClick={onToggleActive} className="btn-secondary text-xs px-2 py-1">
            {row.isActive ? 'Hide' : 'Show'}
          </button>
          <button type="button" onClick={onDelete} className="btn-secondary text-xs px-2 py-1">
            Delete
          </button>
        </div>
      </div>
      <div>
        <label className="form-label">Dutch (NL)</label>
        <input
          type="text"
          value={nl}
          onChange={(e) => setNl(e.target.value)}
          className="input w-full"
          maxLength={600}
        />
      </div>
      <div>
        <label className="form-label">English (EN)</label>
        <input
          type="text"
          value={en}
          onChange={(e) => setEn(e.target.value)}
          className="input w-full"
          maxLength={600}
        />
      </div>
      <button
        type="button"
        onClick={() => onSave(row, nl, en)}
        disabled={saving}
        className="btn-primary disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </li>
  )
}
