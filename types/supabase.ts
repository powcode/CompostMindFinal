// types/supabase.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          title: string | null
          status: 'pre_composting' | 'generating_steps' | 'active' | 'completed'
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title?: string | null
          status: 'pre_composting' | 'generating_steps' | 'active' | 'completed'
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string | null
          status?: 'pre_composting' | 'generating_steps' | 'active' | 'completed'
          user_id?: string
          created_at?: string
        }
      }
      ingredients: {
        Row: {
          id: string
          session_id: string
          name: string
          quantity: number
          condition: 'whole' | 'peel' | 'rotten'
          confidence_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          name: string
          quantity?: number
          condition?: 'whole' | 'peel' | 'rotten'
          confidence_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          name?: string
          quantity?: number
          condition?: 'whole' | 'peel' | 'rotten'
          confidence_score?: number | null
          created_at?: string
        }
      }
      steps: {
        Row: {
          id: string
          session_id: string
          step_order: number
          title: string
          instruction: string
          expected_output: string
          is_completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          step_order: number
          title: string
          instruction: string
          expected_output: string
          is_completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          step_order?: number
          title?: string
          instruction?: string
          expected_output?: string
          is_completed?: boolean
          created_at?: string
        }
      }
      chat_history: {
        Row: {
          id: string
          session_id: string
          step_id: string | null
          role: 'user' | 'bot'
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          step_id?: string | null
          role: 'user' | 'bot'
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          step_id?: string | null
          role?: 'user' | 'bot'
          message?: string
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}