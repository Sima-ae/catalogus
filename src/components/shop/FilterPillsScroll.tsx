'use client'

import { useRef, useState } from 'react'
import { useTheme } from '@/lib/theme'

type Props = {
  items: string[]
  selected: string
  onChange: (value: string) => void
  showArrows?: boolean
  ariaLabel?: string
  /** Center pill row (homepage / new catalog). */
  centered?: boolean
}

export default function FilterPillsScroll({
  items,
  selected,
  onChange,
  showArrows = false,
  ariaLabel = 'Filter',
  centered = false,
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

  const scrollPrev = () => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' })
  }

  const scrollNext = () => {
    scrollContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' })
  }

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

  const pills = (
    <div
      ref={scrollContainerRef}
      className={`filter-pills-scroll flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible ${
        centered ? 'justify-center py-1' : 'gap-3 py-0.5'
      } ${!centered && showArrows ? 'px-16' : ''}`}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
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
          className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-all duration-200 leading-normal ${
            centered
              ? 'min-h-[2rem] px-3.5 py-1.5 text-xs sm:min-h-[2.125rem] sm:px-4 sm:py-2 sm:text-sm'
              : 'px-4 py-2.5 text-sm'
          } ${pillClass(item)}`}
        >
          {item}
        </button>
      ))}
    </div>
  )

  if (centered) {
    return (
      <div className="mx-auto flex w-full max-w-3xl items-center justify-center gap-2 px-1 sm:max-w-4xl">
        {showArrows ? (
          <button
            type="button"
            onClick={scrollPrev}
            className={arrowClass}
            aria-label={`Scroll ${ariaLabel} left`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : null}
        <div className="min-w-0 flex-1">{pills}</div>
        {showArrows ? (
          <button
            type="button"
            onClick={scrollNext}
            className={arrowClass}
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
