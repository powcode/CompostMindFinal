'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// --- TYPES ---
interface Ingredient { id: string; name: string; quantity: number; }
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
    // Fetch ingredients (PENTING: select 'id' juga untuk kebutuhan edit/delete)
    const { data: ingr } = await supabase.from('ingredients').select('id, name, quantity').eq('session_id', sessionId);
    if (ingr) setIngredients(ingr);

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
    if (newQty < 1) return; // Gunakan handleDelete jika mau 0

    // Optimistic UI Update (Update layar dulu biar responsif, baru simpan ke DB)
    setIngredients(prev => prev.map(ingr => ingr.id === id ? { ...ingr, quantity: newQty } : ingr));

    try {
      await fetch(`/api/ingredients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty })
      });
    } catch (err) {
      alert("Gagal update jumlah.");
      fetchSessionData(); // Revert jika gagal
    }
  };

  const handleDeleteIngredient = async (id: string, name: string) => {
    if (!confirm(`Hapus ${name.replace('_', ' ')} dari daftar kompos?`)) return;

    // Optimistic UI
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

  // Efek: Nyalakan kamera HANYA saat modal scanner dibuka
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

  // Proses Deteksi untuk TAMBAH bahan ke sesi yang sedang aktif
  const handleProcessAdd = async () => {
    if (!scanImagePreview) return;
    setIsDetectingAdd(true);

    try {
      const resBlob = await fetch(scanImagePreview);
      const blob = await resBlob.blob();
      const file = new File([blob], "add_capture.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', sessionId); // KIRIM SESSION ID AGAR DITAMBAH KE SESI INI

      const res = await fetch('/api/ingredients', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        if (data.details && data.details.length > 0) {
          alert(`Berhasil! ${data.details.map((d:any) => d.name.replace('_',' ')).join(', ')} ditambahkan ke sesi.`);
          fetchSessionData(); // Refresh list bahan dari DB
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
  // 4. LOGIKA CHATBOT & START (Sama seperti sebelumnya)
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: userMsg })
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

  if (sessionStatus === 'loading') return <div className="p-10 text-center min-h-screen bg-gray-50">Loading data sesi...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center relative">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">🥣 Persiapan Kompos</h1>
          <p className="text-green-100 text-sm mt-1 opacity-80">ID: {sessionId.slice(0, 8)}... • Status: <span className="font-bold uppercase">{sessionStatus.replace('_', ' ')}</span></p>
        </div>

        <div className="p-6 grid lg:grid-cols-2 gap-8">
          
          {/* ========================================== */}
          {/* KOLOM KIRI: MANAJEMEN BAHAN (CRUD)         */}
          {/* ========================================== */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">🥦 Daftar Bahan ({ingredients.length})</h2>
            </div>

            {/* List Bahan dengan Fitur Edit & Delete */}
            <div className="space-y-3 mb-6 flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
              {ingredients.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm">Belum ada bahan. Scan sekarang!</p>
                </div>
              ) : (
                ingredients.map((ingr) => (
                  <div key={ingr.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition group">
                    <span className="font-medium capitalize text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      {ingr.name.replace('_', ' ')}
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      {/* Kontrol Edit Quantity */}
                      <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                        <button onClick={() => handleUpdateQuantity(ingr.id, ingr.quantity, -1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-l-lg transition">-</button>
                        <span className="w-6 text-center text-sm font-bold text-gray-800">{ingr.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(ingr.id, ingr.quantity, 1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-r-lg transition">+</button>
                      </div>
                      {/* Tombol Delete */}
                      <button onClick={() => handleDeleteIngredient(ingr.id, ingr.name)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition" title="Hapus Bahan">
                        ️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Tombol Aksi Utama */}
            <div className="space-y-3 mt-auto">
              <button 
                onClick={() => setShowScannerModal(true)}
                className="w-full py-3 bg-white border-2 border-green-600 text-green-700 rounded-xl font-bold hover:bg-green-50 transition flex items-center justify-center gap-2"
              >
                📷 Tambah Bahan (Scan/Foto)
              </button>
              
              <button 
                onClick={handleStart}
                disabled={isStarting || ingredients.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition flex justify-center items-center gap-2 ${
                  isStarting ? 'bg-yellow-500 cursor-wait' : ingredients.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-emerald-700 hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {isStarting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Gemini Meracik Tutorial...
                  </>
                ) : '🚀 START COMPOSTING'}
              </button>
            </div>
          </div>

          {/* ========================================== */}
          {/* KOLOM KANAN: COMPOSTBOT CHAT               */}
          {/* ========================================== */}
          <div className="flex flex-col h-[500px] border border-gray-200 rounded-2xl bg-gray-50 overflow-hidden shadow-inner">
            <div className="bg-white p-4 border-b font-bold text-gray-700 flex items-center gap-2">
              <span className="text-xl">🤖</span> Tanya CompostBot
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-400 text-sm mt-10 flex flex-col items-center">
                  <span className="text-4xl mb-2 opacity-50">💬</span>
                  <p>Mulai tanya sesuatu seputar bahan komposmu!</p>
                  <p className="text-xs mt-1 italic">Contoh: "Boleh nggak masukin nasi basi?"</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-green-600 text-white rounded-br-sm shadow-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-sm flex items-center gap-2 text-xs text-gray-500 shadow-sm">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    Bot sedang mengetik...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendChat} className="p-3 bg-white border-t flex gap-2">
              <input 
                type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ketik pertanyaan..." className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
              <button type="submit" disabled={!chatInput.trim() || isChatting} className="bg-green-600 text-white px-5 rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm">Kirim</button>
            </form>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* MINI SCANNER MODAL (POP-UP TAMBAH BAHAN)   */}
      {/* ========================================== */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"> Tambah Bahan Baru</h3>
              <button onClick={closeScannerModal} className="text-gray-400 hover:text-red-500 text-xl font-bold">×</button>
            </div>

            {/* Modal Body (Kamera / Preview) */}
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden mb-4 flex items-center justify-center">
                {scanImagePreview ? (
                  <img src={scanImagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    <div className="absolute inset-0 border-4 border-white/30 rounded-2xl pointer-events-none m-4"></div>
                  </>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Kontrol Modal */}
              <div className="space-y-3">
                {scanImagePreview ? (
                  <div className="flex space-x-3">
                    <button onClick={() => setScanImagePreview(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-600 hover:bg-gray-50">↺ Ulangi</button>
                    <button 
                      onClick={handleProcessAdd} disabled={isDetectingAdd}
                      className={`flex-[2] py-2.5 rounded-xl font-bold text-white shadow-md flex justify-center items-center ${isDetectingAdd ? 'bg-yellow-500' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      {isDetectingAdd ? 'Menganalisis...' : '✅ Tambahkan ke Sesi'}
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-3">
                    <button onClick={handleCapture} className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md"> Jepret Foto</button>
                    <label className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center">
                       Upload
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