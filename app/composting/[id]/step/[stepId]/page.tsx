'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface StepData { 
  id: string; 
  step_order: number; 
  title: string; 
  instruction: string; 
  expected_output: string;  
  is_completed: boolean; 
}

interface ChatMessage { role: 'user' | 'bot'; message: string; }

export default function StepDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // Next.js 16: useParams() tetap sinkron di Client Component
  const sessionId = params.id as string;
  const stepId = params.stepId as string;

  const [step, setStep] = useState<StepData | null>(null);
  const [allSteps, setAllSteps] = useState<StepData[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
    async function fetchStepData() {
      if (!stepId || !sessionId) return;

      // Ambil detail step saat ini
      const { data: currentStep } = await supabase
        .from('steps')
        .select('*')
        .eq('id', stepId)
        .single();
      
      if (currentStep) setStep(currentStep);

      // Ambil semua steps untuk progress bar
      const { data: steps } = await supabase
        .from('steps')
        .select('*')
        .eq('session_id', sessionId)
        .order('step_order');
      
      if (steps) setAllSteps(steps);

      // Ambil chat history khusus untuk step ini
      const { data: chats } = await supabase
        .from('chat_history')
        .select('role, message')
        .eq('step_id', stepId)
        .order('created_at');
      
      if (chats) setChatMessages(chats);
    }
    
    fetchStepData();
  }, [stepId, sessionId]);

  // Handle Chat spesifik step
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', message: userMsg }]);
    setChatInput('');
    setIsChatting(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, step_id: stepId, message: userMsg })
      });
      const data = await res.json();
      
      if (res.ok) {
        setChatMessages(prev => [...prev, { role: 'bot', message: data.reply }]);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'bot', message: 'Error koneksi bot.' }]);
    } finally { 
      setIsChatting(false); 
    }
  };

  // Handle Selesai Step
  const handleCompleteStep = async () => {
    if (!step) return;

    // Update DB
    const { error } = await supabase
      .from('steps')
      .update({ is_completed: true })
      .eq('id', stepId);

    if (error) {
      alert('Gagal menyelesaikan langkah ini. Silakan coba lagi.');
      return;
    }

    setStep(prev => prev ? { ...prev, is_completed: true } : prev);
    setAllSteps(prev => prev.map(item => item.id === stepId ? { ...item, is_completed: true } : item));
    
    // Cek apakah ini step terakhir
    const currentOrder = step.step_order;
    const totalSteps = allSteps.length;

    if (currentOrder >= totalSteps) {
      // Jika terakhir, update status session jadi completed
      await supabase.from('sessions').update({ status: 'completed' }).eq('id', sessionId);
      alert('🎉 Selamat! Sesi pengomposan selesai. Terima kasih telah menjaga bumi!');
      router.push('/composting'); // Redirect ke dashboard riwayat, bukan home
    } else {
      // Pindah ke step berikutnya
      const nextStep = allSteps.find(s => s.step_order === currentOrder + 1);
      if (nextStep) router.push(`/composting/${sessionId}/step/${nextStep.id}`);
    }
  };

  const currentStepIndex = allSteps.findIndex(item => item.id === stepId);
  const previousStep = currentStepIndex > 0 ? allSteps[currentStepIndex - 1] : null;
  const nextStep = currentStepIndex >= 0 && currentStepIndex < allSteps.length - 1
    ? allSteps[currentStepIndex + 1]
    : null;

  if (!step) return <div className="min-h-screen flex items-center justify-center text-gray-500">Memuat langkah...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
        
        {/* Progress Bar Header */}
        <div className="bg-gray-800 p-4 text-white">
          <div className="flex justify-between text-sm mb-2 font-medium">
            <span>Langkah {step.step_order} dari {allSteps.length}</span>
            <span>{Math.round((step.step_order / allSteps.length) * 100)}% Selesai</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2.5">
            <div 
              className="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${(step.step_order / allSteps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="p-6 md:p-8 grid md:grid-cols-5 gap-8">
          
          {/* KOLOM INSTRUKSI (3/5 lebar) */}
          <div className="md:col-span-3">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{step.title}</h1>
            
            {/* Kotak Instruksi */}
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📋</span>
                <h3 className="font-bold text-green-800 text-sm uppercase tracking-wide">Apa yang harus dilakukan</h3>
              </div>
              <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">{step.instruction}</p>
            </div>

            {/* ✅ KOTAK: Expected Output (dengan fallback anti-kosong) */}
            {step.expected_output && step.expected_output.trim() !== '' ? (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">✅</span>
                  <h3 className="font-bold text-amber-800 text-sm uppercase tracking-wide">Hasil yang Diharapkan</h3>
                </div>
                <p className="text-gray-700 text-base leading-relaxed italic">
                  "{step.expected_output}"
                </p>
                <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                  <span>💡</span>
                  <span>Bandingkan hasil Anda dengan deskripsi di atas. Jika sesuai, lanjut ke langkah berikutnya!</span>
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-xl mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🤔</span>
                  <h3 className="font-bold text-blue-800 text-sm uppercase tracking-wide">Tips Verifikasi</h3>
                </div>
                <p className="text-gray-700 text-base leading-relaxed">
                  Pastikan hasil langkah ini terlihat wajar dan sesuai instruksi. Jika ragu, tanyakan ke CompostBot di panel kanan!
                </p>
              </div>
            )}

            <button 
              onClick={handleCompleteStep}
              disabled={step.is_completed}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-md transition flex items-center justify-center"
            >
              {step.is_completed
                ? '✅ Langkah Sudah Selesai'
                : step.step_order === allSteps.length
                  ? '🏁 Selesaikan Sesi Kompos'
                  : '✅ Selesai, Lanjut Langkah Berikutnya'}
            </button>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!previousStep}
                onClick={() => previousStep && router.push(`/composting/${sessionId}/step/${previousStep.id}`)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Langkah Sebelumnya
              </button>
              <button
                type="button"
                disabled={!nextStep || !step.is_completed}
                onClick={() => nextStep && router.push(`/composting/${sessionId}/step/${nextStep.id}`)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Langkah Berikutnya →
              </button>
            </div>
          </div>

          {/* KOLOM CHAT BOT SPESIFIK STEP (2/5 lebar) */}
          <div className="md:col-span-2 flex flex-col h-[500px] border border-gray-200 rounded-xl bg-gray-50 shadow-inner">
            <div className="bg-white p-3 border-b font-bold text-gray-700 rounded-t-xl text-sm">🤖 Bantuan Langkah Ini</div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {chatMessages.length === 0 && (
                <p className="text-center text-gray-400 text-xs mt-10">Bingung dengan langkah "{step.title}"? Tanyakan di sini!</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-2.5 rounded-2xl text-xs ${
                    msg.role === 'user' 
                      ? 'bg-green-600 text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              ))}
              {isChatting && <div className="text-gray-400 text-xs italic pl-2">Bot berpikir...</div>}
            </div>

            <form onSubmit={handleSendChat} className="p-2 bg-white border-t rounded-b-xl flex">
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tanya soal langkah ini..." 
                className="flex-1 border border-gray-300 rounded-l-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button type="submit" className="bg-green-600 text-white px-3 rounded-r-lg font-medium text-xs hover:bg-green-700">Kirim</button>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}