'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  
  // State untuk Mode Input: 'camera' atau 'upload'
  const [inputMode, setInputMode] = useState<'camera' | 'upload'>('camera');
  
  // State untuk Gambar yang akan diproses
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  
  type DetectedItem = { id?: string; name: string; quantity: number; condition: 'whole' | 'peel' | 'rotten' };

  // State untuk Pop-up Modal Hasil Deteksi
  const [showModal, setShowModal] = useState(false);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);

  // Refs untuk Live Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // LOGIKA LIVE CAMERA (getUserMedia)
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Gagal mengakses kamera:", err);
      alert("Tidak bisa mengakses kamera. Pastikan browser memiliki izin kamera, atau gunakan fitur Upload.");
      setInputMode('upload');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (inputMode === 'camera' && !imagePreview) {
      const timer = window.setTimeout(() => {
        void startCamera();
      }, 0);

      return () => {
        window.clearTimeout(timer);
        stopCamera();
      };
    }

    stopCamera();
    return undefined;
  }, [inputMode, imagePreview]);

  // Handle Tombol "Jepret / Capture"
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImagePreview(dataUrl);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
            setImageFile(file);
          }
        }, 'image/jpeg', 0.8);

        stopCamera();
      }
    }
  };

  // LOGIKA UPLOAD FILE MANUAL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fungsi Reset
  const handleRetake = () => {
    setImagePreview(null);
    setImageFile(null);
    setShowModal(false);
    if (inputMode === 'camera') {
      startCamera();
    }
  };

  // LOGIKA DETEKSI AI (YOLO)
  const handleDetect = async () => {
    if (!imagePreview && !imageFile) return;
    setIsDetecting(true);

    try {
      let fileToSend = imageFile;

      if (!fileToSend && imagePreview) {
        const resBlob = await fetch(imagePreview);
        const blob = await resBlob.blob();
        fileToSend = new File([blob], "capture.jpg", { type: "image/jpeg" });
      }

      if (!fileToSend) {
        alert("Gagal membaca file gambar.");
        return;
      }

      const formData = new FormData();
      formData.append('file', fileToSend);

      const res = await fetch('/api/detect', {
        method: 'POST',
        body: formData,
      });

      const data = (await res.json()) as {
        ingredients?: Array<{ name: string; quantity: number; condition?: 'whole' | 'peel' | 'rotten'; confidence_score?: number }>;
        error?: string;
      };

      if (res.ok) {
        if (data.ingredients && data.ingredients.length > 0) {
          const formatted: DetectedItem[] = data.ingredients.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            condition: item.condition ?? 'whole'
          }));
          setDetectedItems(formatted);
          setShowModal(true);
        } else {
          alert('Tidak ada objek compostable yang terdeteksi. Coba foto yang lebih jelas atau dekat!');
        }
      } else {
        alert(`Error Server: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      alert('Gagal menghubungi server AI. Pastikan server Python & Next.js menyala.');
    } finally {
      setIsDetecting(false);
    }
  };

  const updateQuantity = async (index: number, delta: number) => {
    const newItems = [...detectedItems];
    const item = newItems[index];
    const currentQuantity = item.quantity;
    const newQuantity = currentQuantity + delta;

    if (newQuantity < 0) return;

    if (newQuantity === 0) {
      const confirmed = window.confirm(
        `Hapus item "${item.name.replace('_', ' ')}" dari hasil deteksi?`
      );

      if (!confirmed) return;

      const filteredItems = newItems.filter((_, itemIndex) => itemIndex !== index);
      setDetectedItems(filteredItems);

      if (item.id) {
        try {
          await fetch(`/api/ingredients/${item.id}`, {
            method: 'DELETE',
          });
        } catch (err) {
          console.error('Gagal menghapus bahan dari database:', err);
        }
      }

      return;
    }

    item.quantity = newQuantity;
    setDetectedItems(newItems);

    // Optimistic backend update jika ID bahan tersedia
    if (item.id) {
      try {
        await fetch(`/api/ingredients/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQuantity }),
        });
      } catch (err) {
        console.error('Gagal memperbarui jumlah bahan di database:', err);
      }
    }
  };

  const handleConfirm = async () => {
    if (!detectedItems.length) {
      alert('Tidak ada bahan yang siap disimpan.');
      return;
    }

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: detectedItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            condition: item.condition,
            confidence_score: item.id ? undefined : undefined,
          }))
        })
      });

      const data = (await res.json()) as { error?: string; session_id?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat sesi composting.');
      }

      if (data.session_id) {
        setShowModal(false);
        router.push(`/composting/${data.session_id}`);
        return;
      }

      throw new Error('Session ID tidak diterima dari server.');
    } catch (error: unknown) {
      console.error('Gagal menyimpan sesi:', error);
      alert(error instanceof Error ? error.message : 'Gagal menyimpan sesi composting.');
    }
  };

  const handleExitDetected = () => {
    setShowModal(false);
    setDetectedItems([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-slate-50 to-white text-slate-800 flex flex-col font-sans">
      
      {/* CANVAS SENSE (HIDDEN) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* MAIN CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10 flex-1 w-full space-y-8">
        
        {/* ========================================== */}
        {/* TAB 1: HOME PAGE (SCANNER)                 */}
        {/* ========================================== */}
        <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* HERO TITLE HEADER */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
                ✨ AI Vision Composting Assistant
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Ubah Bahan Organik Jadi <span className="text-emerald-600 underline decoration-emerald-300 decoration-wavy decoration-2">Nutrisi Tanah</span>
              </h1>
              <p className="text-slate-600 text-sm sm:text-base font-normal leading-relaxed">
                Ambil foto sisa makanan atau bahan organikmu. AI kami akan mengidentifikasi kelayakannya dan memandu langkah pengomposan secara otomatis!
              </p>
            </div>

            {/* SCANNER CARD */}
            <div className="max-w-xl mx-auto bg-white rounded-3xl p-4 sm:p-6 shadow-xl shadow-slate-200/60 border border-emerald-100/80 transition-all">
              
              {/* MODE TOGGLE SWITCH */}
              <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 mb-5">
                <button
                  onClick={() => { setInputMode('camera'); setImagePreview(null); setImageFile(null); }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                    inputMode === 'camera'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>📷</span> Kamera Live
                </button>
                <button
                  onClick={() => { setInputMode('upload'); stopCamera(); }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                    inputMode === 'upload'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>📁</span> Upload Foto
                </button>
              </div>

              {/* VIEWPORT: CAMERA OR UPLOAD OR PREVIEW */}
              {!imagePreview ? (
                <div>
                  {/* LIVE CAMERA MODE */}
                  {inputMode === 'camera' && (
                    <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center group border border-slate-800">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      
                      {/* CAMERA OVERLAY & SCANNER TARGET */}
                      <div className="absolute inset-0 border-2 border-emerald-400/40 rounded-2xl pointer-events-none flex items-center justify-center p-8">
                        <div className="w-full h-full border-2 border-dashed border-emerald-400/70 rounded-xl relative animate-pulse">
                          <div className="absolute top-2 left-2 text-[10px] uppercase font-bold tracking-wider text-emerald-300 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-xs">
                            Arahkan ke Object Compostable
                          </div>
                        </div>
                      </div>

                      {/* CAPTURE BUTTON */}
                      <div className="absolute bottom-4 inset-x-0 flex justify-center items-center">
                        <button
                          onClick={handleCapture}
                          className="group/btn relative flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                          aria-label="Capture Photo"
                        >
                          <span className="w-12 h-12 rounded-full border-2 border-emerald-600 bg-emerald-500 group-hover/btn:bg-emerald-600 transition-colors"></span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* UPLOAD FILE MODE */}
                  {inputMode === 'upload' && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[4/3] w-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center group"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                        📥
                      </div>
                      <p className="font-bold text-slate-800 text-base mb-1">
                        Tarik & Lepas Gambar di Sini
                      </p>
                      <p className="text-slate-500 text-xs sm:text-sm max-w-xs mb-3">
                        atau klik untuk memilih berkas gambar dari galeri perangkatmu
                      </p>
                      <span className="inline-block px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold shadow-2xs">
                        Format: JPG, JPEG, PNG
                      </span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpg,image/jpeg,image/png"
                        onChange={handleFileChange}
                        hidden
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* IMAGE PREVIEW & ACTIONS */
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] w-full bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-200">
                    <img
                      src={imagePreview}
                      alt="Hasil Foto"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Siap Menganalisis
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleRetake}
                      className="flex-1 py-3 px-4 rounded-2xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-98 transition-all text-sm flex items-center justify-center gap-1.5"
                    >
                      ↺ Foto Ulang
                    </button>
                    <button
                      onClick={handleDetect}
                      disabled={isDetecting}
                      className={`flex-[2] py-3 px-4 rounded-2xl font-black text-white text-sm shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 ${
                        isDetecting
                          ? 'bg-amber-500 shadow-amber-500/20 cursor-wait'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                      }`}
                    >
                      {isDetecting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>AI Menganalisis...</span>
                        </>
                      ) : (
                        <>
                          <span>🔍 Deteksi Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BENEFIT BADGES */}
            <div className="grid sm:grid-cols-3 gap-4 pt-4">
              <div className="bg-white p-5 rounded-2xl border border-emerald-100/60 shadow-xs flex items-start gap-3.5 hover:shadow-md transition-shadow">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xl flex-shrink-0">
                  🌱
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Ramah Lingkungan</h3>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                    Kurangi jejak karbon dengan mengolah sampah dapur secara mandiri.
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-emerald-100/60 shadow-xs flex items-start gap-3.5 hover:shadow-md transition-shadow">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl text-xl flex-shrink-0">
                  ⚡
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Instan dengan AI</h3>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                    Identifikasi otomatis bahan kompos cokelat vs hijau dalam hitungan detik.
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-emerald-100/60 shadow-xs flex items-start gap-3.5 hover:shadow-md transition-shadow">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xl flex-shrink-0">
                  📖
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Panduan Interaktif</h3>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                    Dapatkan langkah pembuatan kompos dan tanya jawab langsung ke CompostBot.
                  </p>
                </div>
              </div>
            </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 CompostMind — Smart AI Composting Assistant 🍃</p>
      </footer>

      {/* ========================================== */}
      {/* POP-UP MODAL HASIL DETEKSI (YOLO)          */}
      {/* ========================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-emerald-100 transform transition-all animate-in zoom-in-95 duration-200">
            
            {/* MODAL HEADER */}
            <div className="text-center mb-5 space-y-1.5">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold mb-2">
                ✨
              </div>
              <h2 className="text-xl font-black text-slate-900">Objek Terdeteksi!</h2>
              <p className="text-xs text-slate-500">
                AI berhasil menemukan bahan berikut. Atur jumlahnya sebelum dilanjutkan.
              </p>
            </div>

            {/* DETECTED ITEMS LIST */}
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-1">
              {detectedItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between"
                >
                  <span className="font-bold text-sm capitalize text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    {item.name.replace('_', ' ')}
                  </span>
                  
                  {/* QUANTITY CONTROLS */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(index, -1)}
                      className="w-7 h-7 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors active:scale-95 text-xs flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-extrabold w-4 text-center text-slate-800 text-xs">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(index, 1)}
                      className="w-7 h-7 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors active:scale-95 text-xs flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex gap-3">
              <button
                onClick={handleExitDetected}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-red-600/30 transition-all active:scale-98 border border-red-600"
              >
                Keluar
              </button>
              <button
                onClick={handleRetake}
                className="flex-1 py-3 px-4 border border-slate-200 rounded-2xl font-bold text-slate-600 text-sm hover:bg-slate-50 transition-colors"
              >
                Foto Ulang
              </button>
              <button
                onClick={handleConfirm}
                className="flex-[1.5] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-md shadow-emerald-600/30 transition-all active:scale-98"
              >
                Simpan Sesi →
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
