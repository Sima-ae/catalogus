'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { appPath } from '@/lib/paths'

/** Local development only — disabled in production via middleware. */
export default function DebugPage() {
  const router = useRouter()
  const { user, loading, isAdmin, isSeller, isBuyer } = useAuth()

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.replace(appPath('/'))
    }
  }, [router])

  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Debug (development only)</h1>
        <p className="text-sm text-gray-600 mb-8">
          This page is not available in production.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Environment</h2>
            <p className="text-sm font-mono">NODE_ENV: {process.env.NODE_ENV}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Authentication</h2>
            <div className="space-y-2 text-sm">
              <p>Loading: {loading ? 'yes' : 'no'}</p>
              <p>User: {user ? 'signed in' : 'guest'}</p>
              <p>Admin: {isAdmin ? 'yes' : 'no'}</p>
              <p>Seller: {isSeller ? 'yes' : 'no'}</p>
              <p>Buyer: {isBuyer ? 'yes' : 'no'}</p>
            </div>
          </div>

          {user && (
            <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
              <h2 className="text-xl font-semibold mb-4">User (no secrets)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <p>
                  <span className="font-medium">Role:</span> {user.role}
                </p>
                <p>
                  <span className="font-medium">Super admin:</span>{' '}
                  {user.is_super_admin ? 'yes' : 'no'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
