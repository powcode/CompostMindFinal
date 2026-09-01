import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/utils/supabase/server';
import { YoloResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Check Authenticated User
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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

    const ingredientsToReturn = Array.from(aggregatedMap.entries()).map(([name, data]) => ({
      name,
      quantity: data.quantity,
      condition: 'whole' as const,
      confidence_score: data.max_confidence
    }));

    return NextResponse.json({
      status: 'success',
      ingredients: ingredientsToReturn
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('❌ Terjadi error di /api/detect:', error);

    const axiosError = error as { code?: string; message?: string };
    if (axiosError.code === 'ECONNREFUSED') {
      return NextResponse.json({ error: 'Server AI Python sedang offline. Pastikan server Python berjalan.' }, { status: 503 });
    }

    return NextResponse.json({ error: axiosError.message || 'Internal Server Error' }, { status: 500 });
  }
}
