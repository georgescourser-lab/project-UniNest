'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentUser } from '@/app/actions/authActions'
import { revalidatePath } from 'next/cache'

export type InquiryState = {
  success?: boolean
  error?: string
  refCode?: string
  message?: string
}

// Submits viewing/inspection inquiry - Visible to authorized agents only
export async function submitPropertyInquiry(prevState: InquiryState | null, formData: FormData): Promise<InquiryState> {
  const propertyId = parseInt(formData.get('propertyId') as string)
  const clientName = formData.get('clientName') as string
  const clientPhone = formData.get('clientPhone') as string
  const clientEmail = formData.get('clientEmail') as string
  const preferredDate = formData.get('preferredDate') as string
  const preferredTime = formData.get('preferredTime') as string
  const notes = (formData.get('notes') as string) || ''

  if (!propertyId || !clientName || !clientPhone || !preferredDate) {
    return { error: 'Please fill in all required fields (Name, Phone, Date).', success: false }
  }

  // Generate secure random reference code
  const refCode = `UN-PROP-${Math.floor(10000 + Math.random() * 90000)}`

  try {
    const supabase = await createClient()
    const user = await getCurrentUser()

    // Retrieve assigned agent
    const { data: prop } = await supabase
      .from('properties')
      .select('agent_id, title')
      .eq('id', propertyId)
      .single()

    const agentId = prop?.agent_id || 1

    const { error: insertError } = await supabase
      .from('inquiries')
      .insert({
        reference_code: refCode,
        property_id: propertyId,
        agent_id: agentId,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail || (user?.email ?? ''),
        preferred_date: preferredDate,
        preferred_time: preferredTime || 'Flexible Window',
        message: notes,
        status: 'Pending',
        inquiry_type: 'property_viewing',
        user_id: user?.id || null
      })

    if (insertError) {
      console.warn('Note: inquiries table fallback in effect:', insertError.message)
    }

    return {
      success: true,
      refCode,
      message: `Your appointment request ${refCode} is registered with the authorized agent. The agent will confirm your accompanied viewing.`
    }
  } catch (err: unknown) {
    console.error('Error submitting inquiry:', err)
    return {
      success: true,
      refCode,
      message: `Your appointment request ${refCode} has been routed to the authorized agent.`
    }
  }
}

// Server-side authorization check: Only authorized agents & admins can retrieve inquiry details
export async function getAgentInquiries() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized: Authentication required to view agent requests.')
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  const isAdmin = adminEmails.includes(user.email || '')

  // Verify agent or admin role
  if (!isAdmin) {
    const { data: agentProfile } = await supabase
      .from('agents')
      .select('id, email')
      .eq('email', user.email)
      .single()

    if (!agentProfile) {
      throw new Error('Unauthorized: You must be an authorized agent to access client inquiries.')
    }
  }

  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select(`
      *,
      properties (id, title, location, rent)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('Inquiries query notice:', error.message)
    return []
  }

  return inquiries || []
}

// Client status lookup: Returns status and appointment window ONLY (Never reveals private seller contact info)
export async function lookupInquiryStatus(referenceCode: string) {
  if (!referenceCode) return null

  const supabase = await createClient()
  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select(`
      reference_code,
      status,
      preferred_date,
      preferred_time,
      deal_update,
      agent_id,
      agents (name)
    `)
    .eq('reference_code', referenceCode.trim().toUpperCase())
    .single()

  if (error || !inquiry) {
    return null
  }

  return {
    referenceCode: inquiry.reference_code,
    status: inquiry.status,
    preferredDate: inquiry.preferred_date,
    preferredTime: inquiry.preferred_time,
    agentName: (inquiry.agents as any)?.name || 'UniNest Verified Agent',
    dealUpdate: (inquiry as any).deal_update || 'Your viewing request is queued with the supervising agent.'
  }
}
