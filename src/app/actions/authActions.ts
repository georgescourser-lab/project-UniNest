'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Return error to be displayed in the UI
    return { error: error.message }
  }

  redirect('/search')
}

export async function signup(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  
  // Note: we can't use window.location.origin on the server, so we use process.env or just rely on Supabase defaults
  // Better to pass origin from the client if needed, or rely on VERCEL_URL. 
  // Next.js headers() can get the host, but Supabase Site URL in the dashboard handles redirects.
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    // options: {
    //   emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    // }
  })

  if (error) {
    return { error: error.message }
  }

  // Redirect to login page with success message
  redirect('/login?signup=success')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
