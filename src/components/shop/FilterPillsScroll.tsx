'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/lib/theme'

type Props = {
  items: string[]
  selected: string
  onChange: (value: string) => void
  showArrows?: boolean
  ariaLabel?: string
  /** Catalog pill styling (homepage / new). */
  centered?: boolean
  /** Center the pill group on the page (categories). Full-width row when "full" (brands). */
  alignGroup?: 'center' | 'full'
}

export default function FilterPillsScroll({
  items,
  selected,
  onChange,
  showArrows = false,
  ariaLabel = 'Filter',
  centered = false,
  alignGroup = 'full',
}: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft)
    setScrollLeft(scrollContainerRef.current.scrollLeft)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX) * 2
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => setIsDragging(false)
  const handleMouseLeave = () => setIsDragging(false)

  const scrollStep = () => {
    const el = scrollContainerRef.current
    if (!el) return 280
    return Math.max(280, Math.floor(el.clientWidth * 0.8))
  }

  const scrollPrev = () => {
    scrollContainerRef.current?.scrollBy({ left: -scrollStep(), behavior: 'smooth' })
  }

  const scrollNext = () => {
    scrollContainerRef.current?.scrollBy({ left: scrollStep(), behavior: 'smooth' })
  }

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const active = el.querySelector<HTMLElement>('[aria-selected="true"]')
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [selected, items])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return
    const touch = e.touches[0]
    setStartX(touch.pageX - scrollContainerRef.current.offsetLeft)
    setScrollLeft(scrollContainerRef.current.scrollLeft)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return
    const touch = e.touches[0]
    const x = touch.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX) * 2
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }

  const pillClass = (item: string) => {
    const active = selected === item
    if (centered) {
      if (active) {
        return isDark
          ? 'bg-dark-700 text-white shadow-md ring-1 ring-dark-600'
          : 'bg-white text-gray-900 shadow-md ring-1 ring-gray-200/80'
      }
      return isDark
        ? 'bg-dark-800/90 text-gray-300 hover:bg-dark-700 hover:text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200/90 hover:text-gray-900'
    }
    if (active) return 'nav-active shadow-md'
    return isDark
      ? 'bg-dark-800 text-gray-300 hover:bg-dark-700 hover:text-white'
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900'
  }

  const arrowClass = `shrink-0 flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 ${
    isDark
      ? 'border-dark-600 bg-dark-900 text-white hover:bg-dark-800'
      : 'border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900'
  }`

  const centerGroup = centered && alignGroup === 'center' && !showArrows

  const pills = (
    <div
      ref={scrollContainerRef}
      className={`filter-pills-scroll flex flex-nowrap items-center overflow-x-auto overflow-y-visible scroll-smooth ${
        centerGroup
          ? 'w-max max-w-full justify-center gap-2 px-1 py-1.5'
          : centered
            ? 'min-w-0 flex-1 justify-start gap-2 px-1 py-1.5'
            : 'min-w-0 gap-3 py-0.5'
      } ${!centered && showArrows ? 'px-16' : ''}`}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        WebkitOverflowScrolling: 'touch',
      }}
      role="tablist"
      aria-label={ariaLabel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={selected === item}
          onClick={() => onChange(item)}
          className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-all duration-200 leading-snug ${
            centered
              ? 'min-h-[2.125rem] px-3.5 py-2 text-xs sm:min-h-[2.25rem] sm:px-4 sm:py-2 sm:text-sm'
              : 'px-4 py-2.5 text-sm'
          } ${pillClass(item)}`}
        >
          {item}
        </button>
      ))}
    </div>
  )

  if (centerGroup) {
    return <div className="flex w-full justify-center overflow-visible">{pills}</div>
  }

  if (centered) {
    const fadeFrom = isDark ? 'from-dark-950' : 'from-gray-50'
    return (
      <div className="flex w-full max-w-full items-stretch gap-1.5 sm:gap-2">
        {showArrows ? (
          <button
            type="button"
            onClick={scrollPrev}
            className={`${arrowClass} self-center`}
            aria-label={`Scroll ${ariaLabel} left`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : null}
        <div className="relative min-w-0 flex-1">
          {showArrows ? (
            <>
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 sm:w-10 bg-gradient-to-r ${fadeFrom} to-transparent`}
                aria-hidden
              />
              <div
                className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 sm:w-10 bg-gradient-to-l ${fadeFrom} to-transparent`}
                aria-hidden
              />
            </>
          ) : null}
          {pills}
        </div>
        {showArrows ? (
          <button
            type="button"
            onClick={scrollNext}
            className={`${arrowClass} self-center`}
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
    <div className="relative overflow-visible py-0.5">
      {showArrows ? (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            className={`absolute left-1 top-1/2 z-10 -translate-y-1/2 ${arrowClass} h-9 w-9`}
            aria-label={`Scroll ${ariaLabel} left`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className={`absolute right-1 top-1/2 z-10 -translate-y-1/2 ${arrowClass} h-9 w-9`}
            aria-label={`Scroll ${ariaLabel} right`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      ) : null}
      {pills}
    </div>
  )
}
