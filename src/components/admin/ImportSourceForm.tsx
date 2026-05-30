'use client'

import { useAppTheme } from '@/lib/theme-classes'

export type ImportSourceFormValues = {
  name: string
  yupoo_category_url: string
  catalog_category_id: string
  catalog_brand_id: string
}

type CategoryOption = { id: string; name: string }
type BrandOption = { id: string; name: string }

type Props = {
  values: ImportSourceFormValues
  onChange: (values: ImportSourceFormValues) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel?: () => void
  submitLabel: string
  saving: boolean
  categories: CategoryOption[]
  brands: BrandOption[]
}

export default function ImportSourceForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
  categories,
  brands,
}: Props) {
  const t = useAppTheme()

  const set = (patch: Partial<ImportSourceFormValues>) =>
    onChange({ ...values, ...patch })

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className={`text-sm ${t.muted}`}>Name</span>
          <input
            className="input w-full"
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. BURBERRY 2"
            required
          />
        </label>
        <label className="block space-y-1 md:col-span-2">
          <span className={`text-sm ${t.muted}`}>Yupoo category URL</span>
          <input
            className="input w-full"
            value={values.yupoo_category_url}
            onChange={(e) => set({ yupoo_category_url: e.target.value })}
            placeholder="https://xxx.x.yupoo.com/categories/..."
            required
          />
        </label>
        <label className="block space-y-1">
          <span className={`text-sm ${t.muted}`}>Catalog category</span>
          <select
            className="input w-full"
            value={values.catalog_category_id}
            onChange={(e) => set({ catalog_category_id: e.target.value })}
            required
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={`text-sm ${t.muted}`}>Catalog brand (optional)</span>
          <select
            className="input w-full"
            value={values.catalog_brand_id}
            onChange={(e) => set({ catalog_brand_id: e.target.value })}
          >
            <option value="">None</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="btn-secondary" disabled={saving} onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
