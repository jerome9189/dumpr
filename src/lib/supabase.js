import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY

// Get the site URL based on environment
const getSiteUrl = () => {
  if (import.meta.env.PROD) {
    return 'https://dumpr.jpaliakkara.com'
  }
  return 'http://localhost:5173'
}

export const siteUrl = getSiteUrl()
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
