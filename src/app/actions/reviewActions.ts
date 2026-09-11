'use server'

import { createClient } from '@/utils/supabase/server'
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
    const supabase = await createClient()

    const { error } = await supabase.from('reviews').insert({
      property_id,
      client_name,
      rating,
      comment
    })

    if (error) throw error

    revalidatePath(`/property/${property_id}`)
  } catch (err) {
    console.error('addReview error:', err)
    throw new Error('Unable to add review — server error. Check server logs.')
  }
}
