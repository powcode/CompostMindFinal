'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// --- TYPES ---
interface Ingredient { id: string; name: string; quantity: number; condition: 'whole' | 'peel' | 'rotten'; }
interface ChatMessage { role: 'user' | 'bot'; message: string; }

export default function CompostSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  // --- STATES UTAMA ---
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>('loading');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isChatting, setIsChatting] = useState(false);

  // --- STATES UNTUK MINI SCANNER MODAL ---
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scanImagePreview, setScanImagePreview] = useState<string | null>(null);
  const [isDetectingAdd, setIsDetectingAdd] = useState(false);
  
  // Refs Kamera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ==========================================
  // 1. DATA FETCHING (Load Sesi, Bahan, Chat)
  // ==========================================
  const fetchSessionData = async () => {
    // Fetch status
    const { data: session } = await supabase.from('sessions').select('status').eq('id', sessionId).single();
    if (session) {
      setSessionStatus(session.status);
      if (session.status === 'active' || session.status === 'completed') {
        const { data: firstStep } = await supabase.from('steps').select('id').eq('session_id', sessionId).eq('step_order', 1).single();
        if (firstStep) router.push(`/composting/${sessionId}/step/${firstStep.id}`);
      }
    }
    // Fetch ingredients
    const { data: ingr } = await supabase.from('ingredients').select('id, name, quantity, condition').eq('session_id', sessionId);
    if (ingr) {
      setIngredients(ingr.map(item => ({
        ...item,
        condition: (item.condition || 'whole') as 'whole' | 'peel' | 'rotten'
      })));
    }

    // Fetch chat awal
    const { data: chats } = await supabase.from('chat_history').select('role, message').eq('session_id', sessionId).is('step_id', null).order('created_at');
    if (chats) setChatMessages(chats);
  };

  useEffect(() => {
    if (sessionId) fetchSessionData();
    return () => stopCamera(); // Cleanup kamera saat unmount
  }, [sessionId, router]);

  // ==========================================
  // 2. LOGIKA EDIT & DELETE BAHAN (CRUD UI)
  // ==========================================
  const handleUpdateQuantity = async (id: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;

    // 1. Update UI langsung (tanpa tunggu server)
    setIngredients(prev => prev.map(ingr => ingr.id === id ? { ...ingr, quantity: newQty } : ingr));

    try {
      // 2. Kirim ke server di background
      await fetch(`/api/ingredients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty })
      });
    } catch (err) {
      // 3. Revert jika gagal
      alert("Gagal update jumlah.");
      fetchSessionData(); // Reload data asli dari DB
    }
  };

  const handleUpdateCondition = async (id: string, newCondition: 'whole' | 'peel' | 'rotten') => {
    // Optimistic UI update
    setIngredients(prev => prev.map(ingr => ingr.id === id ? { ...ingr, condition: newCondition } : ingr));

    try {
      const res = await fetch(`/api/ingredients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: newCondition })
      });

      if (!res.ok) {
        throw new Error("Gagal mengupdate kondisi bahan");
      }
    } catch (err) {
      alert("Gagal memperbarui kondisi bahan.");
      fetchSessionData(); // Revert ke DB
    }
  };

  const handleDeleteIngredient = async (id: string, name: string) => {
    if (!confirm(`Hapus ${name.replace('_', ' ')} dari daftar kompos?`)) return;

    setIngredients(prev => prev.filter(ingr => ingr.id !== id));

    try {
      await fetch(`/api/ingredients/${id}`, { method: 'DELETE' });
    } catch (err) {
      alert("Gagal menghapus bahan.");
      fetchSessionData();
    }
  };

  // ==========================================
  // 3. LOGIKA MINI LIVE SCANNER (Tambah Bahan)
  // ==========================================
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      alert("Gagal akses kamera.");
      setShowScannerModal(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    if (showScannerModal && !scanImagePreview) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [showScannerModal, scanImagePreview]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setScanImagePreview(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  const handleFileUploadAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setScanImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleProcessAdd = async () => {
    if (!scanImagePreview) return;
    setIsDetectingAdd(true);

    try {
      const resBlob = await fetch(scanImagePreview);
      const blob = await resBlob.blob();
      const file = new File([blob], "add_capture.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', sessionId);

      const res = await fetch('/api/ingredients', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        if (data.details && data.details.length > 0) {
          alert(`Berhasil! ${data.details.map((d: any) => d.name.replace('_', ' ')).join(', ')} ditambahkan ke sesi.`);
          fetchSessionData();
          closeScannerModal();
        } else {
          alert('Tidak ada objek compostable terdeteksi dari foto ini.');
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Gagal koneksi ke server AI.');
    } finally {
      setIsDetectingAdd(false);
    }
  };

  const closeScannerModal = () => {
    setShowScannerModal(false);
    setScanImagePreview(null);
    stopCamera();
  };

  // ==========================================
  // 4. LOGIKA CHATBOT & START
  // ==========================================
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
        body: JSON.stringify({ 
          session_id: sessionId, 
          message: userMsg,
          ingredients: ingredients.map(ingr => ({
            name: ingr.name,
            quantity: ingr.quantity,
            condition: ingr.condition
          }))
        })
      });
      const data = await res.json();
      if (res.ok) setChatMessages(prev => [...prev, { role: 'bot', message: data.reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'bot', message: 'Error koneksi bot.' }]);
    } finally { setIsChatting(false); }
  };

  const handleStart = async () => {
    if (ingredients.length === 0) return alert("List bahan kosong! Scan atau tambah bahan terlebih dahulu.");
    setIsStarting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/start`, { method: 'POST' });
      if (res.ok) {
        const { data: firstStep } = await supabase.from('steps').select('id').eq('session_id', sessionId).eq('step_order', 1).single();
        if (firstStep) router.push(`/composting/${sessionId}/step/${firstStep.id}`);
      } else {
        const data = await res.json(); alert(`Gagal start: ${data.error}`);
      }
    } catch (err) { alert('Error server.'); } finally { setIsStarting(false); }
  };

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-100 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-slate-700 text-sm">Memuat data sesi kompos...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-slate-50 to-white text-slate-800 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-slate-200/70 overflow-hidden border border-emerald-100">
        
        {/* HEADER SESI */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-900/60 text-emerald-200 border border-emerald-500/30 mb-2">
              🥣 Persiapan Bahan Kompos
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Sesi Pengomposan Baru</h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 font-mono">
              ID Sesi: {sessionId}
            </p>
          </div>
          <div className="self-start sm:self-auto bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
            <p className="text-xs text-emerald-100 font-medium">Status Sesi</p>
            <p className="text-sm font-black text-amber-300 uppercase tracking-wide">
              {sessionStatus.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* MAIN TWO-COLUMN CONTENT AREA */}
        <div className="p-4 sm:p-6 lg:p-8 grid lg:grid-cols-12 gap-8">
          
          {/* ========================================== */}
          {/* KOLOM KIRI: DAFTAR BAHAN & PROMINENT CTA   */}
          {/* ========================================== */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>🥦</span> Daftar Bahan Kompos ({ingredients.length})
                </h2>
                <button 
                  onClick={() => setShowScannerModal(true)}
                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1.5"
                >
                  <span>📷</span> Tambah Bahan
                </button>
              </div>

              {/* LIST BAHAN (CARDS) */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {ingredients.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-2">
                    <span className="text-3xl block">🧺</span>
                    <p className="text-slate-600 font-bold text-sm">Belum ada bahan dalam sesi ini</p>
                    <p className="text-slate-400 text-xs">Klik tombol "Tambah Bahan" di atas untuk memfoto sampah organikmu.</p>
                  </div>
                ) : (
                  ingredients.map((ingr) => (
                    <div 
                      key={ingr.id} 
                      className="group flex flex-col gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
                          <div>
                            <p className="font-bold text-sm text-slate-800 capitalize leading-tight">
                              {ingr.name.replace('_', ' ')}
                            </p>
                            <span className="text-[11px] text-slate-400 font-medium">Bahan Terdeteksi</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* QUANTITY CONTROLS */}
                          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button 
                              onClick={() => handleUpdateQuantity(ingr.id, ingr.quantity, -1)} 
                              className="w-7 h-7 bg-white text-slate-700 rounded-lg font-bold text-xs shadow-2xs hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="w-7 text-center text-xs font-black text-slate-800">{ingr.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(ingr.id, ingr.quantity, 1)} 
                              className="w-7 h-7 bg-white text-slate-700 rounded-lg font-bold text-xs shadow-2xs hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>

                          {/* DELETE BUTTON */}
                          <button 
                            onClick={() => handleDeleteIngredient(ingr.id, ingr.name)} 
                            className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center text-sm" 
                            title="Hapus Bahan"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* CONDITION SELECTOR */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-500 font-medium">Kondisi Bahan:</span>
                        <select
                          value={ingr.condition}
                          onChange={(e) => handleUpdateCondition(ingr.id, e.target.value as 'whole' | 'peel' | 'rotten')}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-emerald-500"
                        >
                          <option value="whole">🍎 Utuh (Whole)</option>
                          <option value="peel">🍌 Kulit / Sisa (Peel)</option>
                          <option value="rotten">🦠 Busuk (Rotten)</option>
                        </select>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PROMINENT START CTA BUTTON */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <button 
                onClick={handleStart}
                disabled={isStarting || ingredients.length === 0}
                className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg text-white shadow-xl transition-all flex justify-center items-center gap-3 active:scale-98 ${
                  isStarting 
                    ? 'bg-amber-500 shadow-amber-500/20 cursor-wait' 
                    : ingredients.length === 0 
                      ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-500' 
                      : 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 shadow-emerald-600/30 hover:shadow-2xl hover:-translate-y-0.5'
                }`}
              >
                {isStarting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Gemini Meracik Tutorial Kompos...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 START COMPOSTING</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">Langkah Interaktif</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ========================================== */}
          {/* KOLOM KANAN: COMPOSTBOT CHAT (MESSAGING UI) */}
          {/* ========================================== */}
          <div className="lg:col-span-5 flex flex-col h-[520px] border border-slate-200/80 rounded-3xl bg-slate-50/70 overflow-hidden shadow-inner">
            
            {/* MESSENGER HEADER */}
            <div className="bg-white p-4 border-b border-slate-200/80 font-bold text-slate-800 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg">
                  🤖
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">CompostBot AI</h3>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online & Siap Membantu
                  </p>
                </div>
              </div>
            </div>
            
            {/* MESSAGES LIST */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {chatMessages.length === 0 && (
                <div className="text-center text-slate-400 text-xs mt-12 flex flex-col items-center px-4 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200/60 flex items-center justify-center text-xl">
                    💬
                  </div>
                  <p className="font-bold text-slate-600">Tanya sesuatu ke CompostBot!</p>
                  <p className="text-slate-400 italic">
                    Contoh: "Apakah sisa nasi basi boleh dimasukkan ke dalam racikan kompos?"
                  </p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-br-2xs shadow-xs' 
                        : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-2xs shadow-xs'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}

              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-2xs flex items-center gap-2 text-xs text-slate-500 shadow-xs">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-[11px] font-medium text-slate-400">CompostBot berpikir...</span>
                  </div>
                </div>
              )}
            </div>

            {/* CHAT INPUT FORM */}
            <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200/80 flex gap-2">
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tulis pertanyaan..." 
                className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || isChatting} 
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xs"
              >
                Kirim
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* MINI SCANNER MODAL (POP-UP TAMBAH BAHAN)   */}
      {/* ========================================== */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-emerald-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>📷</span> Tambah Bahan Baru
              </h3>
              <button 
                onClick={closeScannerModal} 
                className="w-8 h-8 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 font-bold text-lg flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800">
                {scanImagePreview ? (
                  <img src={scanImagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-2 border-emerald-400/40 rounded-2xl pointer-events-none p-6">
                      <div className="w-full h-full border-2 border-dashed border-emerald-400/70 rounded-xl"></div>
                    </div>
                  </>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Controls */}
              <div className="space-y-3">
                {scanImagePreview ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setScanImagePreview(null)} 
                      className="flex-1 py-3 border border-slate-200 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      ↺ Ulangi
                    </button>
                    <button 
                      onClick={handleProcessAdd} 
                      disabled={isDetectingAdd}
                      className={`flex-[2] py-3 rounded-2xl font-black text-xs text-white shadow-md transition-all flex justify-center items-center ${
                        isDetectingAdd ? 'bg-amber-500 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {isDetectingAdd ? 'Menganalisis AI...' : '✅ Tambahkan ke Sesi'}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCapture} 
                      className="flex-[2] py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs hover:bg-emerald-700 shadow-md transition-all"
                    >
                      📷 Jepret Foto
                    </button>
                    <label className="flex-1 py-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs text-center cursor-pointer hover:bg-slate-200 flex items-center justify-center transition-colors">
                      📁 Upload
                      <input type="file" accept="image/*" onChange={handleFileUploadAdd} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
