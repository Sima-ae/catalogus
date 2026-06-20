'use client'

import { useCallback, useEffect, useState } from 'react'
import { TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'

type TrashItem = {
  id: string
  kind: 'thread' | 'message' | 'quote'
  label: string
  subtitle: string | null
  deleted_at: string
  conversation_id: string | null
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, cache: 'no-store', credentials: 'include' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(String(data?.error || `HTTP_${res.status}`))
  return data
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function kindLabel(kind: TrashItem['kind']) {
  if (kind === 'thread') return 'Thread'
  if (kind === 'quote') return 'Quote'
  return 'Message'
}

export default function AdminChatTrash() {
  const { user } = useAuth()
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState<string | null>(null)

  const headers = {
    'Content-Type': 'application/json',
    ...adminAuthHeaders(user),
  }

  const loadTrash = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchJson(appPath('/api/admin/chat/trash'), {
        headers: adminAuthHeaders(user),
      })
      setItems(data.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadTrash()
  }, [loadTrash])

  const restore = async (item: TrashItem) => {
    setWorkingId(item.id)
    try {
      await fetchJson(appPath('/api/admin/chat/trash/restore'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ kind: item.kind, id: item.id }),
      })
      await loadTrash()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setWorkingId(null)
    }
  }

  const permanentDelete = async (item: TrashItem) => {
    if (!window.confirm(`Permanently delete this ${item.kind}? This cannot be undone.`)) return
    setWorkingId(item.id)
    try {
      await fetchJson(appPath('/api/admin/chat/trash/permanent-delete'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ kind: item.kind, id: item.id }),
      })
      await loadTrash()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setWorkingId(null)
    }
  }

  const emptyTrash = async () => {
    if (!items.length) return
    if (!window.confirm(`Permanently delete all ${items.length} items in chat trash?`)) return
    setWorkingId('__empty__')
    try {
      await fetchJson(appPath('/api/admin/chat/trash/empty'), {
        method: 'POST',
        headers,
      })
      await loadTrash()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div className="flex flex-col min-h-[520px]">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-900">Chat trash</div>
          <div className="text-xs text-gray-500">
            Soft-deleted threads, quotes, and messages. Only super admin can permanently delete.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadTrash()}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => void emptyTrash()}
              disabled={workingId === '__empty__'}
              className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
              Empty trash
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</div>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading trash…</div>
        ) : items.length ? (
          <ul>
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="border-b border-gray-100 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 uppercase">
                        {kindLabel(item.kind)}
                      </span>
                      <span className="font-medium text-gray-900 truncate">{item.label}</span>
                    </div>
                    {item.subtitle ? (
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{item.subtitle}</div>
                    ) : null}
                    <div className="text-[11px] text-gray-400 mt-1">{formatTime(item.deleted_at)}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={workingId === item.id}
                      onClick={() => void restore(item)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      disabled={workingId === item.id}
                      onClick={() => void permanentDelete(item)}
                      className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete forever
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-sm text-gray-500">Chat trash is empty.</div>
        )}
      </div>
    </div>
  )
}
