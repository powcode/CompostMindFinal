'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    // Dalam produksi, Anda mungkin ingin mengembalikan error object
    // atau redirect ke halaman error dengan pesan spesifik
    console.error(error.message)
    return { error: error.message }
  }

  // Redirect ke halaman login atau dashboard setelah sukses
  redirect('/login?message=Check your email for confirmation link')
}

// ... kode sebelumnya

export async function signIn(formData: FormData) {
  const supabase = await createClient() // Pastikan ada 'await'

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { success: false, error: error.message }
  }

  // ✅ KEMBALIKAN STATUS SUKSES, JANGAN REDIRECT DI SINI
  return { success: true, error: null }
}