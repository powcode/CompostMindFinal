'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Reference {
  title: string;
  url: string;
  source: string;
}

interface StepData { 
  id: string; 
  step_order: number; 
  title: string; 
  instruction: string; 
  expected_output: string;  
  is_completed: boolean;
  reference?: Reference[] | null | string | Record<string, unknown> | unknown[];
}

interface ChatMessage { role: 'user' | 'bot'; message: string; }

const VERIFIED_FALLBACK_REFERENCES: Reference[] = [
  {
    title: 'Composting At Home Guide',
    url: 'https://www.epa.gov/recycle/composting-home',
    source: 'U.S. Environmental Protection Agency'
  },
  {
    title: 'Home Composting & Organic Recycling Guide',
    url: 'https://www.rhs.org.uk/soil-composts-mulches/composting',
    source: 'Royal Horticultural Society'
  },
  {
    title: 'Panduan Pengelolaan Sampah Organik Nasional',
    url: 'https://sampahnasional.kemenlh.go.id',
    source: 'Kementerian Lingkungan Hidup RI'
  },
  {
    title: 'Pusat Edukasi & Pengurangan Sampah Organik 3R',
    url: 'https://info3r.kemenlh.go.id',
    source: 'Direktorat Pengurangan Sampah KLH'
  },
  {
    title: 'Cornell Composting Science & Management',
    url: 'http://compost.css.cornell.edu/',
    source: 'Cornell University'
  },
  {
    title: 'Panduan Pemanfaatan Pupuk Organik & Kompos',
    url: 'https://www.pertanian.go.id/',
    source: 'Kementerian Pertanian Republik Indonesia'
  }
];

function sanitizeStepReference(item: Record<string, unknown>, fallbackIndex = 0): Reference {
  const rawUrl = String(item.url ?? '').trim();
  const rawTitle = String(item.title ?? 'Panduan Kompos Terverifikasi').trim();
  const rawSource = String(item.source ?? 'Lembaga Pengomposan Terpercaya').trim();

  // Bersihkan domain/subpath yang berpotensi 404
  if (
    !rawUrl ||
    rawUrl === '#' ||
    !rawUrl.startsWith('http') ||
    rawUrl.includes('menlhk.go.id') ||
    rawUrl.includes('/single_post/') ||
    rawUrl.includes('learningstore.extension')
  ) {
    const fallback = VERIFIED_FALLBACK_REFERENCES[fallbackIndex % VERIFIED_FALLBACK_REFERENCES.length];
    return {
      title: rawTitle && !rawTitle.includes('KLHK') ? rawTitle : fallback.title,
      url: fallback.url,
      source: fallback.source
    };
  }

  return {
    title: rawTitle,
    url: rawUrl,
    source: rawSource
  };
}

function normalizeReferences(value: unknown): Reference[] {
  let parsed: Reference[] = [];

  if (Array.isArray(value)) {
    parsed = value
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item, idx) => sanitizeStepReference(item, idx));
  } else if (typeof value === 'string') {
    try {
      parsed = normalizeReferences(JSON.parse(value));
    } catch {
      parsed = [];
    }
  } else if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    if (Array.isArray(candidate.reference)) parsed = normalizeReferences(candidate.reference);
    else if (Array.isArray(candidate.references)) parsed = normalizeReferences(candidate.references);
  }

  const seen = new Set<string>();
  const unique: Reference[] = [];
  for (const item of parsed) {
    if (!seen.has(item.url)) {
      seen.add(item.url);
      unique.push(item);
    }
  }

  // Jika referensi kurang dari 2, berikan referensi umum terverifikasi agar tidak kosong
  if (unique.length < 2) {
    for (const ref of VERIFIED_FALLBACK_REFERENCES) {
      if (!seen.has(ref.url)) {
        seen.add(ref.url);
        unique.push(ref);
      }
      if (unique.length >= 2) break;
    }
  }

  return unique;
}

function renderChatMessage(text: string, role: 'user' | 'bot') {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlPattern);

  return parts.map((part, idx) => {
    if (/^https?:\/\/[^\s]+$/i.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline break-all font-medium transition-colors inline-block max-w-full ${
            role === 'user'
              ? 'text-white hover:text-green-100'
              : 'text-emerald-600 hover:text-emerald-700'
          }`}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

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
  const [showReferences, setShowReferences] = useState(false);

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
    } catch {
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

  // Safety: kolom reference dari DB bisa null/undefined atau datang dalam format JSON/string
  const stepRefs: Reference[] = normalizeReferences(step.reference);

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
              
              {/* Referensi inline badges + tombol */}
              {stepRefs.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {stepRefs.map((ref, idx) => (
                      <a
                        key={idx}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={ref.title}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-black hover:bg-green-700 transition-colors shadow-sm"
                      >
                        {idx + 1}
                      </a>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReferences(prev => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 transition-colors"
                  >
                    📚 Referensi
                    <span className={`transition-transform duration-200 ${showReferences ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                </div>
              )}
            </div>

            {/* Panel Referensi (collapse) */}
            {showReferences && stepRefs.length > 0 && (
              <div className="mb-4 border border-green-200 rounded-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="bg-green-50 px-4 py-2.5 border-b border-green-200 flex items-center gap-2">
                  <span className="text-sm">📚</span>
                  <h4 className="text-xs font-bold text-green-800 uppercase tracking-wide">Sumber Referensi</h4>
                </div>
                <div className="divide-y divide-green-100">
                  {stepRefs.map((ref, idx) => (
                    <a
                      key={idx}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 px-4 py-3 bg-white hover:bg-green-50 transition-colors group"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-black flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 group-hover:text-green-700 transition-colors leading-snug">{ref.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{ref.source}</p>
                        <p className="text-[10px] text-green-500 truncate mt-0.5">{ref.url}</p>
                      </div>
                      <span className="flex-shrink-0 text-gray-300 group-hover:text-green-500 transition-colors text-xs ml-auto">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ KOTAK: Expected Output (dengan fallback anti-kosong) */}
            {step.expected_output && step.expected_output.trim() !== '' ? (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">✅</span>
                  <h3 className="font-bold text-amber-800 text-sm uppercase tracking-wide">Hasil yang Diharapkan</h3>
                </div>
                <p className="text-gray-700 text-base leading-relaxed italic">
                  “{step.expected_output}”
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
          <div className="md:col-span-2 flex flex-col h-[500px] border border-gray-200 rounded-xl bg-gray-50 shadow-inner overflow-hidden min-w-0">
            <div className="bg-white p-3 border-b font-bold text-gray-700 rounded-t-xl text-sm flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>🤖</span> Bantuan Langkah Ini
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 custom-scrollbar min-w-0">
              {chatMessages.length === 0 && (
                <p className="text-center text-gray-400 text-xs mt-10">Bingung dengan langkah “{step.title}”? Tanyakan di sini!</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} min-w-0`}>
                  <div className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-w-0 ${
                    msg.role === 'user' 
                      ? 'bg-green-600 text-white rounded-br-none shadow-xs' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-xs'
                  }`}>
                    {renderChatMessage(msg.message, msg.role)}
                  </div>
                </div>
              ))}
              {isChatting && <div className="text-gray-400 text-xs italic pl-2">Bot berpikir...</div>}
            </div>

            <form onSubmit={handleSendChat} className="p-2 bg-white border-t rounded-b-xl flex gap-1">
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tanya soal langkah ini..." 
                className="flex-1 min-w-0 border border-gray-300 rounded-l-lg px-2.5 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || isChatting}
                className="bg-green-600 text-white px-3 py-2 rounded-r-lg font-medium text-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Kirim
              </button>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}