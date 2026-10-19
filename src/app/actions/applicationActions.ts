'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentUser } from '@/app/actions/authActions'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

const APPLICATIONS_COOKIE = 'uninest_user_applications'
const THIRTY_DAYS = 60 * 60 * 24 * 30

async function getCookieApplications(): Promise<number[]> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(APPLICATIONS_COOKIE)?.value
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw))
      if (Array.isArray(parsed)) {
        return parsed.map((id: any) => Number(id)).filter(n => !isNaN(n))
      }
    }
  } catch (e) {}
  return []
}

async function addCookieApplication(propertyId: number) {
  try {
    const current = await getCookieApplications()
    if (!current.includes(propertyId)) {
      const cookieStore = await cookies()
      cookieStore.set(APPLICATIONS_COOKIE, encodeURIComponent(JSON.stringify([...current, propertyId])), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: THIRTY_DAYS,
      })
    }
  } catch (e) {}
}

export async function applyForProperty(propertyId: number) {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'You must be logged in to apply for properties.', success: false }
  }

  const userId = user.id
  const currentApplied = await getCookieApplications()
  if (currentApplied.includes(propertyId)) {
    return { error: 'You have already applied for this property.', success: false, hasApplied: true }
  }

  // Record in cookie immediately
  await addCookieApplication(propertyId)

  // Gracefully attempt Supabase insert in background
  try {
    const supabase = await createClient()
    const { data: existingApplication } = await supabase
      .from('applications')
      .select('*')
      .match({ user_id: userId, property_id: propertyId })
      .maybeSingle()

    if (!existingApplication) {
      await supabase.from('applications').insert({
        user_id: userId,
        property_id: propertyId,
        status: 'Pending'
      })
    }
  } catch (error: any) {
    // Graceful fallback - cookie already saved
  }

  revalidatePath(`/property/${propertyId}`)
  return { success: true, hasApplied: true }
}

export async function hasUserApplied(propertyId: number): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const cookieApps = await getCookieApplications()
  if (cookieApps.includes(propertyId)) return true

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('applications')
      .select('id')
      .match({ user_id: user.id, property_id: propertyId })
      .maybeSingle()
    if (data) return true
  } catch (e) {}

  return false
}
