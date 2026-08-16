import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// WAJIB ada export named function
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... logic create session ...
    
    return NextResponse.json({ session_id: '...', ingredients: [...] }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}