'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import { useShopCategory } from '@/lib/use-shop-category'
import { useShopNestedSubcategory, useShopSubcategory } from '@/lib/use-shop-subcategory'
import { useShopCategoryNav } from '@/lib/use-shop-category-nav'
import { shopCatalogBasePath } from '@/lib/shop-catalog-url'
import { buildShopCategoryFilterHref } from '@/lib/shop-catalog-filter-url'
import type { ShopCategoryNavNode } from '@/lib/shop-category-nav'
import { TagIcon } from '@heroicons/react/24/outline'
import { useI18n } from '@/lib/i18n-context'
import { getTopCategoryLabel } from '@/lib/i18n-categories'

type SidebarCategoriesProps = {
  isCollapsed: boolean
  onNavigate?: () => void
}

function NavLink({
  href,
  label,
  depth,
  isActive,
  onNavigate,
}: {
  href: string
  label: string
  depth: number
  isActive: boolean
  onNavigate?: () => void
}) {
  const { theme } = useTheme()
  const paddingLeft = 12 + depth * 12

  return (
    <Link
      href={href}
      onClick={onNavigate}
      style={{ paddingLeft }}
      className={`block py-1.5 pr-3 rounded-lg text-sm transition-colors ${
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
}

function NavBranch({
  node,
  depth,
  basePath,
  category,
  subcategory,
  selectedCategory,
  selectedSubcategory,
  selectedNestedSubcategory,
  t,
  onNavigate,
}: {
  node: ShopCategoryNavNode
  depth: number
  basePath: string
  category: string
  subcategory?: string
  selectedCategory: string
  selectedSubcategory: string
  selectedNestedSubcategory: string
  t: (key: string) => string
  onNavigate?: () => void
}) {
  const href =
    depth === 0
      ? buildShopCategoryFilterHref(basePath, { category: node.name })
      : depth === 1
        ? buildShopCategoryFilterHref(basePath, {
            category,
            subcategory: node.name,
          })
        : buildShopCategoryFilterHref(basePath, {
            category,
            subcategory: subcategory!,
            nested: node.name,
          })

  const active =
    depth === 0
      ? selectedCategory === node.name &&
        selectedSubcategory === 'All' &&
        selectedNestedSubcategory === 'All'
      : depth === 1
        ? selectedCategory === category &&
          selectedSubcategory === node.name &&
          selectedNestedSubcategory === 'All'
        : selectedCategory === category &&
          selectedSubcategory === subcategory &&
          selectedNestedSubcategory === node.name

  const label = getTopCategoryLabel(node.name, t, { allStyle: 'home' })

  return (
    <>
      <NavLink
        href={href}
        label={label}
        depth={depth}
        isActive={active}
        onNavigate={onNavigate}
      />
      {node.children.map((child) => (
        <NavBranch
          key={`${node.name}-${child.name}-${depth + 1}`}
          node={child}
          depth={depth + 1}
          basePath={basePath}
          category={depth === 0 ? node.name : category}
          subcategory={depth === 1 ? node.name : subcategory}
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
          selectedNestedSubcategory={selectedNestedSubcategory}
          t={t}
          onNavigate={onNavigate}
        />
      ))}
    </>
  )
}

export default function SidebarCategories({ isCollapsed, onNavigate }: SidebarCategoriesProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const { selectedCategory } = useShopCategory()
  const subcategoryState = useShopSubcategory(selectedCategory)
  const { selectedSubcategory } = subcategoryState
  const { selectedNestedSubcategory } = useShopNestedSubcategory(
    selectedCategory,
    selectedSubcategory
  )
  const { tree, loading } = useShopCategoryNav()
  const { t } = useI18n()
  const basePath = shopCatalogBasePath(pathname ?? '')

  if (isCollapsed) {
    return (
      <div className="py-2 flex justify-center shrink-0" title={t('nav.categories')}>
        <TagIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
      </div>
    )
  }

  const homeActive =
    selectedCategory === 'All' &&
    selectedSubcategory === 'All' &&
    selectedNestedSubcategory === 'All'

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
        <NavLink
          href={basePath}
          label={getTopCategoryLabel('All', t, { allStyle: 'home' })}
          depth={0}
          isActive={homeActive}
          onNavigate={onNavigate}
        />
        {loading && tree.length === 0 ? (
          <p
            className={`px-3 py-2 text-xs ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            …
          </p>
        ) : null}
        {tree.map((root) => (
          <NavBranch
            key={root.name}
            node={root}
            depth={0}
            basePath={basePath}
            category={root.name}
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            selectedNestedSubcategory={selectedNestedSubcategory}
            t={t}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  )
}
