import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { chatWithCompostBot } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, step_id, message } = body;

    if (!session_id || !message) {
      return NextResponse.json({ error: 'session_id dan message wajib diisi.' }, { status: 400 });
    }

    // Verify Session Ownership
    const { data: sessionCheck, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !sessionCheck) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan atau akses ditolak.' }, { status: 404 });
    }

    // 1. Ambil konteks bahan FRESH dari database
    const { data: ingredients, error: ingError } = await supabase
      .from('ingredients')
      .select('name, quantity, condition')
      .eq('session_id', session_id);

    if (ingError) throw new Error(`Gagal ambil bahan: ${ingError.message}`);

    // 2. Ambil konteks step
    let currentStepContext = null;
    if (step_id) {
      const { data: stepData } = await supabase
        .from('steps')
        .select('title, instruction, expected_output')
        .eq('id', step_id)
        .single();
      currentStepContext = stepData;
    }

    // 3. Simpan pesan USER
    await supabase.from('chat_history').insert({
      session_id,
      step_id: step_id || null,
      role: 'user',
      message
    });

    console.log(`💬 CompostBot memproses: "${message}"...`);

    // 4. Panggil Gemini Chat
    const botReply = await chatWithCompostBot(message, ingredients || [], currentStepContext);

    // 5. Simpan balasan BOT
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
