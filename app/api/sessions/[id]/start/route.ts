import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateCompostSteps } from '@/lib/gemini';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    console.log("🔍 MENCARI SESSION ID:", sessionId);
    
    // ✅ LANGKAH 1: Cek apakah frontend mengirim payload ingredients terbaru
    let ingredientsPayload;
    try {
      const body = await request.json();
      if (body?.ingredients && Array.isArray(body.ingredients)) {
        ingredientsPayload = body.ingredients;
        console.log("📦 Menggunakan payload ingredients dari frontend:", ingredientsPayload);
      }
    } catch (e) {
      // Tidak masalah jika body bukan JSON atau kosong
    }

    // ✅ LANGKAH 2: Jika tidak ada payload, fallback ambil dari DB (TAPI HARUS INCLUDE 'condition')
    if (!ingredientsPayload || ingredientsPayload.length === 0) {
      const { data: dbIngredients, error: fetchError } = await supabase
        .from('ingredients')
        .select('name, quantity, condition') // ← WAJIB TAMBAHKAN 'condition' DI SINI
        .eq('session_id', sessionId);

      if (fetchError || !dbIngredients || dbIngredients.length === 0) {
        return NextResponse.json({ error: 'Tidak ada bahan ditemukan untuk sesi ini.' }, { status: 404 });
      }
      
      ingredientsPayload = dbIngredients.map(i => ({
        ...i,
        condition: i.condition || 'whole' // Fallback aman jika data lama belum punya condition
      }));
      console.log(" Menggunakan ingredients dari database:", ingredientsPayload);
    }

    // ✅ LANGKAH 3: Update status session
    await supabase.from('sessions').update({ status: 'generating_steps' }).eq('id', sessionId);

    console.log(`🧠 Meminta Gemini membuat tutorial untuk session ${sessionId}...`);
    
    // ✅ LANGKAH 4: Kirim data LENGKAP (termasuk condition) ke Gemini
    const generatedSteps = await generateCompostSteps(ingredientsPayload);

    // 5. Format hasil Gemini agar siap masuk ke database
    const stepsToInsert = generatedSteps.map((step: any, index: number) => ({
      session_id: sessionId,
      step_order: index + 1,
      title: step.title,
      instruction: step.instruction,
      expected_output: step.expected_output,
      is_completed: false
    }));

    // 6. Simpan ke tabel 'steps'
    const { error: insertError } = await supabase
      .from('steps')
      .insert(stepsToInsert);

    if (insertError) {
      throw new Error(`Gagal menyimpan steps ke DB: ${insertError.message}`);
    }

    // 7. Update status session menjadi 'active'
    await supabase.from('sessions').update({ status: 'active' }).eq('id', sessionId);

    console.log(`✅ Berhasil generate ${stepsToInsert.length} langkah untuk session ${sessionId}`);

    return NextResponse.json({
      status: 'success',
      message: 'Tutorial berhasil dibuat!',
      total_steps: stepsToInsert.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error di /start:', error);
    await supabase.from('sessions').update({ status: 'pre_composting' }).eq('id', sessionId);
    return NextResponse.json({ error: error.message || 'Gagal memulai sesi kompos.' }, { status: 500 });
  }
}