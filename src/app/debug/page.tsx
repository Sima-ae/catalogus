'use client'

import { useAuth } from '@/lib/auth-local'
import { appPath } from '@/lib/paths'
import { useEffect, useState } from 'react'

export default function DebugPage() {
  const { user, loading, isAdmin, isSeller, isBuyer } = useAuth()
  const [envVars, setEnvVars] = useState<any>({})

  useEffect(() => {
    // Check environment variables
    setEnvVars({
      NODE_ENV: process.env.NODE_ENV,
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Information</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Environment Variables */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
            <div className="space-y-2">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-mono text-sm">{key}:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    value === 'Missing' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Authentication State */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Authentication State</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Loading:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  loading ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  {loading ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>User:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  user ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {user ? 'Authenticated' : 'Not authenticated'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Admin:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  isAdmin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {isAdmin ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Seller:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  isSeller ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {isSeller ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Buyer:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  isBuyer ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {isBuyer ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* User Details */}
          {user && (
            <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
              <h2 className="text-xl font-semibold mb-4">User Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{user.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{user.name || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Reload Page
              </button>
              <button 
                onClick={() => { window.location.href = appPath('/admin') }}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-3"
              >
                Go to Admin Dashboard
              </button>
              <button 
                onClick={() => { window.location.href = appPath('/login') }}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 ml-3"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
