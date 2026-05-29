'use client'

import { useState, useRef } from 'react'
import { useTheme } from '@/lib/theme'
import { useShopCategoryList } from '@/lib/use-shop-category-list'

interface CategoryFilterProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

export default function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const categories = useShopCategoryList()
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

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

  const scrollLeftDirection = () => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' })
  }

  const scrollRightDirection = () => {
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={scrollLeftDirection}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-all duration-200 hover:scale-110 ${
          theme === 'dark'
            ? 'bg-dark-900 hover:bg-dark-800 border-dark-700 text-white'
            : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700'
        }`}
        style={{ left: '8px' }}
        aria-label="Scroll categories left"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={scrollRightDirection}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-all duration-200 hover:scale-110 ${
          theme === 'dark'
            ? 'bg-dark-900 hover:bg-dark-800 border-dark-700 text-white'
            : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700'
        }`}
        style={{ right: '8px' }}
        aria-label="Scroll categories right"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div
        ref={scrollContainerRef}
        className="flex space-x-3 px-20 overflow-x-auto scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onCategoryChange(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
              selectedCategory === category
                ? 'nav-active shadow-lg'
                : theme === 'dark'
                  ? 'bg-dark-800 text-gray-300 hover:bg-dark-700 hover:text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
