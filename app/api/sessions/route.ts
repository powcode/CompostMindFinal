import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required. Please login to start composting.' }, 
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return NextResponse.json(
        { error: 'List bahan (ingredients) wajib diisi dan harus berupa array.' }, 
        { status: 400 }
      );
    }

    const { ingredients } = body;
    const requestedTitle = typeof body.title === 'string' ? body.title.trim() : '';
    const sessionTitle = requestedTitle || null;

    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({ 
        title: sessionTitle,
        status: 'pre_composting', 
        user_id: user.id 
      })
      .select('id')
      .single();

    if (sessionError || !newSession) {
      console.error('Session Insert Error:', sessionError);
      return NextResponse.json(
        { error: `Gagal membuat sesi: ${sessionError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    const sessionId = newSession.id;

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
      return NextResponse.json(
        { error: `Gagal menyimpan bahan: ${ingredientsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      session_id: sessionId,
      ingredients: ingredientsToInsert
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error di /api/sessions POST:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Login required.' }, 
        { status: 401 }
      );
    }

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, title, status, created_at, user_id, ingredients(name, quantity)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Session Query Error:', error);
      return NextResponse.json(
        { error: `Gagal mengambil riwayat sesi: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: sessions }, { status: 200 });
  } catch (error: any) {
    console.error('Error di /api/sessions GET:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}
