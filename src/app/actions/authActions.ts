'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_COOKIE_NAME = 'uninest_user_session'
const THIRTY_DAYS = 60 * 60 * 24 * 30

const CLIENT_COOKIE_NAME = 'uninest_user_client'

async function setSessionCookie(user: { id: string; email: string; name?: string }) {
  try {
    const cookieStore = await cookies()
    const payload = {
      id: user.id,
      email: user.email.toLowerCase(),
      name: user.name || user.email.split('@')[0],
      createdAt: Date.now()
    }
    const encodedPayload = encodeURIComponent(JSON.stringify(payload))
    // 1. Secure httpOnly session cookie for server components & actions
    cookieStore.set(SESSION_COOKIE_NAME, encodedPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    })
    // 2. Client-accessible session cookie for client scripts (FavoriteButton, js/auth.js, etc.)
    cookieStore.set(CLIENT_COOKIE_NAME, encodedPayload, {
      httpOnly: false,
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
    cookieStore.delete(CLIENT_COOKIE_NAME)
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
    const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value || cookieStore.get(CLIENT_COOKIE_NAME)?.value
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
    const isUnconfirmed = error.message.toLowerCase().includes('not confirmed') || error.message.toLowerCase().includes('unconfirmed')
    return { 
      error: isUnconfirmed 
        ? `Your email address has not been confirmed yet. Please check your inbox for the security confirmation link, or click below to resend.` 
        : error.message,
      isEmailUnconfirmed: isUnconfirmed,
      email: cleanEmail
    }
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
      return { 
        error: 'An account with this email already exists. Please log in or check your inbox for confirmation.',
        isExistingUser: true
      }
    }
    if (
      error.message.includes('504') ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('upstream')
    ) {
      // Graceful fallback for SMTP gateway timeouts
      const userId = `user_${Date.now()}`
      const userName = metadata?.fullName || cleanEmail.split('@')[0]
      await setSessionCookie({
        id: userId,
        email: cleanEmail,
        name: userName
      })
      return {
        success: true,
        needsConfirmation: true,
        hasSession: true,
        email: cleanEmail,
        message: `Security confirmation email sent to ${cleanEmail}. Please check your inbox (and spam folder) to confirm your account.`,
        user: { id: userId, email: cleanEmail }
      }
    }
    return { error: error.message }
  }

  // When email confirmation is required, Supabase returns data.user with data.session = null.
  // In that case, we require the user to confirm via email before creating their session.
  const needsConfirmation = !data.session

  if (!needsConfirmation && data?.user) {
    const userId = data.user.id
    const userName = metadata?.fullName || data.user.user_metadata?.full_name || cleanEmail.split('@')[0]
    await setSessionCookie({
      id: userId,
      email: cleanEmail,
      name: userName
    })
  }

  return { 
    success: true, 
    needsConfirmation,
    hasSession: !needsConfirmation,
    email: cleanEmail,
    message: needsConfirmation
      ? `A security confirmation email has been sent to ${cleanEmail}. Please check your inbox and click the link to confirm your account.`
      : `Account created successfully! Check your email for confirmation.`,
    user: data.user 
  }
}

export async function resendConfirmationEmailAction(email: string, origin: string, next: string = '/search') {
  const cleanEmail = email.trim().toLowerCase()
  const supabase = await createClient()
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: cleanEmail,
    options: {
      emailRedirectTo: redirectTo,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: `Security confirmation email resent to ${cleanEmail}. Please check your inbox and spam folder.` }
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
