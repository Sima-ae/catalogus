'use client'

type Props = {
  mode: 'table' | 'grid'
  onChange: (mode: 'table' | 'grid') => void
  isDark?: boolean
  t: (key: string) => string
}

export default function PricelistViewToggle({ mode, onChange, isDark, t }: Props) {
  const base = isDark ? 'bg-dark-800 text-gray-300' : 'bg-gray-100 text-gray-700'
  const active = isDark ? 'bg-white text-gray-900' : 'bg-white text-gray-900 shadow-sm'

  return (
    <div className={`inline-flex rounded-lg p-1 ${base}`}>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          mode === 'table' ? active : 'hover:opacity-80'
        }`}
      >
        {t('pricelist.view.table')}
      </button>
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          mode === 'grid' ? active : 'hover:opacity-80'
        }`}
      >
        {t('pricelist.view.grid')}
      </button>
    </div>
  )
}
