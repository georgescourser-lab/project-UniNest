'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function addReview(formData: FormData) {
  const property_id = parseInt(formData.get('property_id') as string)
  const client_name = formData.get('client_name') as string
  const rating = parseInt(formData.get('rating') as string)
  const comment = formData.get('comment') as string

  if (!property_id || !client_name || !rating || !comment) {
    throw new Error('All fields are required')
  }

  try {
    await prisma.reviews.create({
      data: {
        property_id,
        client_name,
        rating,
        comment
      }
    })

    revalidatePath(`/property/${property_id}`)
  } catch (err) {
    // Log full error server-side for debugging, but return a safe message to the client
    // so we don't leak internal details in the response body.
    // Use console.error so Next.js/Turbopack will include it in server logs.
    // eslint-disable-next-line no-console
    console.error('addReview error:', err)
    throw new Error('Unable to add review — server error. Check server logs.')
  }
}
