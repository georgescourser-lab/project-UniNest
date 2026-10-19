'use client'

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export type AuthUser = {
  id: string
  email: string
  name?: string
  user_metadata?: {
    full_name?: string
    display_name?: string
  }
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  requireAuth: (actionCallback: () => void | Promise<void>, returnUrl?: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  requireAuth: async () => false,
  logout: async () => {},
})

function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null

  // 1. Check localStorage
  try {
    const raw = localStorage.getItem('uninest_user')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.id && parsed?.email) {
        return {
          id: parsed.id,
          email: parsed.email,
          name: parsed.name || parsed.email.split('@')[0],
          user_metadata: { full_name: parsed.name, display_name: parsed.name },
        }
      }
    }
  } catch (e) {}

  // 2. Check client cookie
  try {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [key, val] = cookie.trim().split('=')
      if ((key === 'uninest_user_client' || key === 'uninest_user_session') && val) {
        const parsed = JSON.parse(decodeURIComponent(val))
        if (parsed?.id && parsed?.email) {
          return {
            id: parsed.id,
            email: parsed.email,
            name: parsed.name || parsed.email.split('@')[0],
            user_metadata: { full_name: parsed.name, display_name: parsed.name },
          }
        }
      }
    }
  } catch (e) {}

  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    // 1. Check local session
    const stored = getStoredUser()
    if (stored) {
      setUser(stored)
    }

    // 2. Listen to Supabase auth state change if client is in window
    if (typeof window !== 'undefined') {
      const win = window as any
      if (win.supabaseClient?.auth?.onAuthStateChange) {
        try {
          const { data: { subscription } } = win.supabaseClient.auth.onAuthStateChange((_event: any, session: any) => {
            if (!mounted) return
            if (session?.user) {
              const mappedUser: AuthUser = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                user_metadata: session.user.user_metadata,
              }
              setUser(mappedUser)
              try {
                localStorage.setItem('uninest_user', JSON.stringify(mappedUser))
              } catch (e) {}
            } else {
              const currentStored = getStoredUser()
              setUser(currentStored)
            }
          })

          setIsLoading(false)
          return () => {
            mounted = false
            subscription?.unsubscribe?.()
          }
        } catch (e) {}
      }
    }

    setIsLoading(false)
    return () => {
      mounted = false
    }
  }, [])

  // Guard Logic actively checking session before executing protected actions
  const requireAuth = async (actionCallback: () => void | Promise<void>, returnUrl?: string) => {
    const stored = getStoredUser()
    const isAuthed = !!user || !!stored || (typeof document !== 'undefined' && (document.cookie.includes('uninest_user_client') || document.cookie.includes('uninest_user_session')))

    if (!isAuthed) {
      const fallbackUrl = returnUrl || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/search')
      router.push(`/login?next=${encodeURIComponent(fallbackUrl)}`)
      return false
    }

    try {
      await actionCallback()
      return true
    } catch (err) {
      console.error('Error executing protected action:', err)
      return false
    }
  }

  const logout = async () => {
    try {
      const win = window as any
      if (win.supabaseClient?.auth?.signOut) {
        await win.supabaseClient.auth.signOut()
      }
    } catch (e) {}
    try {
      localStorage.removeItem('uninest_user')
      document.cookie = 'uninest_user_client=; path=/; max-age=0; SameSite=Lax'
      document.cookie = 'uninest_user_session=; path=/; max-age=0; SameSite=Lax'
    } catch (e) {}
    setUser(null)
    router.push('/login')
  }

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    requireAuth,
    logout,
  }), [user, isLoading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
