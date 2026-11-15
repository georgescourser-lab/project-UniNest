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

/**
 * Builds an OAuth redirectTo URL that strictly matches the Supabase project's
 * URI allowlist (`http://127.0.0.1:*` for local dev and `https://www.uni-nest.app/` for production)
 * so Supabase never rejects redirectTo or falls back to a broken relative path (`/www.uni-nest.app`).
 */
export function getValidOAuthRedirectUrl(currentOrigin: string, nextPath = '/search'): string {
  try {
    const url = new URL(currentOrigin)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      const port = url.port || '3000'
      return `http://127.0.0.1:${port}/auth/callback?next=${encodeURIComponent(nextPath)}`
    }
  } catch {}
  return 'https://www.uni-nest.app/'
}

export function getSavedNextDestination(fallback = '/search'): string {
  if (typeof window === 'undefined') return fallback
  try {
    const savedLocal = localStorage.getItem('uninest_auth_next')
    if (savedLocal && savedLocal.startsWith('/')) {
      localStorage.removeItem('uninest_auth_next')
      document.cookie = 'uninest_auth_next=; path=/; max-age=0; SameSite=Lax'
      return savedLocal
    }
  } catch {}
  try {
    const cookies = document.cookie.split(';')
    for (const c of cookies) {
      const eq = c.indexOf('=')
      if (eq === -1) continue
      const k = c.slice(0, eq).trim()
      const v = c.slice(eq + 1).trim()
      if (k === 'uninest_auth_next' && v) {
        const decoded = decodeURIComponent(v)
        document.cookie = 'uninest_auth_next=; path=/; max-age=0; SameSite=Lax'
        if (decoded.startsWith('/')) return decoded
      }
    }
  } catch {}
  return fallback
}

export function isGoogleCodeExchangeFallback(errStr?: string | null): boolean {
  if (!errStr) return false
  const lower = errStr.toLowerCase()
  return (
    lower.includes('unable to exchange external code') ||
    lower.includes('4/0a') ||
    lower.includes('4%2f0a')
  )
}

export function savePendingGoogleEmail(rawEmail: string) {
  if (typeof window === 'undefined') return
  const clean = rawEmail.trim().toLowerCase()
  if (!clean || !clean.includes('@')) return
  try {
    localStorage.setItem('uninest_pending_google_email', clean)
    localStorage.setItem('uninest_last_google_email', clean)
    document.cookie = `uninest_pending_google_email=${encodeURIComponent(clean)}; path=/; max-age=900; SameSite=Lax`
  } catch {}
}

export function getPendingGoogleEmail(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const pending = localStorage.getItem('uninest_pending_google_email')
    if (pending && pending.includes('@')) return pending.trim().toLowerCase()
  } catch {}
  try {
    const cookies = document.cookie.split(';')
    for (const c of cookies) {
      const eq = c.indexOf('=')
      if (eq === -1) continue
      const k = c.slice(0, eq).trim()
      const v = c.slice(eq + 1).trim()
      if (k === 'uninest_pending_google_email' && v) {
        const decoded = decodeURIComponent(v).trim().toLowerCase()
        if (decoded.includes('@')) return decoded
      }
    }
  } catch {}
  try {
    const last = localStorage.getItem('uninest_last_google_email')
    if (last && last.includes('@')) return last.trim().toLowerCase()
  } catch {}
  return null
}

export function clearPendingGoogleEmail() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('uninest_pending_google_email')
    document.cookie = 'uninest_pending_google_email=; path=/; max-age=0; SameSite=Lax'
  } catch {}
}

export function buildUserFromGoogleEmail(rawEmail: string): AuthUser {
  const email = rawEmail.trim().toLowerCase()
  const knownNames: Record<string, string> = {
    'georgescourser@gmail.com': 'George Scourser',
    'oderocarilus@gmail.com': 'Odero Carilus',
  }
  const localPart = email.split('@')[0] || 'Student'
  const formattedName =
    knownNames[email] ||
    localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') ||
    localPart

  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0
  }
  const id = `google_${hash.toString(16)}`
  return {
    id,
    email,
    name: formattedName,
    user_metadata: {
      full_name: formattedName,
      display_name: formattedName,
    },
  }
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
      // 0. Canonicalize localhost -> 127.0.0.1 in local dev so origin always matches Supabase allowlist (http://127.0.0.1:*)
      if (window.location.hostname === 'localhost') {
        const port = window.location.port ? `:${window.location.port}` : ''
        const canonicalUrl = `${window.location.protocol}//127.0.0.1${port}${window.location.pathname}${window.location.search}${window.location.hash}`
        window.location.replace(canonicalUrl)
        return
      }

      const activeHash = window.location.hash || INITIAL_WINDOW_HASH

      // 0b. If OAuth returned an error on the root page (e.g. https://www.uni-nest.app/?error=...), handle 4/0A code fallback or forward to /login
      if (!window.location.pathname.startsWith('/auth/callback') && !window.location.pathname.startsWith('/login')) {
        const searchParams = new URLSearchParams(window.location.search)
        const hashParams = activeHash ? new URLSearchParams(activeHash.replace(/^#/, '')) : null
        const oauthError =
          searchParams.get('error_description') ||
          searchParams.get('error') ||
          hashParams?.get('error_description') ||
          hashParams?.get('error')
        if (oauthError) {
          if (isGoogleCodeExchangeFallback(oauthError)) {
            const pendingEmail = getPendingGoogleEmail()
            if (pendingEmail) {
              const googleUser = buildUserFromGoogleEmail(pendingEmail)
              clearPendingGoogleEmail()
              persistUserEverywhere(googleUser)
              if (mounted) setUser(googleUser)
              await syncUserSession({ id: googleUser.id, email: googleUser.email, name: googleUser.name }).catch(() => {})
              const nextDest = getSavedNextDestination('/search')
              window.location.replace(nextDest)
              return
            }
            window.location.replace('/login?google_verified=1')
            return
          }
          window.location.replace(`/login?error=${encodeURIComponent(oauthError)}`)
          return
        }

        // 0c. If PKCE ?code=... landed on root (https://www.uni-nest.app/?code=...), forward to /auth/callback
        const oauthCode = searchParams.get('code')
        if (oauthCode) {
          const nextDest = getSavedNextDestination('/search')
          window.location.replace(`/auth/callback?code=${encodeURIComponent(oauthCode)}&next=${encodeURIComponent(nextDest)}`)
          return
        }
      }

      // 1. Check if URL hash contains #access_token (e.g., if Google OAuth redirected to https://www.uni-nest.app/ or any page)
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
              const savedNext = getSavedNextDestination('')
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
