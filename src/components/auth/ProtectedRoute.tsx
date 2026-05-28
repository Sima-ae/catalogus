'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { getDashboardPath } from '@/lib/dashboard'
import { appPath } from '@/lib/paths'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'seller' | 'buyer'
  redirectTo?: string
}

export default function ProtectedRoute({
  children,
  requiredRole = 'admin',
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isSeller, isBuyer } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push(appPath(redirectTo))
      return
    }

    let hasAccess = false
    switch (requiredRole) {
      case 'admin':
        hasAccess = isAdmin
        break
      case 'seller':
        hasAccess = isSeller || isAdmin
        break
      case 'buyer':
        hasAccess = isBuyer || isSeller || isAdmin
        break
      default:
        hasAccess = true
    }

    if (!hasAccess) {
      router.replace(appPath(getDashboardPath(user.role)))
    }
  }, [user, loading, isAdmin, isSeller, isBuyer, requiredRole, router, redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  let hasAccess = false
  switch (requiredRole) {
    case 'admin':
      hasAccess = isAdmin
      break
    case 'seller':
      hasAccess = isSeller || isAdmin
      break
    case 'buyer':
      hasAccess = isBuyer || isSeller || isAdmin
      break
    default:
      hasAccess = true
  }

  if (!hasAccess) return null

  return <>{children}</>
}
