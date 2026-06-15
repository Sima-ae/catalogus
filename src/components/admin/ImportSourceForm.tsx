'use client'

import { useAppTheme } from '@/lib/theme-classes'
import { useI18n } from '@/lib/i18n-context'
import { getCategoryPickerLabel, getTopCategoryLabel } from '@/lib/i18n-categories'
import type { CategoryPickerOption } from '@/lib/category-picker'
import type { ImportSourceType } from '@/lib/import-db'
import { isArFactoryWooStoreUrl } from '@/lib/woocommerce/ar-factory'
import { AR_FACTORY_DEFAULT_SHIPPING_COST } from '@/lib/woocommerce/import-shipping'

export type ImportSourceFormValues = {
  name: string
  source_type: ImportSourceType
  yupoo_category_url: string
  yupoo_access_password: string
  woocommerce_store_url: string
  woocommerce_category_slug: string
  woocommerce_price_mode: 'storefront' | 'purchase_price'
  woocommerce_shipping_cost: string
  catalog_list_url: string
  catalog_category_id: string
  catalog_brand_id: string
}

type BrandOption = { id: string; name: string }

type Props = {
  values: ImportSourceFormValues
  onChange: (values: ImportSourceFormValues) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel?: () => void
  submitLabel: string
  saving: boolean
  categories: CategoryPickerOption[]
  brands: BrandOption[]
  /** When editing, source already has a saved password (value is never shown). */
  hasPassword?: boolean
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
  hasPassword = false,
}: Props) {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const isWoo = values.source_type === 'woocommerce'
  const isFacebook = values.source_type === 'facebook'
  const isLkxox = values.source_type === 'lkxox'

  const set = (patch: Partial<ImportSourceFormValues>) =>
    onChange({ ...values, ...patch })

  const selectedCategory = categories.find((c) => c.id === values.catalog_category_id)

  const normalizeSourceType = (raw: string): ImportSourceType => {
    if (raw === 'woocommerce') return 'woocommerce'
    if (raw === 'facebook') return 'facebook'
    if (raw === 'lkxox') return 'lkxox'
    return 'yupoo'
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className={`text-sm ${t.muted}`}>Name</span>
          <input
            className="input w-full"
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={
              isWoo
                ? 'e.g. StuntXL — all products'
                : isFacebook
                  ? 'e.g. Facebook supplier posts'
                  : isLkxox
                    ? 'e.g. Lkxox — new products'
                    : 'e.g. BURBERRY 2'
            }
            required
          />
        </label>
        <label className="block space-y-1">
          <span className={`text-sm ${t.muted}`}>Source type</span>
          <select
            className="input w-full"
            value={values.source_type}
            onChange={(e) => set({ source_type: normalizeSourceType(e.target.value) })}
          >
            <option value="yupoo">Yupoo</option>
            <option value="woocommerce">WooCommerce</option>
            <option value="facebook">Facebook</option>
            <option value="lkxox">Lkxox (Zen Cart)</option>
          </select>
        </label>

        {isFacebook ? (
          <p className={`md:col-span-2 text-xs ${t.muted}`}>
            Facebook sources import one post at a time. Title, description, and images come from
            the post; price, SKU, category, and brand are entered per import below.
          </p>
        ) : isLkxox ? (
          <>
            <label className="block space-y-1 md:col-span-2">
              <span className={`text-sm ${t.muted}`}>Catalog list URL</span>
              <input
                className="input w-full"
                value={values.catalog_list_url}
                onChange={(e) => set({ catalog_list_url: e.target.value })}
                placeholder="https://www.lkxox.com/products_new.html?disp_order=6"
                required
              />
              <p className={`text-xs mt-1 ${t.muted}`}>
                Paginated product listing — worker discovers all pages (e.g. 3040 products).
              </p>
            </label>
          </>
        ) : isWoo ? (
          <>
            <label className="block space-y-1 md:col-span-2">
              <span className={`text-sm ${t.muted}`}>WooCommerce store URL</span>
              <input
                className="input w-full"
                value={values.woocommerce_store_url}
                onChange={(e) => set({ woocommerce_store_url: e.target.value })}
                placeholder="https://stuntxl.com"
                required
              />
              <p className={`text-xs mt-1 ${t.muted}`}>
                Site root only — not a single product URL (use Import product URL below).
              </p>
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className={`text-sm ${t.muted}`}>WooCommerce category slug (optional)</span>
              <input
                className="input w-full"
                value={values.woocommerce_category_slug}
                onChange={(e) => set({ woocommerce_category_slug: e.target.value })}
                placeholder="e.g. rolex or dames-horloges — leave empty for all products"
              />
            </label>
            <label className="flex items-start gap-2 md:col-span-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={values.woocommerce_price_mode === 'purchase_price'}
                onChange={(e) =>
                  set({
                    woocommerce_price_mode: e.target.checked ? 'purchase_price' : 'storefront',
                  })
                }
              />
              <span className="space-y-1">
                <span className={`text-sm block ${t.muted}`}>
                  Import WooCommerce price as purchase price (recommended for suppliers)
                </span>
                <span className={`text-xs block ${t.muted}`}>
                  Enabled: shop price stays at Price on request; Woo price is stored as
                  purchase price. Disable only for retail stores (e.g. sell at Woo price on
                  the shop).
                </span>
              </span>
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className={`text-sm ${t.muted}`}>Shipping cost (EUR, optional)</span>
              <input
                className="input w-full max-w-xs"
                type="number"
                min="0"
                step="0.01"
                value={values.woocommerce_shipping_cost}
                onChange={(e) => set({ woocommerce_shipping_cost: e.target.value })}
                placeholder={
                  isArFactoryWooStoreUrl(values.woocommerce_store_url)
                    ? String(AR_FACTORY_DEFAULT_SHIPPING_COST)
                    : 'e.g. 30'
                }
              />
              <p className={`text-xs mt-1 ${t.muted}`}>
                Applied to every product imported from this source. Leave empty to leave shipping
                cost unset.
              </p>
            </label>
          </>
        ) : (
          <>
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
            <label className="block space-y-1 md:col-span-2">
              <span className={`text-sm ${t.muted}`}>Yupoo access password (optional)</span>
              <input
                className="input w-full"
                type="password"
                autoComplete="new-password"
                value={values.yupoo_access_password}
                onChange={(e) => set({ yupoo_access_password: e.target.value })}
                placeholder={
                  hasPassword
                    ? 'Leave blank to keep current password'
                    : 'Only if supplier homepage is encrypted'
                }
              />
              {hasPassword && !values.yupoo_access_password ? (
                <p className={`text-xs mt-1 ${t.muted}`}>Password is saved on this source.</p>
              ) : null}
            </label>
          </>
        )}

        {!isFacebook ? (
          <>
            <label className="block space-y-1">
              <span className={`text-sm ${t.muted}`}>Catalog category (fallback)</span>
              <select
                className="input w-full font-sans"
                value={values.catalog_category_id}
                onChange={(e) => set({ catalog_category_id: e.target.value })}
                required
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getCategoryPickerLabel(c, tr)}
                  </option>
                ))}
              </select>
              {selectedCategory?.isSubcategory && selectedCategory.parent_name ? (
                <p className={`text-xs mt-1 ${t.muted}`}>
                  {getTopCategoryLabel(selectedCategory.parent_name, tr)} ›{' '}
                  {getTopCategoryLabel(selectedCategory.name, tr)}
                </p>
              ) : isWoo ? (
                <p className={`text-xs mt-1 ${t.muted}`}>
                  Used when the WooCommerce product has no category or no name match in catalog.
                </p>
              ) : isLkxox ? (
                <p className={`text-xs mt-1 ${t.muted}`}>
                  Applied to all imported products. Brand is auto-detected from each product page.
                </p>
              ) : null}
            </label>
            <label className="block space-y-1">
              <span className={`text-sm ${t.muted}`}>Catalog brand (optional)</span>
              <select
                className="input w-full"
                value={values.catalog_brand_id}
                onChange={(e) => set({ catalog_brand_id: e.target.value })}
              >
                <option value="">None — use WooCommerce brand when present</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
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
