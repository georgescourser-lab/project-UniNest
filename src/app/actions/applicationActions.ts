'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentUser } from '@/app/actions/authActions'
import { revalidatePath } from 'next/cache'

export async function applyForProperty(propertyId: number) {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'You must be logged in to apply for properties.', success: false }
  }

  const userId = user.id
  const supabase = await createClient()

  try {
    const { data: existingApplication } = await supabase
      .from('applications')
      .select('*')
      .match({ user_id: userId, property_id: propertyId })
      .maybeSingle()

    if (existingApplication) {
      return { error: 'You have already applied for this property.', success: false, hasApplied: true }
    }

    await supabase.from('applications').insert({
      user_id: userId,
      property_id: propertyId,
      status: 'Pending'
    })
    
    revalidatePath(`/property/${propertyId}`)
    return { success: true, hasApplied: true }
  } catch (error: any) {
    console.error('Database error creating application:', error)
    return { error: 'Failed to submit application. Please try again.', success: false }
  }
}
