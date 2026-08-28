// app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Wajib Auth: Tolak jika tidak ada user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required. Please login to start composting.' }, 
        { status: 401 }
      );
    }

    // 2. Validasi Input
    const body = await request.json();
    const { ingredients } = body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'List bahan (ingredients) wajib diisi dan harus berupa array.' }, 
        { status: 400 }
      );
    }

    // 3. Insert Session (User ID Wajib Ada)
    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({ 
        status: 'pre_composting', 
        user_id: user.id 
      })
      .select('id')
      .single();

    if (sessionError || !newSession) {
      console.error('Session Insert Error:', sessionError);
      throw new Error(`Gagal membuat sesi: ${sessionError?.message}`);
    }

    const sessionId = newSession.id;

    // 4. Insert Ingredients
    const ingredientsToInsert = ingredients.map((ingr: any) => ({
      session_id: sessionId,
      name: ingr.name,
      quantity: ingr.quantity || 1,
      condition: ingr.condition || 'whole',
      confidence_score: ingr.confidence_score || null
    }));

    const { error: ingredientsError } = await supabase
      .from('ingredients')
      .insert(ingredientsToInsert);

    if (ingredientsError) {
      console.error('Ingredients Insert Error:', ingredientsError);
      throw new Error(`Gagal menyimpan bahan: ${ingredientsError.message}`);
    }

    return NextResponse.json({
      status: 'success',
      session_id: sessionId,
      ingredients: ingredientsToInsert
    }, { status: 201 });

  } catch (error: any) {
    console.error(' Error di /api/sessions POST:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

// GET Handler: Tetap filter by user_id sebagai defense in depth
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Login required.' }, 
        { status: 401 }
      );
    }

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error('❌ Error di /api/sessions GET:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}