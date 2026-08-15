import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { YoloResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('session_id') as string | null;

    if (!file || !sessionId) {
      return NextResponse.json({ error: 'File gambar dan session_id wajib diisi.' }, { status: 400 });
    }

    // 1. Kirim ke Python YOLO
    const pythonFormData = new FormData();
    pythonFormData.append('file', file, file.name);

    console.log(`🚀 [Add Ingredient] Mengirim gambar ke YOLO untuk session ${sessionId}...`);
    const pythonResponse = await axios.post<YoloResponse>(
      `${process.env.PYTHON_AI_URL}/detect`, 
      pythonFormData, 
      { headers: { 'Content-Type': 'multipart/form-data' }, maxBodyLength: Infinity }
    );

    const yoloData = pythonResponse.data;
    if (yoloData.detections.length === 0) {
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

    // 3. LOGIKA PINTAR: Cek apakah bahan sudah ada di DB untuk session ini
    // Jika sudah ada (misal: apel sudah ada 2, sekarang nambah 1), maka UPDATE quantity-nya (+1).
    // Jika belum ada, INSERT baris baru.
    const newlyAdded = [];

    for (const [name, data] of Array.from(aggregatedMap.entries())) {
      // Cari apakah bahan ini sudah ada di sesi ini
      const { data: existingIngredient } = await supabase
        .from('ingredients')
        .select('id, quantity')
        .eq('session_id', sessionId)
        .eq('name', name)
        .single();

      if (existingIngredient) {
        // UPDATE: Tambahkan quantity baru ke quantity lama
        await supabase
          .from('ingredients')
          .update({ quantity: existingIngredient.quantity + data.quantity })
          .eq('id', existingIngredient.id);
        
        newlyAdded.push({ name, action: 'updated', new_quantity: existingIngredient.quantity + data.quantity });
      } else {
        // INSERT: Bahan baru sama sekali
        await supabase
          .from('ingredients')
          .insert({
            session_id: sessionId,
            name: name,
            quantity: data.quantity,
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