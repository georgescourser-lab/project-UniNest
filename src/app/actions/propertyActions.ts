'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentUser } from '@/app/actions/authActions'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { FALLBACK_PROPERTIES } from '@/data/fallbackProperties'

const SOLD_HOUSES_COOKIE = 'uninest_sold_houses_archive'
const THIRTY_DAYS = 60 * 60 * 24 * 30

const VERIFIED_AGENT_EMAILS = [
  'georgescourser@gmail.com',
  'oderocarilus@gmail.com',
]

export async function verifyAgentAccess(email?: string | null) {
  if (!email) return { isVerified: false, agent: null }
  const cleanEmail = email.trim().toLowerCase()

  const supabase = await createClient()
  const { data: agentRow } = await supabase
    .from('agents')
    .select('*')
    .ilike('email', cleanEmail)
    .maybeSingle()

  if (agentRow) {
    return { isVerified: true, agent: agentRow }
  }

  if (VERIFIED_AGENT_EMAILS.includes(cleanEmail)) {
    return {
      isVerified: true,
      agent: {
        id: cleanEmail === 'georgescourser@gmail.com' ? 1 : 2,
        name: cleanEmail === 'georgescourser@gmail.com' ? 'George Scourser' : 'Odero Carilus',
        email: cleanEmail,
      },
    }
  }

  return { isVerified: false, agent: null }
}

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
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'You must be logged in as a verified agent to post a house.' }
  }

  const { isVerified, agent } = await verifyAgentAccess(user.email)
  if (!isVerified) {
    return { error: 'Unauthorized: Only verified agents are allowed to post houses.' }
  }

  const supabase = await createClient()

  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const rent = formData.get('rent') as string
  const location = formData.get('location') as string
  const distance = formData.get('distance') as string
  const description = formData.get('description') as string
  const rawAgentId = formData.get('agent_id') as string
  const agent_id = rawAgentId ? parseInt(rawAgentId) : (agent?.id ?? null)
  const amenities = formData.getAll('amenities') as string[]
  const files = formData.getAll('images') as File[]
  const videoFiles = formData.getAll('videos') as File[]

  if (!title || !type || !rent || !location) {
    return { error: 'Please fill out all required fields.' }
  }

  const imageUrlRaw = (formData.get('image_urls') as string) || (formData.get('image_url') as string) || ''
  const providedUrls = imageUrlRaw
    .split(/[\n,]+/)
    .map(u => u.trim())
    .filter(u => u.startsWith('http://') || u.startsWith('https://'))

  const validFiles = files.filter(f => f && f.size > 0)
  if (validFiles.length === 0 && providedUrls.length === 0) {
    return { error: 'Please provide at least one property image by uploading a file or entering an image URL.' }
  }

  const uploadedImageUrls: string[] = []

  for (const file of validFiles) {
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

  const allImages = [...uploadedImageUrls, ...providedUrls]

  const uploadedVideoUrls: string[] = []

  for (const file of videoFiles) {
    if (file && file.size > 0) {
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
      images: allImages,
      videos: uploadedVideoUrls,
      image: allImages.length > 0 ? allImages[0] : null,
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
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'You must be logged in to delete a property.' }
  }

  const verifiedAgentEmails = ['georgescourser@gmail.com', 'oderocarilus@gmail.com']
  if (!verifiedAgentEmails.includes((user.email || '').trim().toLowerCase())) {
    return { error: 'Unauthorized: Only verified agents can delete properties.' }
  }

  const supabase = await createClient()

  try {
    const { error: deleteError } = await supabase.from('properties').delete().eq('id', propertyId)
    
    if (deleteError) {
      throw deleteError
    }
    
    revalidatePath('/search')
    revalidatePath('/')
    revalidatePath('/sold')
    
    return { success: true }
  } catch (error: any) {
    console.error('Database error deleting property:', error)
    return { error: 'Failed to delete property.' }
  }
}

export async function getSoldPropertiesArchive() {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(SOLD_HOUSES_COOKIE)?.value
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw))
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (e) {}
  return []
}

export async function markPropertyAsSold(propertyId: number) {
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'You must be logged in as a verified agent to mark a house as sold.' }
  }

  const { isVerified, agent } = await verifyAgentAccess(user.email)
  if (!isVerified) {
    return { error: 'Unauthorized: Only verified agents can mark houses as sold.' }
  }

  const supabase = await createClient()

  try {
    const { data: prop } = await supabase
      .from('properties')
      .select(`*, agents (*)`)
      .eq('id', propertyId)
      .maybeSingle()

    const targetProp = prop || FALLBACK_PROPERTIES.find((p) => p.id === propertyId)

    if (targetProp) {
      const existingArchive = await getSoldPropertiesArchive()
      const soldRecord = {
        id: `house-live-${targetProp.id}-${Date.now()}`,
        title: targetProp.title || 'Student Property',
        kind: 'house' as const,
        subCategory: targetProp.type || 'Apartment',
        price: `${targetProp.rent}`,
        campus: (targetProp.location || '').includes('KU')
          ? 'KU'
          : (targetProp.location || '').includes('JKUAT') || (targetProp.location || '').includes('Juja')
          ? 'JKUAT'
          : (targetProp.location || '').includes('UoN')
          ? 'UoN'
          : (targetProp.location || '').includes('Strathmore')
          ? 'Strathmore'
          : 'Campus',
        campusName: targetProp.location || 'Campus Area',
        location: targetProp.location || 'Campus Vicinity',
        image:
          targetProp.image ||
          (targetProp.images && targetProp.images[0]) ||
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
        listingRef: `UN-HSE-${String(targetProp.id).padStart(3, '0')}`,
        agentName: targetProp.agents?.name || agent?.name || 'Verified UniNest Agent',
        soldAt: 'Just now',
        description: targetProp.description || 'Verified student accommodation leased through UniNest.',
        amenitiesOrCondition: targetProp.amenities || ['Verified Listing'],
      }

      const updatedArchive = [soldRecord, ...existingArchive].slice(0, 20)
      const cookieStore = await cookies()
      cookieStore.set(SOLD_HOUSES_COOKIE, encodeURIComponent(JSON.stringify(updatedArchive)), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: THIRTY_DAYS,
      })
    }

    // Remove from active vacant properties in Supabase if present
    await supabase.from('properties').delete().eq('id', propertyId)

    revalidatePath('/search')
    revalidatePath('/')
    revalidatePath('/sold')

    return { success: true }
  } catch (error: any) {
    console.error('Error marking property as sold:', error)
    return { error: 'Failed to mark property as sold.' }
  }
}
