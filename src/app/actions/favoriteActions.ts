'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentUser } from '@/app/actions/authActions'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { FALLBACK_PROPERTIES } from '@/data/fallbackProperties'

const FAVORITES_COOKIE = 'uninest_user_favorites'
const THIRTY_DAYS = 60 * 60 * 24 * 30

async function getCookieFavoriteIds(): Promise<number[]> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(FAVORITES_COOKIE)?.value
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw))
      if (Array.isArray(parsed)) {
        return parsed.map((id: any) => Number(id)).filter(n => !isNaN(n))
      }
    }
  } catch (e) {}
  return []
}

async function setCookieFavoriteIds(ids: number[]) {
  try {
    const cookieStore = await cookies()
    cookieStore.set(FAVORITES_COOKIE, encodeURIComponent(JSON.stringify(ids)), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    })
  } catch (e) {}
}

export async function toggleFavorite(propertyId: number) {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'You must be logged in to save properties.', isFavorite: false }
  }

  const userId = user.id
  const currentIds = await getCookieFavoriteIds()
  const existsInCookie = currentIds.includes(propertyId)
  const newIsFavorite = !existsInCookie

  if (existsInCookie) {
    await setCookieFavoriteIds(currentIds.filter(id => id !== propertyId))
  } else {
    await setCookieFavoriteIds([...currentIds, propertyId])
  }

  // Gracefully attempt Supabase sync in background
  try {
    const supabase = await createClient()
    const { data: existingFavorite } = await supabase
      .from('favorites')
      .select('id')
      .match({ user_id: userId, property_id: propertyId })
      .maybeSingle()

    if (existingFavorite && !newIsFavorite) {
      await supabase.from('favorites').delete().eq('id', existingFavorite.id)
    } else if (!existingFavorite && newIsFavorite) {
      await supabase.from('favorites').insert({ user_id: userId, property_id: propertyId })
    }
  } catch (err) {
    // Graceful fallback - cookie already saved
  }

  revalidatePath('/')
  revalidatePath('/search')
  revalidatePath(`/property/${propertyId}`)
  revalidatePath('/favorites')

  return { success: true, isFavorite: newIsFavorite }
}

export async function getFavorites() {
  const user = await getCurrentUser()

  if (!user) {
    return []
  }

  const cookieIds = await getCookieFavoriteIds()
  let dbFavorites: any[] = []

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('favorites')
      .select('*, properties(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data && Array.isArray(data)) {
      dbFavorites = data
    }
  } catch (error) {
    // Ignore error
  }

  const dbPropertyIds = new Set(dbFavorites.map(f => f.property_id))
  const allFavorites = [...dbFavorites]

  // Add any cookie favorites not already in dbFavorites
  for (const id of cookieIds) {
    if (!dbPropertyIds.has(id)) {
      const fallbackProp = FALLBACK_PROPERTIES.find(p => p.id === id)
      allFavorites.push({
        id: `cookie_${id}`,
        user_id: user.id,
        property_id: id,
        created_at: new Date().toISOString(),
        properties: fallbackProp || null,
      })
    }
  }

  return allFavorites
}
