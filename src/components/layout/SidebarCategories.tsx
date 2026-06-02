'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import { useShopCategory } from '@/lib/use-shop-category'
import { useShopCategoryList } from '@/lib/use-shop-category-list'
import { appPath, isAppPath } from '@/lib/paths'
import { TagIcon } from '@heroicons/react/24/outline'
import { useI18n } from '@/lib/i18n-context'
import { getTopCategoryLabel } from '@/lib/i18n-categories'

type SidebarCategoriesProps = {
  isCollapsed: boolean
  onNavigate?: () => void
}

function categoryHref(pathname: string, category: string): string {
  const onCatalog =
    isAppPath(pathname, '/') ||
    isAppPath(pathname, '/new') ||
    pathname === '/' ||
    pathname === '/new'

  const base = onCatalog ? pathname.split('?')[0] : appPath('/')
  if (category === 'All') return base
  return `${base}?category=${encodeURIComponent(category)}`
}

export default function SidebarCategories({ isCollapsed, onNavigate }: SidebarCategoriesProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const { selectedCategory } = useShopCategory()
  const categories = useShopCategoryList()
  const { t } = useI18n()

  if (isCollapsed) {
    return (
      <div className="py-2 flex justify-center shrink-0" title={t('nav.categories')}>
        <TagIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      <p
        className={`px-3 mb-2 shrink-0 text-xs font-semibold uppercase tracking-wider ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
        }`}
      >
        {t('nav.categories')}
      </p>
      <nav
        className="sidebar-category-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-0.5 pr-1 -mr-1"
        aria-label={t('nav.categories')}
      >
        {categories.map((category) => {
          const isActive = selectedCategory === category
          const href = categoryHref(pathname, category)
          const label = getTopCategoryLabel(category, t, { allStyle: 'home' })
          return (
            <Link
              key={category}
              href={href}
              onClick={onNavigate}
              className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'nav-active'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:bg-dark-800 hover:text-gray-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
