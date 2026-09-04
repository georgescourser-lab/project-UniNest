'use server'

import { getPrisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addProperty(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return { error: 'You must be logged in to post a property.' }
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  if (!adminEmails.includes(session.user.email || '')) {
    return { error: 'You do not have permission to post a property. Admin access required.' }
  }

  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const rent = formData.get('rent') as string
  const location = formData.get('location') as string
  const distance = formData.get('distance') as string
  const description = formData.get('description') as string
  const amenities = formData.getAll('amenities') as string[]
  const files = formData.getAll('images') as File[]

  if (!title || !type || !rent || !location) {
    return { error: 'Please fill out all required fields.' }
  }

  const uploadedImageUrls: string[] = []

  for (const file of files) {
    if (file.size > 0) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${session.user.id}/${fileName}`

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

  const prisma = getPrisma()

  try {
    const newProperty = await prisma.properties.create({
      data: {
        title,
        type,
        rent,
        location,
        distance,
        description,
        amenities,
        images: uploadedImageUrls,
        image: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
      }
    })

    revalidatePath('/search')
    revalidatePath('/')
    
    // Returning success triggers a redirect or UI update
    return { success: true, propertyId: newProperty.id }
  } catch (error: any) {
    console.error('Database error:', error)
    return { error: 'Failed to save property to database.' }
  }
}
