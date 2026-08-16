import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredients } = body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'List bahan (ingredients) wajib diisi dan harus berupa array.' }, 
        { status: 400 }
      );
    }

    // 1. Buat Session Baru
    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({ 
        status: 'pre_composting', 
        guest_identifier: 'guest_demo' 
      })
      .select('id')
      .single();

    if (sessionError || !newSession) {
      throw new Error(`Gagal membuat sesi: ${sessionError?.message}`);
    }

    const sessionId = newSession.id;

    // 2. Siapkan data ingredients untuk di-insert
    const ingredientsToInsert = ingredients.map((ingr: any) => ({
      session_id: sessionId,
      name: ingr.name,
      quantity: ingr.quantity || 1,
      confidence_score: ingr.confidence_score || null
    }));

    // 3. Insert semua bahan ke tabel 'ingredients'
    const { error: ingredientsError } = await supabase
      .from('ingredients')
      .insert(ingredientsToInsert);

    if (ingredientsError) {
      throw new Error(`Gagal menyimpan bahan: ${ingredientsError.message}`);
    }

    return NextResponse.json({
      status: 'success',
      session_id: sessionId,
      ingredients: ingredientsToInsert
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error di /api/sessions POST:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}