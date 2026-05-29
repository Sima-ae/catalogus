'use client'

import Link from 'next/link'
import {
  BuildingOfficeIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-local'
import { useTheme } from '@/lib/theme'
import ThemeToggleButton from '@/components/theme/ThemeToggleButton'
import RoleBadge from '@/components/users/RoleBadge'
import { appPath } from '@/lib/paths'

export default function AdminHeaderActions() {
  const { user, signOut } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5 lg:gap-2 w-full min-w-0">
      <ThemeToggleButton />
      <button
        type="button"
        className="btn-primary text-xs lg:text-sm px-2.5 lg:px-3 py-2 whitespace-nowrap shrink-0 hidden sm:inline-flex"
      >
        Create Shop
      </button>
      <Link
        href={appPath('/')}
        className="btn-secondary flex items-center gap-1.5 text-xs lg:text-sm px-2.5 lg:px-3 py-2 shrink-0"
      >
        <BuildingOfficeIcon className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" />
        <span className="hidden md:inline whitespace-nowrap">Visit Site</span>
      </Link>
      <div
        className={`hidden lg:flex items-center gap-2 p-1.5 rounded-lg shrink-0 ${
          isDark ? 'hover:bg-dark-800' : 'hover:bg-gray-100'
        }`}
      >
        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-medium">
            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
          </span>
        </div>
        <div className="text-left hidden xl:block min-w-0 max-w-[8rem]">
          <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {user?.name || 'Admin'}
          </p>
          {user ? (
            <RoleBadge
              role={user.role}
              email={user.email}
              is_super_admin={user.is_super_admin}
              className="mt-0.5"
            />
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        className={`p-2 rounded-lg transition-colors shrink-0 ${
          isDark
            ? 'text-gray-400 hover:text-white hover:bg-dark-800'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
        }`}
        title="Logout"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
      </button>
    </div>
  )
}
