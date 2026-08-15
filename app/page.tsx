'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  
  // State untuk Mode Input: 'camera' atau 'upload'
  const [inputMode, setInputMode] = useState<'camera' | 'upload'>('camera');
  
  // State untuk Gambar yang akan diproses
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  
  // State untuk Pop-up Modal Hasil Deteksi
  const [showModal, setShowModal] = useState(false);
  const [detectedItems, setDetectedItems] = useState<{name: string, quantity: number}[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs untuk Live Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ==========================================
  // LOGIKA LIVE CAMERA (getUserMedia)
  // ==========================================
  const startCamera = async () => {
    try {
      // Minta izin akses kamera (utamakan kamera belakang 'environment' jika di HP)
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
      setInputMode('upload'); // Fallback ke upload jika kamera ditolak/error
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

  // Efek: Nyalakan kamera saat mode 'camera' aktif, matikan saat pindah mode/unmount
  useEffect(() => {
    if (inputMode === 'camera' && !imagePreview) {
      startCamera();
    } else {
      stopCamera();
    }

    // Cleanup saat komponen dihancurkan (penting agar lampu kamera tidak menyala terus)
    return () => {
      stopCamera();
    };
  }, [inputMode, imagePreview]);

  // Handle Tombol "Jepret / Capture"
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set ukuran canvas sesuai ukuran video asli
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Gambar frame video saat ini ke canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Ubah canvas menjadi Data URL (Base64 image)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // 0.8 = kualitas 80% agar size tidak terlalu besar
        setImagePreview(dataUrl);
        stopCamera(); // Matikan kamera setelah dijepret untuk hemat baterai/resource
      }
    }
  };

  // ==========================================
  // LOGIKA UPLOAD FILE MANUAL
  // ==========================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fungsi Reset (Jika user ingin foto ulang)
  const handleRetake = () => {
    setImagePreview(null);
    setShowModal(false);
    setSessionId(null);
    if (inputMode === 'camera') {
      startCamera();
    }
  };

  // ==========================================
  // LOGIKA DETEKSI AI (YOLO)
  // ==========================================
  const handleDetect = async () => {
    if (!imagePreview) return;
    setIsDetecting(true);

    try {
      // Karena imagePreview sekarang berupa Base64 Data URL (dari Canvas atau FileReader),
      // Kita harus mengubahnya kembali menjadi Blob/File agar bisa dikirim via FormData ke Next.js API
      
      const resBlob = await fetch(imagePreview);
      const blob = await resBlob.blob();
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append('file', file);

      // Panggil API Next.js
      const res = await fetch('/api/detect', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        if (data.ingredients && data.ingredients.length > 0) {
          setDetectedItems(data.ingredients);
          setSessionId(data.session_id); // Simpan session ID dari backend
          setShowModal(true); // Munculkan Pop-up
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

  // Handle edit jumlah (+ / -) di dalam Pop-up
  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...detectedItems];
    newItems[index].quantity += delta;
    if (newItems[index].quantity < 1) newItems[index].quantity = 1;
    setDetectedItems(newItems);
  };

  // Handle tombol "Konfirmasi & Mulai Sesi"
  const handleConfirm = () => {
    if (sessionId) {
      router.push(`/composting/${sessionId}`);
    } else {
      alert("Error: Session ID hilang.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 pt-10 bg-gray-50">
      <div className="w-full max-w-md text-center mb-6">
        <h1 className="text-3xl font-bold text-green-700">🌱 CompostMind</h1>
        <p className="text-gray-600 text-sm mt-1">Scan sisa makananmu, biarkan AI memandu pengomposannya.</p>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-xl w-full max-w-md border border-gray-100 overflow-hidden">
        
        {/* Toggle Mode: Kamera vs Upload */}
        {!imagePreview && (
          <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
            <button 
              onClick={() => { setInputMode('camera'); setImagePreview(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${inputMode === 'camera' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}
            >
               Kamera Langsung
            </button>
            <button 
              onClick={() => { setInputMode('upload'); stopCamera(); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${inputMode === 'upload' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}
            >
               Upload Foto
            </button>
          </div>
        )}

        {/* ========================================== */}
        {/* AREA PREVIEW / KAMERA                      */}
        {/* ========================================== */}
        <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden mb-4 flex items-center justify-center">
          
          {imagePreview ? (
            // Tampilkan Gambar yang sudah dijepret / diupload
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
          ) : inputMode === 'camera' ? (
            // Tampilkan Live Video Stream
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
              {/* Overlay panduan bidik */}
              <div className="absolute inset-0 border-4 border-white/30 rounded-2xl pointer-events-none m-4"></div>
              <div className="absolute bottom-4 left-0 right-0 text-center text-white text-xs font-medium drop-shadow-md bg-black/30 py-1 rounded-full mx-8">Arahkan ke sampah organik</div>
            </>
          ) : (
            // Tampilan Placeholder Upload
            <div className="text-gray-500 flex flex-col items-center">
              <span className="text-4xl mb-2">🖼️</span>
              <span className="text-sm">Pilih file di bawah</span>
            </div>
          )}

          {/* Canvas tersembunyi untuk proses capture gambar dari video */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* ========================================== */}
        {/* TOMBOL AKSI                                */}
        {/* ========================================== */}
        <div className="space-y-3">
          
          {imagePreview ? (
            // Jika sudah ada gambar, tampilkan tombol Deteksi & Foto Ulang
            <div className="flex space-x-3">
              <button 
                onClick={handleRetake}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                ↺ Ulangi
              </button>
              <button 
                onClick={handleDetect}
                disabled={isDetecting}
                className={`flex-[2] py-3 rounded-xl font-bold text-white shadow-md transition flex justify-center items-center ${
                  isDetecting ? 'bg-yellow-500 cursor-wait' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isDetecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AI Menganalisis...
                  </>
                ) : '🔍 Deteksi Sekarang'}
              </button>
            </div>
          ) : inputMode === 'camera' ? (
            // Tombol Jepret Besar ala Kamera
            <button 
              onClick={handleCapture}
              className="w-full py-4 bg-white border-4 border-green-600 rounded-full flex items-center justify-center hover:bg-green-50 transition group"
            >
              <div className="w-16 h-16 bg-green-600 rounded-full group-hover:scale-95 transition-transform"></div>
            </button>
          ) : (
            // Tombol Upload File
            <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
              <div className="flex flex-col items-center justify-center pt-2 pb-3">
                <p className="text-sm text-gray-600 font-medium"><span className="text-green-600">Klik untuk upload</span> atau drag & drop</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG (MAX. 10MB)</p>
              </div>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          )}

        </div>
      </div>

      {/* ========================================== */}
      {/* POP-UP MODAL HASIL DETEKSI (YOLO)          */}
      {/* ========================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">✨</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Objek Terdeteksi!</h2>
              <p className="text-sm text-gray-500 mt-1">Edit jumlah jika ada yang kurang tepat sebelum disimpan.</p>
            </div>
            
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {detectedItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="font-medium capitalize text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {item.name.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => updateQuantity(index, -1)} className="w-7 h-7 bg-white border border-gray-200 text-gray-600 rounded-full font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">-</button>
                    <span className="font-bold w-4 text-center text-gray-800">{item.quantity}</span>
                    <button onClick={() => updateQuantity(index, 1)} className="w-7 h-7 bg-white border border-gray-200 text-gray-600 rounded-full font-bold hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition">+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <button onClick={handleRetake} className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition">Foto Ulang</button>
              <button onClick={handleConfirm} className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md transition">Simpan & Lanjut →</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}