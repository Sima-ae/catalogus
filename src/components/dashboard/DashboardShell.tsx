'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

type NavItem = { name: string; href: string }

interface DashboardShellProps {
  title: string
  nav: NavItem[]
  children: React.ReactNode
}

export default function DashboardShell({ title, nav, children }: DashboardShellProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-dark-900">
      <aside className="sidebar w-64 border-r border-dark-700">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gradient mb-6">{title}</h1>
          <div className="mb-6 p-4 bg-dark-700 rounded-lg">
            <p className="text-white font-medium">{user?.name || 'User'}</p>
            <p className="text-gray-400 text-sm capitalize">{user?.role}</p>
            <p className="text-gray-500 text-xs mt-1 truncate">{user?.email}</p>
          </div>
          <nav className="space-y-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="mt-8 pt-6 border-t border-dark-700 space-y-2">
            <Link href="/" className="block text-sm text-gray-400 hover:text-white">
              Visit shop
            </Link>
            <button
              onClick={() => signOut().then(() => { window.location.href = '/login' })}
              className="flex items-center text-sm text-gray-400 hover:text-white"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
