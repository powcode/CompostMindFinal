import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/utils/supabase/server';
import { YoloResponse } from '@/lib/types';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const cookieStore = await cookies();
    const guestId = cookieStore.get('guest_id')?.value;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('session_id') as string | null;

    if (!file || !sessionId) {
      return NextResponse.json({ error: 'File gambar dan session_id wajib diisi.' }, { status: 400 });
    }

    // Authorization check for the session
    let query = supabase.from('sessions').select('id').eq('id', sessionId);
    if (user) {
      query = query.eq('user_id', user.id);
    } else if (guestId) {
      query = query.eq('guest_identifier', guestId);
    } else {
      return NextResponse.json({ error: 'Tidak memiliki akses ke sesi ini.' }, { status: 403 });
    }

    const { data: sessionData, error: sessionError } = await query.single();
    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan atau akses ditolak.' }, { status: 404 });
    }

    // 1. Kirim ke Python YOLO
    const pythonFormData = new FormData();
    pythonFormData.append('file', file, file.name);

    console.log(`🚀 [Add Ingredient] Mengirim gambar ke YOLO untuk session ${sessionId}...`);
    const pythonResponse = await axios.post<YoloResponse>(
      `${process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000'}/detect`, 
      pythonFormData, 
      { headers: { 'Content-Type': 'multipart/form-data' }, maxBodyLength: Infinity }
    );

    const yoloData = pythonResponse.data;
    if (!yoloData.detections || yoloData.detections.length === 0) {
      return NextResponse.json({ message: 'Tidak ada objek terdeteksi.', detections: [] }, { status: 200 });
    }

    // 2. Agregasi hasil deteksi baru
    const aggregatedMap = new Map<string, { quantity: number, max_confidence: number }>();
    for (const item of yoloData.detections) {
      const current = aggregatedMap.get(item.name) || { quantity: 0, max_confidence: 0 };
      current.quantity += 1;
      if (item.confidence > current.max_confidence) current.max_confidence = item.confidence;
      aggregatedMap.set(item.name, current);
    }

    // 3. Upsert / Insert
    const newlyAdded = [];

    for (const [name, data] of Array.from(aggregatedMap.entries())) {
      const { data: existingIngredient } = await supabase
        .from('ingredients')
        .select('id, quantity')
        .eq('session_id', sessionId)
        .eq('name', name)
        .single();

      if (existingIngredient) {
        await supabase
          .from('ingredients')
          .update({ quantity: existingIngredient.quantity + data.quantity })
          .eq('id', existingIngredient.id);
        
        newlyAdded.push({ name, action: 'updated', new_quantity: existingIngredient.quantity + data.quantity });
      } else {
        await supabase
          .from('ingredients')
          .insert({
            session_id: sessionId,
            name: name,
            quantity: data.quantity,
            condition: 'whole',
            confidence_score: data.max_confidence
          });
        
        newlyAdded.push({ name, action: 'inserted', new_quantity: data.quantity });
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Bahan berhasil ditambahkan ke sesi!',
      details: newlyAdded
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error di /api/ingredients POST:', error);
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json({ error: 'Server AI Python offline.' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
