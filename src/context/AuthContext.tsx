'use client'

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { syncUserSession, clearUserSession } from '@/app/actions/authActions'

export type AuthUser = {
  id: string
  email: string
  name?: string
  user_metadata?: {
    full_name?: string
    display_name?: string
  }
}

export const VERIFIED_AGENT_EMAILS = [
  'georgescourser@gmail.com',
  'oderocarilus@gmail.com',
]

export function checkIsVerifiedAgent(email?: string | null): boolean {
  if (!email) return false
  return VERIFIED_AGENT_EMAILS.includes(email.trim().toLowerCase())
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  isVerifiedAgent: boolean
  requireAuth: (actionCallback: () => void | Promise<void>, returnUrl?: string) => Promise<boolean>
  logout: () => Promise<void>
  setSessionUser: (u: AuthUser | null) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isVerifiedAgent: false,
  requireAuth: async () => false,
  logout: async () => {},
  setSessionUser: () => {},
})

// Capture initial URL hash before Supabase detectSessionInUrl or React Strict Mode strips it
const INITIAL_WINDOW_HASH = typeof window !== 'undefined' ? window.location.hash : ''

export function decodeJwtUser(accessToken?: string | null): AuthUser | null {
  if (!accessToken || !accessToken.includes('.')) return null
  try {
    const parts = accessToken.split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    const payload = JSON.parse(json)
    const email = (payload.email || payload.user_metadata?.email || '').trim().toLowerCase()
    if (!email) return null
    const name =
      payload.user_metadata?.full_name ||
      payload.user_metadata?.name ||
      payload.user_metadata?.display_name ||
      email.split('@')[0]
    return {
      id: payload.sub || `usr_${Date.now()}`,
      email,
      name,
      user_metadata: {
        full_name: name,
        display_name: name,
      },
    }
  } catch {
    return null
  }
}

export function persistUserEverywhere(user: AuthUser) {
  if (typeof window === 'undefined' || !user?.email) return
  const normalizedName =
    user.name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.display_name ||
    user.email.split('@')[0]
  const payload = {
    id: user.id || `usr_${Date.now()}`,
    email: user.email.trim().toLowerCase(),
    name: normalizedName,
    createdAt: Date.now(),
  }
  try {
    localStorage.setItem('uninest_user', JSON.stringify(payload))
    const encoded = encodeURIComponent(JSON.stringify(payload))
    document.cookie = `uninest_user_client=${encoded}; path=/; max-age=2592000; SameSite=Lax`
    document.cookie = `uninest_user_session=${encoded}; path=/; max-age=2592000; SameSite=Lax`
  } catch (e) {}
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null

  // 1. Check localStorage ('uninest_user')
  try {
    const raw = localStorage.getItem('uninest_user')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.id && parsed?.email) {
        const name = parsed.name || parsed.email.split('@')[0]
        return {
          id: parsed.id,
          email: parsed.email.toLowerCase(),
          name,
          user_metadata: { full_name: name, display_name: name },
        }
      }
    }
  } catch (e) {}

  // 2. Check client/session cookies
  try {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const eqIdx = cookie.indexOf('=')
      if (eqIdx === -1) continue
      const key = cookie.slice(0, eqIdx).trim()
      const val = cookie.slice(eqIdx + 1).trim()
      if ((key === 'uninest_user_client' || key === 'uninest_user_session') && val) {
        const parsed = JSON.parse(decodeURIComponent(val))
        if (parsed?.id && parsed?.email) {
          const name = parsed.name || parsed.email.split('@')[0]
          const u: AuthUser = {
            id: parsed.id,
            email: parsed.email.toLowerCase(),
            name,
            user_metadata: { full_name: name, display_name: name },
          }
          try {
            localStorage.setItem('uninest_user', JSON.stringify({ id: u.id, email: u.email, name: u.name }))
          } catch {}
          return u
        }
      }
    }
  } catch (e) {}

  // 3. Check Supabase localStorage token (sb-*-auth-token)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const raw = localStorage.getItem(k)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        const sbUser = parsed?.user || parsed?.currentSession?.user
        if (sbUser?.email) {
          const name =
            sbUser.user_metadata?.full_name ||
            sbUser.user_metadata?.name ||
            sbUser.email.split('@')[0]
          const u: AuthUser = {
            id: sbUser.id,
            email: sbUser.email.toLowerCase(),
            name,
            user_metadata: { full_name: name, display_name: name },
          }
          persistUserEverywhere(u)
          return u
        }
        if (parsed?.access_token) {
          const decoded = decodeJwtUser(parsed.access_token)
          if (decoded) {
            persistUserEverywhere(decoded)
            return decoded
          }
        }
      }
    }
  } catch (e) {}

  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const setSessionUser = useCallback((u: AuthUser | null) => {
    setUser(u)
    if (u) {
      persistUserEverywhere(u)
      syncUserSession({ id: u.id, email: u.email, name: u.name }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function initAuth() {
      // 1. Check if URL hash contains #access_token (e.g., if Google OAuth redirected to Site URL / or any page)
      const activeHash = window.location.hash || INITIAL_WINDOW_HASH
      if (activeHash && activeHash.includes('access_token')) {
        try {
          const hashParams = new URLSearchParams(activeHash.replace(/^#/, ''))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken) {
            const jwtUser = decodeJwtUser(accessToken)
            if (jwtUser && mounted) {
              persistUserEverywhere(jwtUser)
              setUser(jwtUser)
              await syncUserSession({ id: jwtUser.id, email: jwtUser.email, name: jwtUser.name }).catch(() => {})
            }

            try {
              const supabase = createClient()
              if (refreshToken) {
                const { data } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                })
                if (data?.user && mounted) {
                  const sbUser: AuthUser = {
                    id: data.user.id,
                    email: (data.user.email || '').toLowerCase(),
                    name:
                      data.user.user_metadata?.full_name ||
                      data.user.user_metadata?.name ||
                      data.user.email?.split('@')[0],
                    user_metadata: data.user.user_metadata,
                  }
                  persistUserEverywhere(sbUser)
                  setUser(sbUser)
                  await syncUserSession({ id: sbUser.id, email: sbUser.email, name: sbUser.name }).catch(() => {})
                }
              }
            } catch {}

            // Clean URL hash if not on /auth/callback (callback page handles its own redirect UI)
            if (!window.location.pathname.startsWith('/auth/callback')) {
              const savedNext = localStorage.getItem('uninest_auth_next')
              localStorage.removeItem('uninest_auth_next')
              if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search)
              }
              if (savedNext && savedNext !== window.location.pathname) {
                window.location.href = savedNext
                return
              }
              router.refresh()
            }
          }
        } catch (e) {}
      }

      // 2. Check existing local/cookie/Supabase session
      const stored = getStoredUser()
      if (stored && mounted) {
        persistUserEverywhere(stored)
        setUser(stored)
        syncUserSession({ id: stored.id, email: stored.email, name: stored.name }).catch(() => {})
      }

      // 3. Connect to Next.js Supabase browser client
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        if (data?.session?.user && mounted) {
          const u = data.session.user
          const mappedUser: AuthUser = {
            id: u.id,
            email: (u.email || '').toLowerCase(),
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
            user_metadata: u.user_metadata,
          }
          persistUserEverywhere(mappedUser)
          setUser(mappedUser)
          syncUserSession({ id: mappedUser.id, email: mappedUser.email, name: mappedUser.name }).catch(() => {})
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return
          if (session?.user) {
            const mappedUser: AuthUser = {
              id: session.user.id,
              email: (session.user.email || '').toLowerCase(),
              name:
                session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                session.user.email?.split('@')[0],
              user_metadata: session.user.user_metadata,
            }
            persistUserEverywhere(mappedUser)
            setUser(mappedUser)
            syncUserSession({ id: mappedUser.id, email: mappedUser.email, name: mappedUser.name }).catch(() => {})
          }
        })

        if (mounted) setIsLoading(false)
        return () => {
          subscription?.unsubscribe?.()
        }
      } catch (e) {
        if (mounted) setIsLoading(false)
      }
    }

    initAuth()

    return () => {
      mounted = false
    }
  }, [router])

  // Guard Logic actively checking session before executing protected actions
  const requireAuth = useCallback(async (actionCallback: () => void | Promise<void>, returnUrl?: string) => {
    const stored = getStoredUser()
    const active = user || stored

    if (!active) {
      const fallbackUrl = returnUrl || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/search')
      try {
        localStorage.setItem('uninest_auth_next', fallbackUrl)
      } catch {}
      router.push(`/login?next=${encodeURIComponent(fallbackUrl)}`)
      return false
    }

    if (!user && stored) {
      setUser(stored)
      persistUserEverywhere(stored)
    }

    try {
      await actionCallback()
      return true
    } catch (err) {
      console.error('Error executing protected action:', err)
      return false
    }
  }, [user, router])

  const logout = useCallback(async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (e) {}
    try {
      const win = window as any
      if (win.supabaseClient?.auth?.signOut) {
        await win.supabaseClient.auth.signOut()
      }
    } catch (e) {}
    try {
      localStorage.removeItem('uninest_user')
      localStorage.removeItem('uninest_auth_next')
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('sb-')) {
          keysToRemove.push(k)
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k))
      document.cookie = 'uninest_user_client=; path=/; max-age=0; SameSite=Lax'
      document.cookie = 'uninest_user_session=; path=/; max-age=0; SameSite=Lax'
    } catch (e) {}
    try {
      await clearUserSession()
    } catch (e) {}
    setUser(null)
    router.refresh()
    router.push('/login')
  }, [router])

  const isVerifiedAgent = useMemo(() => checkIsVerifiedAgent(user?.email), [user])

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    isVerifiedAgent,
    requireAuth,
    logout,
    setSessionUser,
  }), [user, isLoading, isVerifiedAgent, requireAuth, logout, setSessionUser])

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
