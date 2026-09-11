'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleFavorite(propertyId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to save properties.', isFavorite: false }
  }

  const userId = user.id

  try {
    const { data: existingFavorite } = await supabase
      .from('favorites')
      .select('*')
      .match({ user_id: userId, property_id: propertyId })
      .single()

    if (existingFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('id', existingFavorite.id)

      revalidatePath('/')
      revalidatePath('/search')
      revalidatePath(`/property/${propertyId}`)
      revalidatePath('/favorites')
      return { success: true, isFavorite: false }
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: userId, property_id: propertyId })

      revalidatePath('/')
      revalidatePath('/search')
      revalidatePath(`/property/${propertyId}`)
      revalidatePath('/favorites')
      return { success: true, isFavorite: true }
    }
  } catch (error: any) {
    console.error('Database error toggling favorite:', error)
    return { error: 'Failed to update favorites.' }
  }
}

export async function getFavorites() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  try {
    const { data: favorites } = await supabase
      .from('favorites')
      .select('*, properties(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return favorites || []
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return []
  }
}
