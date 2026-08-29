import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/utils/supabase/server';
import { YoloResponse, DbIngredient } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Check Authenticated User
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {x
      return NextResponse.json(
        { error: 'Authentication required. Please login to start composting.' },
        { status: 401 }
      );
    }

    // 2. Terima FormData (berisi gambar) dari request
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file gambar yang dikirim.' }, { status: 400 });
    }

    // 3. Forward gambar ke Server Python FastAPI (YOLOv11)
    const pythonFormData = new FormData();
    pythonFormData.append('file', file, file.name);

    const rawUrl = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';
    const baseUrl = rawUrl.replace(/\/+$/, '');
    const targetUrl = `${baseUrl}/detect`;

    console.log(`🚀 Mengirim gambar ke Python YOLO server at: ${targetUrl}`);
    
    const pythonResponse = await axios.post<YoloResponse>(
      targetUrl, 
      pythonFormData, 
      {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'ngrok-skip-browser-warning': 'true'
        },
        maxBodyLength: Infinity,
        timeout: 60000
      }
    );

    const yoloData = pythonResponse.data;
    console.log('✅ Hasil dari YOLO:', yoloData.detections);

    if (!yoloData.detections || yoloData.detections.length === 0) {
      return NextResponse.json({ message: 'Tidak ada objek compostable yang terdeteksi.', detections: [] }, { status: 200 });
    }

    // 4. PROSES DATA: Kelompokkan deteksi & hitung jumlahnya
    const aggregatedMap = new Map<string, { quantity: number, max_confidence: number }>();

    for (const item of yoloData.detections) {
      const current = aggregatedMap.get(item.name) || { quantity: 0, max_confidence: 0 };
      current.quantity += 1;
      if (item.confidence > current.max_confidence) {
        current.max_confidence = item.confidence;
      }
      aggregatedMap.set(item.name, current);
    }

    // 5. Simpan ke Supabase (Fase Pre-Composting)
    const sessionPayload = { status: 'pre_composting', user_id: user.id };

    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert(sessionPayload)
      .select('id')
      .single();

    if (sessionError || !newSession) {
      throw new Error(`Gagal membuat sesi di Supabase: ${sessionError?.message}`);
    }

    const sessionId = newSession.id;

    // Siapkan data ingredients untuk di-insert
    const ingredientsToInsert: DbIngredient[] = Array.from(aggregatedMap.entries()).map(([name, data]) => ({
      session_id: sessionId,
      name: name,
      quantity: data.quantity,
      condition: 'whole',
      confidence_score: data.max_confidence
    }));

    const { data: insertedIngredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .insert(ingredientsToInsert)
      .select('id, name, quantity, condition');

    if (ingredientsError || !insertedIngredients) {
      throw new Error(`Gagal menyimpan bahan ke Supabase: ${ingredientsError?.message}`);
    }

    console.log(`💾 Berhasil simpan session ${sessionId} dengan ${insertedIngredients.length} jenis bahan.`);

    return NextResponse.json({
      status: 'success',
      session_id: sessionId,
      ingredients: insertedIngredients.map(i => ({ 
        id: i.id, 
        name: i.name, 
        quantity: i.quantity,
        condition: i.condition || 'whole'
      }))
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Terjadi error di /api/detect:', error);
    
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json({ error: 'Server AI Python sedang offline. Pastikan server Python berjalan.' }, { status: 503 });
    }

    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
