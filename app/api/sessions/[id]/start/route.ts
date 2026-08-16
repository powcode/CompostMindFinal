import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateCompostSteps } from '@/lib/gemini';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ← Tambahkan Promise<>
) {
  const { id: sessionId } = await params; // ← Await dan rename biar jelas

  try {
    // ... sisa kode tetap sama ...
    // --- DEBUG LOG ANDA (Biarkan sebentar sampai benar-benar sukses) ---
    console.log("🔍 MENCARI SESSION ID:", sessionId);
    
    // 1. Ambil semua bahan untuk sesi ini dari Supabase
    const { data: ingredients, error: fetchError } = await supabase
      .from('ingredients')
      .select('name, quantity')
      .eq('session_id', sessionId);

    console.log("📦 HASIL QUERY SUPABASE:", ingredients);
    // --------------------------------------------------------------------

    if (fetchError || !ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: 'Tidak ada bahan ditemukan untuk sesi ini.' }, { status: 404 });
    }

    // 2. Update status session menjadi 'generating_steps'
    await supabase.from('sessions').update({ status: 'generating_steps' }).eq('id', sessionId);

    console.log(`🧠 Meminta Gemini membuat tutorial untuk session ${sessionId}...`);
    
    // 3. PANGGIL GEMINI! 🔥
    const generatedSteps = await generateCompostSteps(ingredients);

    // 4. Format hasil Gemini
    // ... kode sebelumnya ...

    // 4. Format hasil Gemini agar siap masuk ke database
    const stepsToInsert = generatedSteps.map((step: any, index: number) => ({
      session_id: sessionId,
      step_order: index + 1,
      title: step.title,
      instruction: step.instruction,
      expected_output: step.expected_output,  // ✅ TAMBAHKAN BARIS INI
      is_completed: false
    }));

// ... kode selanjutnya tetap sama ...

    // 5. Simpan ke tabel 'steps'
    const { error: insertError } = await supabase
      .from('steps')
      .insert(stepsToInsert);

    if (insertError) {
      throw new Error(`Gagal menyimpan steps ke DB: ${insertError.message}`);
    }

    // 6. Update status session menjadi 'active'
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