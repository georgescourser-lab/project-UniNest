'use server'

import { getPrisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleFavorite(propertyId: number) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return { error: 'You must be logged in to save properties.', isFavorite: false }
  }

  const userId = session.user.id
  const prisma = getPrisma()

  try {
    const existingFavorite = await prisma.favorites.findUnique({
      where: {
        user_id_property_id: {
          user_id: userId,
          property_id: propertyId
        }
      }
    })

    if (existingFavorite) {
      await prisma.favorites.delete({
        where: { id: existingFavorite.id }
      })
      revalidatePath('/')
      revalidatePath('/search')
      revalidatePath(`/property/${propertyId}`)
      revalidatePath('/favorites')
      return { success: true, isFavorite: false }
    } else {
      await prisma.favorites.create({
        data: {
          user_id: userId,
          property_id: propertyId
        }
      })
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
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return []
  }

  const prisma = getPrisma()
  try {
    const favorites = await prisma.favorites.findMany({
      where: { user_id: session.user.id },
      include: {
        properties: true
      },
      orderBy: { created_at: 'desc' }
    })
    return favorites
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return []
  }
}
