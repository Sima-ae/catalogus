'use client'

type Props = {
  active: boolean
}

/** Thin indeterminate bar — instant feedback that a filter click registered. */
export default function CatalogFilterProgress({ active }: Props) {
  if (!active) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden"
      aria-hidden
    >
      <div className="catalog-filter-progress h-full w-1/3 bg-primary-500" />
    </div>
  )
}
