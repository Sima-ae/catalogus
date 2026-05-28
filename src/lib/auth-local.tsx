'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { appPath } from '@/lib/paths'

export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'buyer' | 'seller'
  name?: string
  avatar_url?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: { message: string } | null; user?: AuthUser }>
  signOut: () => Promise<void>
  isAdmin: boolean
  isSeller: boolean
  isBuyer: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const STORAGE_KEY = 'rcc_auth_user_v1'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } finally {
      setLoading(false)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(appPath('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { error: { message: data?.error || 'Login failed' } }
      }

      const nextUser: AuthUser = data.user
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
      setUser(nextUser)
      return { error: null, user: nextUser }
    } catch {
      return { error: { message: 'Unable to reach login service' } }
    }
  }

  const signOut = async () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  const value = useMemo(() => {
    const isAdmin = user?.role === 'admin'
    const isSeller = user?.role === 'seller'
    const isBuyer = user?.role === 'buyer'
    return { user, loading, signIn, signOut, isAdmin, isSeller, isBuyer }
  }, [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
