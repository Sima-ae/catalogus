'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from '@/lib/theme'

type Props = {
  items: string[]
  selected: string
  onChange: (value: string) => void
  onItemHover?: (value: string) => void
  showArrows?: boolean
  ariaLabel?: string
  getLabel?: (value: string) => string
  /** Catalog pill styling (homepage / new). */
  centered?: boolean
  /** @deprecated Use centered scroll layout only — kept for API compatibility. */
  alignGroup?: 'center' | 'full'
}

const HORIZONTAL_DRAG_THRESHOLD = 8

export default function FilterPillsScroll({
  items,
  selected,
  onChange,
  onItemHover,
  showArrows = false,
  ariaLabel = 'Filter',
  getLabel,
  centered = false,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    horizontal: false,
  })
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [isDragging, setIsDragging] = useState(false)
  const [edges, setEdges] = useState({ left: false, right: false })
  const [overflows, setOverflows] = useState(false)

  const scrollStep = () => {
    const el = scrollContainerRef.current
    if (!el) return 280
    return Math.max(200, Math.floor(el.clientWidth * 0.75))
  }

  const updateEdges = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) {
      setEdges({ left: false, right: false })
      setOverflows(false)
      return
    }
    const max = el.scrollWidth - el.clientWidth
    const hasOverflow = max > 2
    setOverflows(hasOverflow)
    if (!hasOverflow) {
      setEdges({ left: false, right: false })
      return
    }
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < max - 4,
    })
  }, [])

  const scrollPrev = () => {
    scrollContainerRef.current?.scrollBy({ left: -scrollStep(), behavior: 'smooth' })
  }

  const scrollNext = () => {
    scrollContainerRef.current?.scrollBy({ left: scrollStep(), behavior: 'smooth' })
  }

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    updateEdges()
    el.addEventListener('scroll', updateEdges, { passive: true })
    const ro = new ResizeObserver(updateEdges)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateEdges)
      ro.disconnect()
    }
  }, [items, updateEdges])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const active = el.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!active) return

    const targetLeft =
      active.offsetLeft - el.clientWidth / 2 + active.clientWidth / 2
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth)
    el.scrollTo({
      left: Math.min(maxLeft, Math.max(0, targetLeft)),
      behavior: 'smooth',
    })
    requestAnimationFrame(updateEdges)
  }, [selected, items, updateEdges])

  const endDrag = () => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    dragRef.current.horizontal = false
    dragRef.current.pointerId = -1
    setIsDragging(false)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (!scrollContainerRef.current) return
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: scrollContainerRef.current.scrollLeft,
      horizontal: false,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag.active || e.pointerId !== drag.pointerId || !scrollContainerRef.current) return

    const deltaX = e.clientX - drag.startX
    const deltaY = e.clientY - drag.startY

    if (!drag.horizontal) {
      if (Math.abs(deltaX) < HORIZONTAL_DRAG_THRESHOLD && Math.abs(deltaY) < HORIZONTAL_DRAG_THRESHOLD) {
        return
      }
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        endDrag()
        return
      }
      drag.horizontal = true
      setIsDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    e.preventDefault()
    scrollContainerRef.current.scrollLeft = drag.startScrollLeft - deltaX
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== dragRef.current.pointerId) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    endDrag()
    updateEdges()
  }

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== dragRef.current.pointerId) return
    endDrag()
  }

  const pillClass = (item: string) => {
    const active = selected === item
    if (centered) {
      if (active) {
        return 'filter-pill-active bg-black !text-white shadow-md ring-1 ring-black/10'
      }
      return isDark
        ? 'filter-pill-inactive bg-dark-800/80 text-gray-300 ring-1 ring-dark-700/80 hover:bg-black hover:!text-white'
        : 'filter-pill-inactive bg-white text-gray-800 ring-1 ring-gray-200/90 shadow-sm hover:bg-black hover:!text-white'
    }
    if (active) return 'nav-active shadow-md'
    return isDark
      ? 'bg-dark-800 text-gray-300 hover:bg-dark-700 hover:text-white'
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900'
  }

  const arrowClass = `shrink-0 flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 ${
    isDark
      ? 'border-dark-600 bg-dark-900 text-white hover:bg-dark-800'
      : 'border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900'
  }`

  const fadeFrom = isDark ? 'from-dark-950' : 'from-gray-50'
  const showFades = centered && (edges.left || edges.right)

  const pills = (
    <div
      ref={scrollContainerRef}
      className={`filter-pills-scroll flex w-full min-w-0 flex-nowrap items-center overflow-x-auto overflow-y-visible scroll-smooth snap-x snap-mandatory touch-pan-x py-1 ${
        centered
          ? `${overflows ? 'justify-start' : 'justify-center'} gap-2 px-2`
          : 'justify-start gap-3 py-0.5'
      } ${!centered && showArrows ? 'px-14' : ''}`}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        WebkitOverflowScrolling: 'touch',
      }}
      role="tablist"
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={selected === item}
          onClick={() => onChange(item)}
          onMouseEnter={() => onItemHover?.(item)}
          onFocus={() => onItemHover?.(item)}
          className={`inline-flex shrink-0 snap-center items-center justify-center rounded-full font-semibold uppercase tracking-wide whitespace-nowrap transition-all duration-200 ${
            centered
              ? 'min-h-[2.25rem] px-4 py-2 text-[0.6875rem] sm:min-h-[2.375rem] sm:px-4 sm:py-2 sm:text-xs'
              : 'snap-start px-4 py-2.5 text-sm'
          } ${pillClass(item)}`}
        >
          {getLabel ? getLabel(item) : item}
        </button>
      ))}
    </div>
  )

  if (centered) {
    return (
      <div className="flex w-full max-w-full min-w-0 items-center justify-center gap-1 sm:gap-2">
        {showArrows && edges.left ? (
          <button
            type="button"
            onClick={scrollPrev}
            className={`${arrowClass} hidden sm:flex shrink-0`}
            aria-label={`Scroll ${ariaLabel} left`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : null}
        <div className="relative min-w-0 w-full max-w-full flex-1">
          {showFades && edges.left ? (
            <div
              className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 sm:w-12 bg-gradient-to-r ${fadeFrom} to-transparent`}
              aria-hidden
            />
          ) : null}
          {showFades && edges.right ? (
            <div
              className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 sm:w-12 bg-gradient-to-l ${fadeFrom} to-transparent`}
              aria-hidden
            />
          ) : null}
          {pills}
        </div>
        {showArrows && edges.right ? (
          <button
            type="button"
            onClick={scrollNext}
            className={`${arrowClass} hidden sm:flex shrink-0`}
            aria-label={`Scroll ${ariaLabel} right`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="relative w-full min-w-0 overflow-hidden py-0.5">
      {showArrows ? (
        <>
          {edges.left ? (
            <button
              type="button"
              onClick={scrollPrev}
              className={`absolute left-0 top-1/2 z-10 -translate-y-1/2 ${arrowClass}`}
              aria-label={`Scroll ${ariaLabel} left`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : null}
          {edges.right ? (
            <button
              type="button"
              onClick={scrollNext}
              className={`absolute right-0 top-1/2 z-10 -translate-y-1/2 ${arrowClass}`}
              aria-label={`Scroll ${ariaLabel} right`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : null}
        </>
      ) : null}
      {pills}
    </div>
  )
}
