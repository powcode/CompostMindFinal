import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { YoloResponse, DbIngredient } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Terima FormData (berisi gambar) dari request
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file gambar yang dikirim.' }, { status: 400 });
    }

    // 2. Forward (Teruskan) gambar ke Server Python FastAPI (YOLOv11)
    // Kita buat FormData baru untuk dikirim via axios
    const pythonFormData = new FormData();
    pythonFormData.append('file', file, file.name);

    console.log('🚀 Mengirim gambar ke Python YOLO server...');
    
    // Panggil endpoint Python kita di port 8000
    const pythonResponse = await axios.post<YoloResponse>(
      `${process.env.PYTHON_AI_URL}/detect`, 
      pythonFormData, 
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        maxBodyLength: Infinity, // Penting untuk upload file besar
      }
    );

    const yoloData = pythonResponse.data;
    console.log('✅ Hasil dari YOLO:', yoloData.detections);

    if (yoloData.detections.length === 0) {
      return NextResponse.json({ message: 'Tidak ada objek compostable yang terdeteksi.', detections: [] }, { status: 200 });
    }

    // 3. PROSES DATA: Kelompokkan deteksi & hitung jumlahnya (Aggregation)
    // YOLO mendeteksi: [{name: 'apple'}, {name: 'apple'}, {name: 'banana'}]
    // Kita ubah jadi: [{name: 'apple', quantity: 2}, {name: 'banana', quantity: 1}]
    const aggregatedMap = new Map<string, { quantity: number, max_confidence: number }>();

    for (const item of yoloData.detections) {
      const current = aggregatedMap.get(item.name) || { quantity: 0, max_confidence: 0 };
      current.quantity += 1;
      // Simpan confidence tertinggi saja untuk referensi
      if (item.confidence > current.max_confidence) {
        current.max_confidence = item.confidence;
      }
      aggregatedMap.set(item.name, current);
    }

    // 4. Simpan ke Supabase (Fase Pre-Composting)
    // A. Buat Session Baru dulu di tabel 'sessions'
    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({ status: 'pre_composting', guest_identifier: 'guest_demo' })
      .select('id')
      .single();

    if (sessionError || !newSession) {
      throw new Error(`Gagal membuat sesi di Supabase: ${sessionError?.message}`);
    }

    const sessionId = newSession.id;

    // B. Siapkan data ingredients untuk di-insert
    const ingredientsToInsert: DbIngredient[] = Array.from(aggregatedMap.entries()).map(([name, data]) => ({
      session_id: sessionId,
      name: name,
      quantity: data.quantity,
      confidence_score: data.max_confidence
    }));

    // C. Insert semua bahan ke tabel 'ingredients'
    const { error: ingredientsError } = await supabase
      .from('ingredients')
      .insert(ingredientsToInsert);

    if (ingredientsError) {
      throw new Error(`Gagal menyimpan bahan ke Supabase: ${ingredientsError.message}`);
    }

    console.log(`💾 Berhasil simpan session ${sessionId} dengan ${ingredientsToInsert.length} jenis bahan.`);

    // 5. Kembalikan respon sukses ke caller (Nanti ke Frontend)
    // Kita kirim sessionId agar frontend tahu harus redirect ke mana
    return NextResponse.json({
      status: 'success',
      session_id: sessionId,
      ingredients: ingredientsToInsert.map(i => ({id: i.id, name: i.name, quantity: i.quantity }))
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Terjadi error di /api/detect:', error);
    
    // Jika error karena Python server mati
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json({ error: 'Server AI Python sedang offline. Pastikan uvicorn berjalan di port 8000.' }, { status: 503 });
    }

    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}   