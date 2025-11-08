import { useState } from 'react'
import { supabase, siteUrl } from '../lib/supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: siteUrl,
          queryParams: {
            prompt: 'select_account'
          }
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Auth error:', error);
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome to Dumpr</h1>
        <p className="text-slate-600 mb-8 text-center">Sign in to start organizing your thoughts</p>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}
