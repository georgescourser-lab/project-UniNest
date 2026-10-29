'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_COOKIE_NAME = 'uninest_user_session'
const CLIENT_COOKIE_NAME = 'uninest_user_client'
const THIRTY_DAYS = 60 * 60 * 24 * 30

const VERIFIED_AGENT_EMAILS = [
  'georgescourser@gmail.com',
  'oderocarilus@gmail.com',
]

export async function isVerifiedAgentEmail(email?: string | null): Promise<boolean> {
  if (!email) return false
  return VERIFIED_AGENT_EMAILS.includes(email.trim().toLowerCase())
}

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

export async function syncUserSession(user: { id: string; email: string; name?: string }) {
  await setSessionCookie(user)
  return { success: true }
}

export async function clearUserSession() {
  await clearSessionCookie()
  return { success: true }
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

export async function logout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (e) {}

  await clearSessionCookie()
  redirect('/login')
}

export async function sendMagicLinkAction(email: string, origin: string, next: string) {
  const supabase = await createClient()
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function sendEmailOtpAction(userEmail: string) {
  const cleanEmail = userEmail.trim().toLowerCase()
  const supabase = await createClient()

  // 1. Send the 6-digit OTP to any email (including custom @uni-nest.app email)
  const { data, error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      shouldCreateUser: true,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, data }
}

export async function verifyEmailOtpAction(
  userEmail: string,
  sixDigitCode: string,
  otpType: 'email' | 'signup' = 'email'
) {
  const cleanEmail = userEmail.trim().toLowerCase()
  const cleanToken = sixDigitCode.trim()
  const supabase = await createClient()

  // 2. Verify the 6-digit code when the user types it in
  let { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: otpType,
  })

  // Fallback between 'email' and 'signup' in case OTP was triggered via the other method
  if (verifyError) {
    const fallbackType = otpType === 'email' ? 'signup' : 'email'
    const fallbackRes = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: fallbackType,
    })
    if (!fallbackRes.error && fallbackRes.data) {
      sessionData = fallbackRes.data
      verifyError = null
    }
  }

  if (verifyError) {
    return { error: verifyError.message }
  }

  if (sessionData?.user) {
    await setSessionCookie({
      id: sessionData.user.id,
      email: sessionData.user.email || cleanEmail,
      name: sessionData.user.user_metadata?.full_name || cleanEmail.split('@')[0],
    })
  }

  return { success: true, session: sessionData?.session, user: sessionData?.user }
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
      email: data.user.email || phone,
      name: data.user.user_metadata?.full_name || phone
    })
  }

  return { success: true, user: data.user }
}
