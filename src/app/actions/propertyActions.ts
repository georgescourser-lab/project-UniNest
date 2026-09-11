'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAgents() {
  const supabase = await createClient()
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .order('name', { ascending: true })
  
  if (!agents) return []
  
  return agents.map((agent: any) => ({
    ...agent,
    rating: agent.rating ? Number(agent.rating) : null
  }))
}

export async function addProperty(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to post a property.' }
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  if (!adminEmails.includes(user.email || '')) {
    return { error: 'You do not have permission to post a property. Admin access required.' }
  }

  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const rent = formData.get('rent') as string
  const location = formData.get('location') as string
  const distance = formData.get('distance') as string
  const description = formData.get('description') as string
  const agent_id = formData.get('agent_id') ? parseInt(formData.get('agent_id') as string) : null
  const amenities = formData.getAll('amenities') as string[]
  const files = formData.getAll('images') as File[]
  const videoFiles = formData.getAll('videos') as File[]

  if (!title || !type || !rent || !location) {
    return { error: 'Please fill out all required fields.' }
  }

  const uploadedImageUrls: string[] = []

  for (const file of files) {
    if (file.size > 0) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { data, error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
        return { error: `Failed to upload image: ${uploadError.message}` }
      }

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath)

      uploadedImageUrls.push(publicUrl)
    }
  }

  const uploadedVideoUrls: string[] = []

  for (const file of videoFiles) {
    if (file.size > 0) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { data, error: uploadError } = await supabase.storage
        .from('property-images') // using same bucket for simplicity
        .upload(filePath, file)

      if (uploadError) {
        console.error('Error uploading video:', uploadError)
        return { error: `Failed to upload video: ${uploadError.message}` }
      }

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath)

      uploadedVideoUrls.push(publicUrl)
    }
  }

  try {
    const { data: newProperty, error: insertError } = await supabase.from('properties').insert({
      title,
      type,
      rent,
      location,
      distance,
      description,
      agent_id,
      amenities,
      images: uploadedImageUrls,
      videos: uploadedVideoUrls,
      image: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
    }).select().single()

    if (insertError) {
      throw insertError
    }

    revalidatePath('/search')
    revalidatePath('/')
    
    // Returning success triggers a redirect or UI update
    return { success: true, propertyId: newProperty.id }
  } catch (error: any) {
    console.error('Database error:', error)
    return { error: 'Failed to save property to database.' }
  }
}

export async function deleteProperty(propertyId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to delete a property.' }
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  if (!adminEmails.includes(user.email || '')) {
    return { error: 'You do not have permission to delete a property. Admin access required.' }
  }

  try {
    const { error: deleteError } = await supabase.from('properties').delete().eq('id', propertyId)
    
    if (deleteError) {
      throw deleteError
    }
    
    revalidatePath('/search')
    revalidatePath('/')
    
    return { success: true }
  } catch (error: any) {
    console.error('Database error deleting property:', error)
    return { error: 'Failed to delete property.' }
  }
}
