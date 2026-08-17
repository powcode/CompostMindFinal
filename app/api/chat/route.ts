import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { chatWithCompostBot } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, step_id, message } = body;

    if (!session_id || !message) {
      return NextResponse.json({ error: 'session_id dan message wajib diisi.' }, { status: 400 });
    }

    // 1. Ambil konteks bahan FRESH dari database (TERMASUK KOLOM CONDITION!)
    const { data: ingredients, error: ingError } = await supabase
      .from('ingredients')
      .select('name, quantity, condition') // ✅ Tambahkan 'condition' di sini
      .eq('session_id', session_id);

    if (ingError) throw new Error(`Gagal ambil bahan: ${ingError.message}`);

    // 2. Ambil konteks step (jika user chat dari halaman step spesifik)
    let currentStepContext = null;
    if (step_id) {
      const { data: stepData } = await supabase
        .from('steps')
        .select('title, instruction')
        .eq('id', step_id)
        .single();
      currentStepContext = stepData;
    }

    // 3. Simpan pesan USER ke riwayat chat dulu
    await supabase.from('chat_history').insert({
      session_id,
      step_id: step_id || null,
      role: 'user',
      message
    });

    console.log(`💬 CompostBot memproses: "${message}"...`);
    console.log(`📦 Data bahan real-time dari DB:`, ingredients); // Debug log

    // 4. PANGGIL GEMINI CHAT DENGAN DATA LENGKAP! 🔥
    const botReply = await chatWithCompostBot(message, ingredients || [], currentStepContext);

    // 5. Simpan balasan BOT ke riwayat chat
    await supabase.from('chat_history').insert({
      session_id,
      step_id: step_id || null,
      role: 'bot',
      message: botReply
    });

    return NextResponse.json({
      status: 'success',
      reply: botReply
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error di /chat:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghubungi CompostBot.' }, { status: 500 });
  }
}