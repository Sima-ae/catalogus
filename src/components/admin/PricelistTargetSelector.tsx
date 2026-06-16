'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import {
  readAdminPricelistTargetSlug,
  writeAdminPricelistTargetSlug,
  type PricelistTargetOption,
} from '@/lib/admin-pricelist-target'
import { PRICELIST_OWNER_QUERY_PLATFORM } from '@/lib/pricelist-constants'

type Props = {
  className?: string
  label?: string
  compact?: boolean
  onChange?: (slug: string) => void
}

export default function PricelistTargetSelector({
  className = '',
  label = 'Pricelist',
  compact = false,
  onChange,
}: Props) {
  const { user } = useAuth()
  const [options, setOptions] = useState<PricelistTargetOption[]>([])
  const [value, setValue] = useState(PRICELIST_OWNER_QUERY_PLATFORM)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setValue(readAdminPricelistTargetSlug())
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch(appPath('/api/pricelist/owners'), {
      headers: catalogAuthHeaders(user),
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load pricelist pages')
        const owners = Array.isArray(data.owners) ? data.owners : []
        const mapped: PricelistTargetOption[] = owners
          .filter((o: { kind?: string }) => o.kind === 'platform')
          .map((o: { id: string; label: string }) => ({
            slug: String(o.id),
            label: String(o.label),
          }))
        if (!cancelled) {
          setOptions(
            mapped.length
              ? mapped
              : [{ slug: PRICELIST_OWNER_QUERY_PLATFORM, label: 'Platform pricelist' }]
          )
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([{ slug: PRICELIST_OWNER_QUERY_PLATFORM, label: 'Platform pricelist' }])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const handleChange = useCallback(
    (slug: string) => {
      setValue(slug)
      writeAdminPricelistTargetSlug(slug)
      onChange?.(slug)
    },
    [onChange]
  )

  if (!user || user.role !== 'admin') return null

  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      {!compact && (
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      )}
      <select
        className="input-field text-sm min-w-[10rem]"
        value={value}
        disabled={loading || options.length === 0}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function useAdminPricelistTargetSlug(): string {
  const [slug, setSlug] = useState(PRICELIST_OWNER_QUERY_PLATFORM)
  useEffect(() => {
    setSlug(readAdminPricelistTargetSlug())
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'catalogus.admin.pricelistTarget') {
        setSlug(readAdminPricelistTargetSlug())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return slug
}
