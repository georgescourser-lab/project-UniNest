'use server'

import fs from 'fs'
import path from 'path'
import os from 'os'
import { createClient } from '@/utils/supabase/server'
import { getCurrentUser } from '@/app/actions/authActions'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { FALLBACK_PROPERTIES } from '@/data/fallbackProperties'
import {
  getCloudDatabase,
  addCloudProperty,
  removeCloudProperty,
  markCloudPropertySold as markStorePropertySold,
  CloudProperty,
} from '@/lib/cloudStore'

const SOLD_HOUSES_COOKIE = 'uninest_sold_houses_archive'
const POSTED_HOUSES_COOKIE = 'uninest_posted_houses_meta'
const THIRTY_DAYS = 60 * 60 * 24 * 30

const VERIFIED_AGENT_EMAILS = [
  'georgescourser@gmail.com',
  'oderocarilus@gmail.com',
]

const DEFAULT_AGENTS: Record<number, any> = {
  1: {
    id: 1,
    name: 'George Scourser',
    email: 'georgescourser@gmail.com',
    whatsapp: '+254700000001',
    image: '/images/agent-1.svg',
    rating: 4.9,
    reviews: 24,
    listings_count: 5,
  },
  2: {
    id: 2,
    name: 'Odero Carilus',
    email: 'oderocarilus@gmail.com',
    whatsapp: '+254700000002',
    image: '/images/agent-2.svg',
    rating: 4.8,
    reviews: 19,
    listings_count: 4,
  },
}

declare global {
  // eslint-disable-next-line no-var
  var __uninestPostedProperties: any[] | undefined
}

function getPostedPropertiesFilePath(): string {
  const workspaceDataDir = path.join(process.cwd(), 'data')
  try {
    if (!fs.existsSync(workspaceDataDir)) {
      fs.mkdirSync(workspaceDataDir, { recursive: true })
    }
    return path.join(workspaceDataDir, 'posted-properties.json')
  } catch {
    return path.join(os.tmpdir(), 'uninest-posted-properties.json')
  }
}

function readStoredPostedProperties(): any[] {
  const filePath = getPostedPropertiesFilePath()
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        globalThis.__uninestPostedProperties = parsed
        return parsed
      }
    }
  } catch {}

  const tmpPath = path.join(os.tmpdir(), 'uninest-posted-properties.json')
  try {
    if (fs.existsSync(tmpPath)) {
      const raw = fs.readFileSync(tmpPath, 'utf8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        globalThis.__uninestPostedProperties = parsed
        return parsed
      }
    }
  } catch {}

  return Array.isArray(globalThis.__uninestPostedProperties)
    ? globalThis.__uninestPostedProperties
    : []
}

function writeStoredPostedProperties(list: any[]) {
  globalThis.__uninestPostedProperties = list
  const filePath = getPostedPropertiesFilePath()
  try {
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8')
  } catch {
    try {
      const tmpPath = path.join(os.tmpdir(), 'uninest-posted-properties.json')
      fs.writeFileSync(tmpPath, JSON.stringify(list, null, 2), 'utf8')
    } catch {}
  }
}

async function saveUploadedFileLocallyOrDataUrl(file: File, prefix = 'img'): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const safeFileName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${rawExt}`

  // 1. If the file is reasonably sized (<= 2.5MB), a Data URL works universally across both local dev and serverless (Vercel)
  const mimeType =
    file.type ||
    (rawExt === 'png'
      ? 'image/png'
      : rawExt === 'webp'
      ? 'image/webp'
      : rawExt === 'mp4'
      ? 'video/mp4'
      : rawExt === 'webm'
      ? 'video/webm'
      : 'image/jpeg')

  // Also write to public/uploads/properties when local disk is writable (great for large files or videos in local dev)
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'properties')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    const diskPath = path.join(uploadsDir, safeFileName)
    fs.writeFileSync(diskPath, buffer)
    // For videos or large files > 1.5MB, return the public URL path; for standard images, return data URL so it survives serverless restarts too
    if (mimeType.startsWith('video/') || buffer.length > 1500 * 1024) {
      return `/uploads/properties/${safeFileName}`
    }
  } catch {
    // Read-only filesystem (e.g. Vercel production); fall through to Data URL
  }

  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

export async function verifyAgentAccess(email?: string | null) {
  if (!email) return { isVerified: false, agent: null }
  const cleanEmail = email.trim().toLowerCase()

  try {
    const supabase = await createClient()
    const { data: agentRow } = await supabase
      .from('agents')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (agentRow) {
      return { isVerified: true, agent: agentRow }
    }
  } catch {}

  if (VERIFIED_AGENT_EMAILS.includes(cleanEmail)) {
    const agentId = cleanEmail === 'georgescourser@gmail.com' ? 1 : 2
    return {
      isVerified: true,
      agent: DEFAULT_AGENTS[agentId],
    }
  }

  return { isVerified: false, agent: null }
}

export async function getAgents() {
  try {
    const supabase = await createClient()
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .order('name', { ascending: true })

    if (agents && agents.length > 0) {
      return agents.map((agent: any) => ({
        ...agent,
        rating: agent.rating ? Number(agent.rating) : null,
      }))
    }
  } catch {}

  return Object.values(DEFAULT_AGENTS)
}

export async function getAllProperties(filters?: {
  types?: string[]
  campuses?: string[]
  location?: string
}) {
  let cloudProperties: any[] = []
  try {
    const db = await getCloudDatabase()
    cloudProperties = (db.properties || []).filter((p) => !p.is_sold)
  } catch {}

  let dbProperties: any[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('properties')
      .select('*, agents(*)')
      .order('id', { ascending: false })
    if (Array.isArray(data)) {
      dbProperties = data
    }
  } catch {}

  const localProperties = readStoredPostedProperties()

  // Also check cookie metadata fallback in case a serverless instance cold-started
  let cookieProperties: any[] = []
  try {
    const cookieStore = await cookies()
    const rawCookie = cookieStore.get(POSTED_HOUSES_COOKIE)?.value
    if (rawCookie) {
      const parsed = JSON.parse(decodeURIComponent(rawCookie))
      if (Array.isArray(parsed)) {
        cookieProperties = parsed
      }
    }
  } catch {}

  const byId = new Map<number, any>()
  for (const p of cookieProperties) {
    if (p && typeof p.id === 'number') byId.set(p.id, p)
  }
  for (const p of localProperties) {
    if (p && typeof p.id === 'number') byId.set(p.id, p)
  }
  for (const p of dbProperties) {
    if (p && typeof p.id === 'number') byId.set(p.id, p)
  }
  for (const p of cloudProperties) {
    if (p && typeof p.id === 'number') byId.set(p.id, p)
  }

  let merged = Array.from(byId.values()).sort((a, b) => Number(b.id) - Number(a.id))

  if (filters?.types && filters.types.length > 0) {
    const allowedTypes = new Set(filters.types.map((t) => t.toLowerCase()))
    merged = merged.filter((p) => allowedTypes.has(String(p.type || '').toLowerCase()))
  }

  const locationTerms: string[] = []
  if (filters?.campuses && filters.campuses.length > 0) {
    locationTerms.push(...filters.campuses.map((c) => c.toLowerCase()))
  }
  if (filters?.location && filters.location.trim() !== '') {
    locationTerms.push(filters.location.trim().toLowerCase())
  }
  if (locationTerms.length > 0) {
    merged = merged.filter((p) => {
      const loc = String(p.location || '').toLowerCase()
      const title = String(p.title || '').toLowerCase()
      return locationTerms.some((term) => loc.includes(term) || title.includes(term))
    })
  }

  return merged
}

export async function getPropertyById(propertyId: number) {
  try {
    const db = await getCloudDatabase()
    const foundCloud = (db.properties || []).find((p) => Number(p.id) === Number(propertyId))
    if (foundCloud) {
      return {
        ...foundCloud,
        agents: foundCloud.agents || DEFAULT_AGENTS[foundCloud.agent_id || 1] || DEFAULT_AGENTS[1],
        reviews: [],
      }
    }
  } catch {}

  try {
    const supabase = await createClient()
    const { data: propertyData } = await supabase
      .from('properties')
      .select(`*, agents (*), reviews (*)`)
      .eq('id', propertyId)
      .maybeSingle()
    if (propertyData) return propertyData
  } catch {}

  const localList = readStoredPostedProperties()
  const foundLocal = localList.find((p) => Number(p.id) === Number(propertyId))
  if (foundLocal) {
    return {
      ...foundLocal,
      agents: foundLocal.agents || DEFAULT_AGENTS[foundLocal.agent_id || 1] || DEFAULT_AGENTS[1],
      reviews: foundLocal.reviews || [],
    }
  }

  try {
    const cookieStore = await cookies()
    const rawCookie = cookieStore.get(POSTED_HOUSES_COOKIE)?.value
    if (rawCookie) {
      const parsed = JSON.parse(decodeURIComponent(rawCookie))
      if (Array.isArray(parsed)) {
        const foundCookie = parsed.find((p: any) => Number(p.id) === Number(propertyId))
        if (foundCookie) {
          return {
            ...foundCookie,
            agents: foundCookie.agents || DEFAULT_AGENTS[foundCookie.agent_id || 1] || DEFAULT_AGENTS[1],
            reviews: foundCookie.reviews || [],
          }
        }
      }
    }
  } catch {}

  const fallback = FALLBACK_PROPERTIES.find((p) => Number(p.id) === Number(propertyId))
  return fallback || null
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

  const title = (formData.get('title') as string)?.trim()
  const type = (formData.get('type') as string)?.trim()
  const rent = (formData.get('rent') as string)?.trim()
  const location = (formData.get('location') as string)?.trim()
  const distance = ((formData.get('distance') as string) || '').trim()
  const description = ((formData.get('description') as string) || '').trim()
  const rawAgentId = formData.get('agent_id') as string
  const agent_id = rawAgentId ? parseInt(rawAgentId, 10) : (agent?.id ?? 1)
  const amenities = formData.getAll('amenities') as string[]
  const files = formData.getAll('images') as File[]
  const videoFiles = formData.getAll('videos') as File[]

  if (!title || !type || !rent || !location) {
    return { error: 'Please fill out all required fields.' }
  }

  // 1. Collect pre-compressed client data URLs if present
  const compressedImagesRaw = (formData.get('compressed_images_json') as string) || ''
  let compressedClientImages: string[] = []
  if (compressedImagesRaw) {
    try {
      const parsed = JSON.parse(compressedImagesRaw)
      if (Array.isArray(parsed)) {
        compressedClientImages = parsed.filter(
          (u) => typeof u === 'string' && (u.startsWith('data:image/') || u.startsWith('http') || u.startsWith('/'))
        )
      }
    } catch {}
  }

  // 2. Collect web URLs
  const imageUrlRaw =
    (formData.get('image_urls') as string) || (formData.get('image_url') as string) || ''
  const providedUrls = imageUrlRaw
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image/'))

  const validFiles = files.filter((f) => f && typeof f.size === 'number' && f.size > 0 && f.name !== 'undefined')
  if (compressedClientImages.length === 0 && validFiles.length === 0 && providedUrls.length === 0) {
    return {
      error: 'Please provide at least one property image by uploading a file or entering an image URL.',
    }
  }

  const uploadedImageUrls: string[] = [...compressedClientImages]

  // Only process raw `validFiles` if client didn't already compress them into `compressedClientImages`
  if (uploadedImageUrls.length === 0 && validFiles.length > 0) {
    for (const file of validFiles) {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      let publicOrLocalUrl: string | null = null
      try {
        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file)

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('property-images').getPublicUrl(filePath)
          publicOrLocalUrl = publicUrl
        }
      } catch {}

      // Fallback when Supabase storage bucket has RLS or is unavailable
      if (!publicOrLocalUrl) {
        try {
          publicOrLocalUrl = await saveUploadedFileLocallyOrDataUrl(file, 'prop_img')
        } catch (fallbackErr: any) {
          console.error('Fallback image processing error:', fallbackErr)
        }
      }

      if (publicOrLocalUrl) {
        uploadedImageUrls.push(publicOrLocalUrl)
      }
    }
  }

  const allImages = [...uploadedImageUrls, ...providedUrls]
  if (allImages.length === 0) {
    return { error: 'Could not process the uploaded image. Please try another image file or paste an image URL.' }
  }

  const uploadedVideoUrls: string[] = []
  for (const file of videoFiles) {
    if (file && typeof file.size === 'number' && file.size > 0 && file.name !== 'undefined') {
      const fileExt = file.name.split('.').pop() || 'mp4'
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      let videoUrl: string | null = null
      try {
        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file)

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('property-images').getPublicUrl(filePath)
          videoUrl = publicUrl
        }
      } catch {}

      if (!videoUrl) {
        try {
          videoUrl = await saveUploadedFileLocallyOrDataUrl(file, 'prop_vid')
        } catch {}
      }

      if (videoUrl) {
        uploadedVideoUrls.push(videoUrl)
      }
    }
  }

  const normalizedRent = rent.toLowerCase().startsWith('ksh') ? rent : `Ksh ${rent}`

  // 1. Try saving to Supabase `properties` table first
  let supabaseId: number | null = null
  try {
    const { data: newProperty, error: insertError } = await supabase
      .from('properties')
      .insert({
        title,
        type,
        rent: normalizedRent,
        location,
        distance,
        description,
        agent_id,
        amenities,
        images: allImages,
        videos: uploadedVideoUrls,
        image: allImages[0] || null,
      })
      .select()
      .single()

    if (!insertError && newProperty?.id) {
      supabaseId = newProperty.id
    }
  } catch {}

  const newId = supabaseId || Date.now()
  const resolvedAgent = DEFAULT_AGENTS[agent_id] || agent || DEFAULT_AGENTS[1]

  const propertyRecord = {
    id: newId,
    title,
    type,
    rent: normalizedRent,
    location,
    distance,
    description,
    agent_id,
    agents: resolvedAgent,
    amenities,
    images: allImages,
    videos: uploadedVideoUrls,
    image: allImages[0] || null,
    created_at: new Date().toISOString(),
    is_sold: false,
  }

  // 2. Persist to live cloud store (Shared across all devices instantly!)
  try {
    await addCloudProperty(propertyRecord)
  } catch (cloudErr) {
    console.error('Error saving to cloud store:', cloudErr)
  }

  // 3. Persist to local backup
  const existingLocal = readStoredPostedProperties()
  const updatedLocal = [propertyRecord, ...existingLocal.filter((p) => p.id !== newId)]
  writeStoredPostedProperties(updatedLocal)

  // Save compact copy to cookie (trimming oversized base64 arrays if > 3KB so cookie stays within browser 4KB limit)
  try {
    const cookieStore = await cookies()
    const compactList = updatedLocal.slice(0, 8).map((p) => {
      const primaryImg =
        typeof p.image === 'string' && p.image.length < 2500
          ? p.image
          : '/images/property-2.svg'
      return {
        id: p.id,
        title: p.title,
        type: p.type,
        rent: p.rent,
        location: p.location,
        distance: p.distance,
        description: p.description,
        agent_id: p.agent_id,
        amenities: p.amenities,
        image: primaryImg,
        images: [primaryImg],
        videos: [],
      }
    })
    cookieStore.set(POSTED_HOUSES_COOKIE, encodeURIComponent(JSON.stringify(compactList)), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    })
  } catch {}

  revalidatePath('/search')
  revalidatePath('/')
  revalidatePath(`/property/${newId}`)

  return { success: true, propertyId: newId }
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

  // 1. Delete from shared cloud store
  try {
    await removeCloudProperty(propertyId)
  } catch (err) {
    console.error('Error removing from cloud store:', err)
  }

  // 2. Delete from Supabase table if present
  try {
    const supabase = await createClient()
    await supabase.from('properties').delete().eq('id', propertyId)
  } catch {}

  // 3. Also remove from local posted properties store & cookie
  const existingLocal = readStoredPostedProperties()
  const filteredLocal = existingLocal.filter((p) => Number(p.id) !== Number(propertyId))
  writeStoredPostedProperties(filteredLocal)

  try {
    const cookieStore = await cookies()
    const rawCookie = cookieStore.get(POSTED_HOUSES_COOKIE)?.value
    if (rawCookie) {
      const parsed = JSON.parse(decodeURIComponent(rawCookie))
      if (Array.isArray(parsed)) {
        const nextCookie = parsed.filter((p: any) => Number(p.id) !== Number(propertyId))
        cookieStore.set(POSTED_HOUSES_COOKIE, encodeURIComponent(JSON.stringify(nextCookie)), {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: THIRTY_DAYS,
        })
      }
    }
  } catch {}

  revalidatePath('/search')
  revalidatePath('/')
  revalidatePath('/sold')

  return { success: true }
}

export async function getSoldPropertiesArchive() {
  try {
    const db = await getCloudDatabase()
    const soldProps = (db.properties || [])
      .filter((p) => p.is_sold)
      .map((p) => ({
        id: `house-cloud-${p.id}`,
        title: p.title || 'Student Property',
        kind: 'house' as const,
        subCategory: p.type || 'Apartment',
        price: `${p.rent}`,
        campus: (p.location || '').includes('KU')
          ? 'KU'
          : (p.location || '').includes('JKUAT')
          ? 'JKUAT'
          : (p.location || '').includes('UoN')
          ? 'UoN'
          : 'Campus',
        campusName: p.location || 'Campus Area',
        location: p.location || 'Campus Vicinity',
        image: p.image || (p.images && p.images[0]) || '/images/property-2.svg',
        listingRef: `UN-HSE-${String(p.id).slice(-4).padStart(3, '0')}`,
        agentName: p.agents?.name || 'Verified UniNest Agent',
        soldAt: 'Recently',
        description: p.description || 'Verified student accommodation leased through UniNest.',
        amenitiesOrCondition: p.amenities || ['Verified Listing'],
      }))

    const cookieStore = await cookies()
    const raw = cookieStore.get(SOLD_HOUSES_COOKIE)?.value
    let cookieSold: any[] = []
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw))
      if (Array.isArray(parsed)) {
        cookieSold = parsed
      }
    }

    const merged = [...soldProps, ...cookieSold]
    const seen = new Set<string>()
    return merged.filter((item) => {
      const key = item.listingRef || item.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
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

  try {
    // 1. Mark as sold in shared cloud store
    await markStorePropertySold(propertyId)

    const targetProp = await getPropertyById(propertyId)

    if (targetProp) {
      const existingArchive = await getSoldPropertiesArchive()
      const rawImg =
        targetProp.image ||
        (targetProp.images && targetProp.images[0]) ||
        '/images/property-2.svg'
      // Keep cookie size small if image is a large base64 string
      const archiveImg =
        typeof rawImg === 'string' && rawImg.length > 2500
          ? '/images/property-2.svg'
          : rawImg

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
        image: archiveImg,
        listingRef: `UN-HSE-${String(targetProp.id).slice(-4).padStart(3, '0')}`,
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

    revalidatePath('/search')
    revalidatePath('/')
    revalidatePath('/sold')

    return { success: true }
  } catch (error: any) {
    console.error('Error marking property as sold:', error)
    return { error: 'Failed to mark property as sold.' }
  }
}
