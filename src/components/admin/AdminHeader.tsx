'use client'

import { useState } from 'react'
import { MagnifyingGlassIcon, BuildingOfficeIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-local'
import RoleBadge from '@/components/users/RoleBadge'
import ThemeToggleButton from '@/components/theme/ThemeToggleButton'
import { useTheme } from '@/lib/theme'
import Link from 'next/link'
import { appPath } from '@/lib/paths'

export default function AdminHeader() {
  const [searchQuery, setSearchQuery] = useState('')
  const { user, signOut } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <header
      className={`px-4 sm:px-6 py-4 border-b transition-colors duration-200 ${
        isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div className="relative flex-1 max-w-lg min-w-0">
            <input
              type="text"
              placeholder="Search your route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                isDark
                  ? 'bg-dark-700 text-white placeholder-gray-400'
                  : 'bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="flex items-center flex-wrap justify-end gap-2 sm:gap-4 shrink-0">
          <ThemeToggleButton />

          <button type="button" className="btn-primary text-sm px-3 py-2 hidden sm:inline-flex">
            Create Shop
          </button>

          <Link href={appPath('/')} className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
            <BuildingOfficeIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Visit Site</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center gap-2 sm:gap-3 p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-100'
              }`}
            >
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white font-medium">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="text-left hidden md:block min-w-0">
                <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {user?.name || 'Admin User'}
                </p>
                {user && (
                  <RoleBadge
                    role={user.role}
                    email={user.email}
                    is_super_admin={user.is_super_admin}
                    className="mt-1"
                  />
                )}
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleLogout}
              className={`p-2 rounded-lg transition-colors ${
                isDark
                  ? 'text-gray-400 hover:text-white hover:bg-dark-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
