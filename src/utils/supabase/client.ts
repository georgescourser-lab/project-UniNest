import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase client env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).')
  }

  if (typeof window === 'undefined') {
    return createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        flowType: 'implicit',
        detectSessionInUrl: false,
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  }

  if (!browserClient) {
    browserClient = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        flowType: 'implicit',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        storage: window.localStorage,
      }
    })
  }

  return browserClient
}
