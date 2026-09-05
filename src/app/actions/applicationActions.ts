'use server'

import { getPrisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function applyForProperty(propertyId: number) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return { error: 'You must be logged in to apply for properties.', success: false }
  }

  const userId = session.user.id
  const prisma = getPrisma()

  try {
    const existingApplication = await prisma.applications.findUnique({
      where: {
        user_id_property_id: {
          user_id: userId,
          property_id: propertyId
        }
      }
    })

    if (existingApplication) {
      return { error: 'You have already applied for this property.', success: false, hasApplied: true }
    }

    await prisma.applications.create({
      data: {
        user_id: userId,
        property_id: propertyId,
        status: 'Pending'
      }
    })
    
    revalidatePath(`/property/${propertyId}`)
    return { success: true, hasApplied: true }
  } catch (error: any) {
    console.error('Database error creating application:', error)
    return { error: 'Failed to submit application. Please try again.', success: false }
  }
}
