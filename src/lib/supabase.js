import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY

// Get the site URL based on environment
const siteURL = import.meta.env.PROD 
  ? 'https://dumpr.jpaliakkara.com'  // Replace with your actual Vercel deployment URL
  : 'http://localhost:3000'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    redirectTo: siteURL,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
