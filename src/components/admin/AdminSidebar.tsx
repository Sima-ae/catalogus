'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { appPath, isAppPath } from '@/lib/paths'
import { APP_COPYRIGHT, APP_NAME } from '@/lib/brand'
import BrandMark from '@/components/brand/BrandMark'
import {
  HomeIcon,
  CubeIcon,
  ShoppingCartIcon,
  UsersIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  TagIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Products', href: '/admin/products', icon: CubeIcon },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCartIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Categories', href: '/admin/categories', icon: TagIcon },
  { name: 'Reviews', href: '/admin/reviews', icon: DocumentTextIcon },
  { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <div className="sidebar w-64">
      <div className="p-6">
        <div className="flex items-center mb-8">
          <BrandMark className="w-9 h-9 mr-3" />
          <h1 className="text-xl font-bold text-gradient">{APP_NAME}</h1>
        </div>

        {/* User Info */}
        <div className="mb-6 p-4 bg-dark-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{user?.name || 'Admin User'}</p>
              <p className="text-gray-400 text-sm capitalize">{user?.role || 'admin'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = isAppPath(pathname, item.href)
            return (
              <Link
                key={item.name}
                href={appPath(item.href)}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-dark-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              href={appPath('/admin/products/new')}
              className="flex items-center px-3 py-2 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
            >
              <CubeIcon className="w-4 h-4 mr-3" />
              <span className="text-sm">Add Product</span>
            </Link>
            <Link
              href={appPath('/admin/categories/new')}
              className="flex items-center px-3 py-2 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
            >
              <TagIcon className="w-4 h-4 mr-3" />
              <span className="text-sm">Add Category</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-dark-700 text-xs text-gray-400">
          <div className="space-y-2">
            <Link href={appPath('/')} className="block hover:text-white transition-colors">
              Visit Site
            </Link>
            <Link href={appPath('/admin/settings')} className="block hover:text-white transition-colors">
              Settings
            </Link>
          </div>
          <div className="mt-4 text-left">
            <p><b>{APP_COPYRIGHT}</b></p>
          </div>
        </div>
      </div>
    </div>
  )
}
