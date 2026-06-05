'use client'

export function productLabelPillClass(isDark: boolean): string {
  return `inline-block text-sm px-2 py-1 rounded uppercase tracking-wide ${
    isDark ? 'text-gray-300 bg-dark-700' : 'text-gray-700 bg-gray-200'
  }`
}

export default function ProductLabelPill({
  label,
  isDark,
}: {
  label: string
  isDark: boolean
}) {
  return <span className={productLabelPillClass(isDark)}>{label}</span>
}
