import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Export client ini untuk dipakai di seluruh API routes
export const supabase = createClient(supabaseUrl, supabaseAnonKey)