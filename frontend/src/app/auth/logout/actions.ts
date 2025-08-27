'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
// Remove static import to prevent client-side bundling issues

export async function logout() {
  // Dynamic import to avoid pulling server code into client bundles
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Logout error:', error)
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
