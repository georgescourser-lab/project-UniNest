'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_COOKIE_NAME = 'uninest_user_session'
const THIRTY_DAYS = 60 * 60 * 24 * 30

async function setSessionCookie(user: { id: string; email: string; name?: string }) {
  try {
    const cookieStore = await cookies()
    const payload = {
      id: user.id,
      email: user.email.toLowerCase(),
      name: user.name || user.email.split('@')[0],
      createdAt: Date.now()
    }
    cookieStore.set(SESSION_COOKIE_NAME, encodeURIComponent(JSON.stringify(payload)), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    })
  } catch (err) {
    console.error('Failed to set session cookie:', err)
  }
}

async function clearSessionCookie() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE_NAME)
  } catch (err) {
    console.error('Failed to clear session cookie:', err)
  }
}

export async function getCurrentUser() {
  // 1. Try Supabase server client
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      return user
    }
  } catch (e) {
    // Continue to fallback cookie
  }

  // 2. Fallback to unified persistent cookie
  try {
    const cookieStore = await cookies()
    const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (rawCookie) {
      const parsed = JSON.parse(decodeURIComponent(rawCookie))
      if (parsed?.id && parsed?.email) {
        return {
          id: parsed.id,
          email: parsed.email,
          user_metadata: {
            full_name: parsed.name,
            display_name: parsed.name
          }
        } as any
      }
    }
  } catch (e) {
    // Parse error
  }

  return null
}

export async function login(prevState: any, formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const next = (formData.get('next') as string) || '/search'

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data?.user) {
    await setSessionCookie({
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.full_name || email.split('@')[0]
    })
  }

  const safeNext = next.startsWith('/') ? next : '/search'
  redirect(safeNext)
}

export async function signup(prevState: any, formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const next = (formData.get('next') as string) || '/search'

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  const userId = data?.user?.id || `user_${Date.now()}`
  await setSessionCookie({
    id: userId,
    email,
    name: email.split('@')[0]
  })

  const safeNext = next.startsWith('/') ? next : '/search'
  redirect(safeNext)
}

export async function logout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (e) {}

  await clearSessionCookie()
  redirect('/login')
}

// Unified Auth Server Actions (Client-invokable)

export async function loginWithPassword(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase()
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data?.user) {
    await setSessionCookie({
      id: data.user.id,
      email: data.user.email || cleanEmail,
      name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0]
    })
  }

  return { success: true, user: data.user }
}

export async function signupWithPassword(
  email: string,
  password: string,
  origin: string,
  next: string,
  metadata?: {
    fullName?: string;
    birthDate?: string;
    gender?: string;
    marketingOptIn?: boolean;
  }
) {
  const cleanEmail = email.trim().toLowerCase()
  const supabase = await createClient()
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`
  
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: metadata?.fullName,
        display_name: metadata?.fullName,
        birth_date: metadata?.birthDate,
        gender: metadata?.gender,
        marketing_opt_in: metadata?.marketingOptIn,
      },
      emailRedirectTo: redirectTo,
    },
  })

  if (error) {
    // If user is already registered in Supabase, attempt sign in with provided password
    if (error.message.toLowerCase().includes('already registered')) {
      const signInRes = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
      if (!signInRes.error && signInRes.data.user) {
        await setSessionCookie({
          id: signInRes.data.user.id,
          email: cleanEmail,
          name: metadata?.fullName || cleanEmail.split('@')[0]
        })
        return { success: true, hasSession: true, user: signInRes.data.user }
      }
    }
    return { error: error.message }
  }

  // Account created in Supabase! Set unified session cookie immediately so user NEVER is asked to sign in again.
  const userId = data.user?.id || `user_${Date.now()}`
  const userName = metadata?.fullName || data.user?.user_metadata?.full_name || cleanEmail.split('@')[0]

  await setSessionCookie({
    id: userId,
    email: cleanEmail,
    name: userName
  })

  return { 
    success: true, 
    hasSession: true,
    user: data.user 
  }
}

export async function sendMagicLinkAction(email: string, origin: string, next: string) {
  const supabase = await createClient()
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: redirectTo,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function getGoogleOAuthUrl(origin: string, next: string) {
  const supabase = await createClient()
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { url: data.url }
}

export async function sendPhoneOtpAction(phone: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    phone: phone.trim(),
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function verifyPhoneOtpAction(phone: string, token: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phone.trim(),
    token: token.trim(),
    type: 'sms',
  })

  if (error) {
    return { error: error.message }
  }

  if (data?.user) {
    await setSessionCookie({
      id: data.user.id,
      email: data.user.email || phone.trim(),
      name: phone.trim()
    })
  }

  return { success: true, session: data.session }
}
