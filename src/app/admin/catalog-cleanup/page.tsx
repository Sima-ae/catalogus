'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminPageShell from '@/components/admin/AdminPageShell'
import CategoryCheckboxList from '@/components/admin/CategoryCheckboxList'
import SearchableCheckboxScroller from '@/components/admin/SearchableCheckboxScroller'
import { useAuth } from '@/lib/auth-local'
import { useAppTheme } from '@/lib/theme-classes'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { parseJsonResponse } from '@/lib/fetch-json'
import { appPath } from '@/lib/paths'
import { useI18n } from '@/lib/i18n-context'
import { buildCategoryPickerOptions, type CategoryPickerOption } from '@/lib/category-picker'

type BrandOption = { id: string; name: string }

const DEFAULT_CUTOFF = '2025-01-01'

export default function AdminCatalogCleanupPage() {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const { user } = useAuth()

  const [categories, setCategories] = useState<CategoryPickerOption[]>([])
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedBrandNames, setSelectedBrandNames] = useState<string[]>([])
  const [createdBefore, setCreatedBefore] = useState(DEFAULT_CUTOFF)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!user) return
    setLoadingOptions(true)
    const headers = adminAuthHeaders(user)
    Promise.all([
      fetch(appPath('/api/admin/categories'), { headers, cache: 'no-store' }),
      fetch(appPath('/api/brands'), { cache: 'no-store' }),
    ])
      .then(async ([catRes, brandRes]) => {
        if (catRes.ok) {
          const data = await catRes.json()
          if (Array.isArray(data)) {
            setCategories(
              buildCategoryPickerOptions(
                data.map(
                  (c: {
                    id: string
                    name: string
                    parent_id?: string | null
                    parent_name?: string | null
                  }) => ({
                    id: c.id,
                    name: c.name,
                    parent_id: c.parent_id,
                    parent_name: c.parent_name,
                  })
                )
              )
            )
          }
        }
        if (brandRes.ok) {
          const data = await brandRes.json()
          if (Array.isArray(data)) {
            setBrands(
              data
                .map((b: { id: string; name: string }) => ({
                  id: String(b.id),
                  name: String(b.name),
                }))
                .sort((a, b) => a.name.localeCompare(b.name))
            )
          }
        }
      })
      .catch(() => setError(tr('admin.catalogCleanup.failed')))
      .finally(() => setLoadingOptions(false))
  }, [user, tr])

  const hasSelection = selectedCategoryIds.length > 0 || selectedBrandNames.length > 0

  const brandItems = useMemo(
    () => brands.map((b) => ({ id: b.name, label: b.name })),
    [brands]
  )

  const toggleCategory = useCallback((id: string) => {
    setPreviewCount(null)
    setSuccessMessage('')
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const toggleBrand = useCallback((name: string) => {
    setPreviewCount(null)
    setSuccessMessage('')
    setSelectedBrandNames((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    )
  }, [])

  const requestBody = useCallback(
    (dryRun: boolean, status: 'inactive' | 'trash') => ({
      categoryIds: selectedCategoryIds,
      brands: selectedBrandNames,
      albumDateBefore: createdBefore,
      status,
      dryRun,
    }),
    [createdBefore, selectedBrandNames, selectedCategoryIds]
  )

  const runArchive = useCallback(
    async (dryRun: boolean, status: 'inactive' | 'trash') => {
      if (!user) return
      if (!hasSelection) {
        setError(tr('admin.catalogCleanup.needSelection'))
        return
      }

      setWorking(true)
      setError('')
      setSuccessMessage('')
      if (!dryRun) setPreviewCount(null)

      try {
        const res = await fetch(appPath('/api/admin/products/bulk-archive'), {
          method: 'POST',
          headers: {
            ...adminAuthHeaders(user),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody(dryRun, status)),
        })
        const data = await parseJsonResponse<{
          error?: string
          matchCount?: number
          updated?: number
        }>(res)
        if (!res.ok) {
          throw new Error(data.error || tr('admin.catalogCleanup.failed'))
        }

        const count = dryRun ? Number(data.matchCount ?? 0) : Number(data.updated ?? 0)
        if (dryRun) {
          setPreviewCount(count)
        } else if (status === 'inactive') {
          setSuccessMessage(tr('admin.catalogCleanup.doneInactive').replace('{count}', String(count)))
        } else {
          setSuccessMessage(tr('admin.catalogCleanup.doneTrash').replace('{count}', String(count)))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : tr('admin.catalogCleanup.failed'))
      } finally {
        setWorking(false)
      }
    },
    [hasSelection, requestBody, tr, user]
  )

  const handlePreview = () => runArchive(true, 'inactive')

  const applyWithConfirm = async (status: 'inactive' | 'trash') => {
    if (!user || !hasSelection) {
      setError(tr('admin.catalogCleanup.needSelection'))
      return
    }

    setWorking(true)
    setError('')
    setSuccessMessage('')

    try {
      let count = previewCount
      if (count === null) {
        const previewRes = await fetch(appPath('/api/admin/products/bulk-archive'), {
          method: 'POST',
          headers: {
            ...adminAuthHeaders(user),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody(true, status)),
        })
        const previewData = await parseJsonResponse<{ error?: string; matchCount?: number }>(
          previewRes
        )
        if (!previewRes.ok) {
          throw new Error(previewData.error || tr('admin.catalogCleanup.failed'))
        }
        count = Number(previewData.matchCount ?? 0)
        setPreviewCount(count)
      }

      const confirmKey =
        status === 'inactive'
          ? 'admin.catalogCleanup.confirmInactive'
          : 'admin.catalogCleanup.confirmTrash'
      const msg = tr(confirmKey).replace('{count}', String(count))
      if (!window.confirm(msg)) return

      const res = await fetch(appPath('/api/admin/products/bulk-archive'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody(false, status)),
      })
      const data = await parseJsonResponse<{ error?: string; updated?: number }>(res)
      if (!res.ok) {
        throw new Error(data.error || tr('admin.catalogCleanup.failed'))
      }

      const updated = Number(data.updated ?? 0)
      if (status === 'inactive') {
        setSuccessMessage(
          tr('admin.catalogCleanup.doneInactive').replace('{count}', String(updated))
        )
      } else {
        setSuccessMessage(tr('admin.catalogCleanup.doneTrash').replace('{count}', String(updated)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('admin.catalogCleanup.failed'))
    } finally {
      setWorking(false)
    }
  }

  const handleSetInactive = () => void applyWithConfirm('inactive')

  const handleMoveToTrash = () => void applyWithConfirm('trash')

  return (
    <AdminPageShell titleKey="admin.page.catalogCleanup">
      <p className={`text-sm mb-6 max-w-3xl ${t.muted}`}>{tr('admin.catalogCleanup.intro')}</p>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {successMessage ? (
        <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`rounded-xl border p-4 sm:p-5 ${t.surface} ${t.border}`}>
          <h2 className={`text-base font-semibold mb-3 ${t.heading}`}>
            {tr('admin.catalogCleanup.categories')}
          </h2>
          {loadingOptions ? (
            <p className={`text-sm ${t.muted}`}>…</p>
          ) : (
            <CategoryCheckboxList
              options={categories}
              selectedIds={selectedCategoryIds}
              onToggle={toggleCategory}
              disabled={working}
              maxHeightClass="max-h-72"
              searchPlaceholder={tr('admin.catalogCleanup.searchCategories')}
            />
          )}
        </section>

        <section className={`rounded-xl border p-4 sm:p-5 ${t.surface} ${t.border}`}>
          <h2 className={`text-base font-semibold mb-3 ${t.heading}`}>
            {tr('admin.catalogCleanup.brands')}
          </h2>
          {loadingOptions ? (
            <p className={`text-sm ${t.muted}`}>…</p>
          ) : (
            <SearchableCheckboxScroller
              items={brandItems}
              searchPlaceholder={tr('admin.catalogCleanup.searchBrands')}
              maxHeightClass="max-h-72"
              disabled={working}
              renderItem={(item) => (
                <label
                  className={`flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1.5 ${
                    selectedBrandNames.includes(item.id)
                      ? t.isDark
                        ? 'bg-primary-500/20'
                        : 'bg-primary-50'
                      : t.isDark
                        ? 'hover:bg-dark-900/50'
                        : 'hover:bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedBrandNames.includes(item.id)}
                    onChange={() => toggleBrand(item.id)}
                    disabled={working}
                    className={`rounded shrink-0 h-4 w-4 accent-primary-600 ${
                      t.isDark ? 'border-dark-500' : 'border-gray-400'
                    }`}
                  />
                  <span className={`text-sm ${t.body}`}>{item.label}</span>
                </label>
              )}
            />
          )}
        </section>
      </div>

      <section className={`mt-6 rounded-xl border p-4 sm:p-5 ${t.surface} ${t.border}`}>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
          <div>
            <label htmlFor="created-before" className={`block text-sm font-medium mb-1.5 ${t.heading}`}>
              {tr('admin.catalogCleanup.createdBefore')}
            </label>
            <input
              id="created-before"
              type="date"
              value={createdBefore}
              disabled={working}
              onChange={(e) => {
                setCreatedBefore(e.target.value)
                setPreviewCount(null)
                setSuccessMessage('')
              }}
              className="input-field w-full sm:w-auto"
            />
            <p className={`mt-1.5 text-xs ${t.muted}`}>
              {tr('admin.catalogCleanup.createdBeforeHelp')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <button
              type="button"
              className="btn-secondary"
              disabled={working || !hasSelection}
              onClick={() => void handlePreview()}
            >
              {tr('admin.catalogCleanup.preview')}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={working || !hasSelection}
              onClick={handleSetInactive}
            >
              {tr('admin.catalogCleanup.setInactive')}
            </button>
            <button
              type="button"
              className="btn-secondary text-red-600 dark:text-red-400"
              disabled={working || !hasSelection}
              onClick={handleMoveToTrash}
            >
              {tr('admin.catalogCleanup.moveToTrash')}
            </button>
          </div>
        </div>

        {previewCount !== null ? (
          <p className={`mt-4 text-sm font-medium ${t.heading}`}>
            {tr('admin.catalogCleanup.previewCount').replace('{count}', String(previewCount))}
          </p>
        ) : null}
        <p className={`mt-3 text-xs ${t.muted}`}>{tr('admin.catalogCleanup.backfillHint')}</p>
      </section>
    </AdminPageShell>
  )
}
