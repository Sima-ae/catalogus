'use client'

import { useCallback, useEffect, useState } from 'react'
import { TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import { useChatMessageText } from '@/hooks/useChatMessageText'
import { formatMessage } from '@/lib/i18n'

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

export default function AdminChatTrash() {
  const { user } = useAuth()
  const { t } = useChatMessageText()
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState<string | null>(null)

  const headers = {
    'Content-Type': 'application/json',
    ...adminAuthHeaders(user),
  }

  const kindLabel = (kind: TrashItem['kind']) => {
    if (kind === 'thread') return t('chat.trash.kind.thread')
    if (kind === 'quote') return t('chat.trash.kind.quote')
    return t('chat.trash.kind.message')
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
    if (
      !window.confirm(
        formatMessage(t('chat.trash.confirmDelete'), { kind: kindLabel(item.kind) })
      )
    ) {
      return
    }
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
    if (!window.confirm(formatMessage(t('chat.trash.confirmEmpty'), { count: items.length }))) return
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
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold text-gray-900">{t('chat.trash.title')}</h3>
        {items.length ? (
          <button
            type="button"
            onClick={() => void emptyTrash()}
            disabled={workingId === '__empty__'}
            className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            <TrashIcon className="w-4 h-4" />
            {t('chat.trash.emptyAll')}
          </button>
        ) : null}
      </div>

      {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}

      {loading ? (
        <div className="text-sm text-gray-500">{t('chat.admin.loading')}</div>
      ) : items.length ? (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="px-4 py-3 bg-white flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {kindLabel(item.kind)}
                </div>
                <div className="font-medium text-gray-900 truncate">{item.label}</div>
                {item.subtitle ? (
                  <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>
                ) : null}
                <div className="text-[11px] text-gray-400 mt-1">{formatTime(item.deleted_at)}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => void restore(item)}
                  disabled={workingId === item.id}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  {t('chat.trash.restore')}
                </button>
                <button
                  type="button"
                  onClick={() => void permanentDelete(item)}
                  disabled={workingId === item.id}
                  className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {t('chat.trash.deleteForever')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-gray-500">{t('chat.trash.empty')}</div>
      )}
    </div>
  )
}
