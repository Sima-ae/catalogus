'use client'

import type { ProductOptions } from '@/lib/product-options'
import { useAppTheme } from '@/lib/theme-classes'
import { useI18n } from '@/lib/i18n-context'

type Props = {
  options: ProductOptions
  onChange: (options: ProductOptions) => void
  showPurchasePrice?: boolean
  disabled?: boolean
}

export default function ProductOptionsEditor({
  options,
  onChange,
  showPurchasePrice = true,
  disabled = false,
}: Props) {
  const t = useAppTheme()
  const { t: tr } = useI18n()

  const updateValue = (
    groupIndex: number,
    valueIndex: number,
    field: 'price' | 'purchase_price' | 'original_price',
    raw: string
  ) => {
    const next = options.map((group, gi) => {
      if (gi !== groupIndex) return group
      return {
        ...group,
        values: group.values.map((value, vi) => {
          if (vi !== valueIndex) return value
          if (field === 'price') {
            const n = raw === '' ? 0 : Number(raw)
            return { ...value, price: Number.isFinite(n) && n >= 0 ? n : 0 }
          }
          if (field === 'purchase_price') {
            if (raw === '') return { ...value, purchase_price: null }
            const n = Number(raw)
            return {
              ...value,
              purchase_price: Number.isFinite(n) && n >= 0 ? n : null,
            }
          }
          if (raw === '') return { ...value, original_price: null }
          const n = Number(raw)
          return {
            ...value,
            original_price: Number.isFinite(n) && n > 0 ? n : null,
          }
        }),
      }
    })
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <p className={`text-xs ${t.muted}`}>{tr('productForm.optionsHint')}</p>
      {options.map((group, groupIndex) => (
        <div key={group.name}>
          <p className={`text-sm font-semibold mb-2 ${t.heading}`}>{group.name}</p>
          <div className="space-y-2">
            {group.values.map((value, valueIndex) => (
              <div
                key={value.label}
                className={`rounded-lg border p-3 ${
                  t.isDark ? 'border-dark-600 bg-dark-900/40' : 'border-gray-200 bg-gray-50/80'
                }`}
              >
                <p className={`text-sm font-semibold mb-3 ${t.heading}`}>{value.label}</p>
                <div
                  className={`grid grid-cols-1 gap-3 ${
                    showPurchasePrice ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                  }`}
                >
                  {showPurchasePrice ? (
                    <div>
                      <label className="form-label text-xs mb-1">
                        {tr('productForm.optionPurchasePrice')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input w-full py-1.5 text-sm"
                        value={value.purchase_price ?? ''}
                        onChange={(e) =>
                          updateValue(groupIndex, valueIndex, 'purchase_price', e.target.value)
                        }
                        disabled={disabled}
                      />
                    </div>
                  ) : null}
                  <div>
                    <label className="form-label text-xs mb-1">
                      {tr('productForm.optionSellingPrice')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input w-full py-1.5 text-sm"
                      value={value.price > 0 ? value.price : ''}
                      onChange={(e) =>
                        updateValue(groupIndex, valueIndex, 'price', e.target.value)
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs mb-1">
                      {tr('productForm.originalPrice')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input w-full py-1.5 text-sm"
                      value={value.original_price ?? ''}
                      onChange={(e) =>
                        updateValue(groupIndex, valueIndex, 'original_price', e.target.value)
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
