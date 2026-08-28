'use server'

import { createClient } from '@/utils/supabase/server'

export async function signUp(prevState: any, formData: FormData) {
  try {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error('SignUp Error:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Unexpected SignUp Error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred during registration.' }
  }
}

export async function signIn(prevState: any, formData: FormData) {
  try {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('SignIn Error:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Unexpected SignIn Error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred during login.' }
  }
}
