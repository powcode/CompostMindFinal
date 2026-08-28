import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    let guestId = cookieStore.get('guest_id')?.value;
    if (!user && !guestId) {
      guestId = `guest_${crypto.randomUUID()}`;
    }

    const body = await request.json();
    const { ingredients } = body;

    // Validasi input
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'List bahan (ingredients) wajib diisi dan harus berupa array.' }, 
        { status: 400 }
      );
    }

    // 1. Buat Session Baru di Supabase
    const sessionPayload = user 
      ? { status: 'pre_composting', user_id: user.id, guest_identifier: null }
      : { status: 'pre_composting', user_id: null, guest_identifier: guestId };

    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert(sessionPayload)
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
      condition: ingr.condition || 'whole',
      confidence_score: ingr.confidence_score || null
    }));

    // 3. Insert semua bahan ke tabel 'ingredients'
    const { error: ingredientsError } = await supabase
      .from('ingredients')
      .insert(ingredientsToInsert);

    if (ingredientsError) {
      throw new Error(`Gagal menyimpan bahan: ${ingredientsError.message}`);
    }

    const response = NextResponse.json({
      status: 'success',
      session_id: sessionId,
      ingredients: ingredientsToInsert
    }, { status: 201 });

    if (!user && guestId) {
      response.cookies.set('guest_id', guestId, { path: '/', httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
    }

    return response;

  } catch (error: any) {
    console.error('❌ Error di /api/sessions POST:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}
