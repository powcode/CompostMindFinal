'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './home.css';

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

  // State Halaman Template Tab ('home' | 'history' | 'tips')
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'tips'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Refs untuk Live Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (inputMode === 'camera' && !imagePreview && activeTab === 'home') {
      startCamera();
    } else {
      stopCamera();
    }

    // Cleanup saat komponen dihancurkan (penting agar lampu kamera tidak menyala terus)
    return () => {
      stopCamera();
    };
  }, [inputMode, imagePreview, activeTab]);

  // Handle Tombol "Jepret / Capture"
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set ukuran canvas sesuai ukuran video asli
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
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
    <main className="cm-home min-h-screen flex">
      {/* SIDEBAR OVERLAY FOR MOBILE */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay active" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <img src="assets/logo.png" alt="CompostMind Logo" />
          </div>
          <div className="logo-text">
            <span className="brand-name">CompostMind</span>
            <span className="brand-sub">Smart Composting Assistant</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a 
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }}
          >
            <span className="nav-icon">🏠</span> Home
          </a>
          <a 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }}
          >
            <span className="nav-icon">🕐</span> History
          </a>
          <a 
            className={`nav-item ${activeTab === 'tips' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('tips'); setIsSidebarOpen(false); }}
          >
            <span className="nav-icon">🌿</span> Tips
          </a>
        </nav>

        <div className="sidebar-why">
          <p className="why-title">Why Compost?</p>
          <ul className="why-list">
            <li><span>🌿</span> Reduce landfill waste</li>
            <li><span>🌱</span> Improve soil health</li>
            <li><span>🌍</span> Help the environment</li>
          </ul>
        </div>

        <div className="sidebar-illustration">
          <img src="assets/compost-bin.png" alt="Compost Bin" />
        </div>

        <div className="sidebar-footer">
          Made with ❤️ for<br/>a greener planet 🌍
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {/* TOP BAR */}
        <div className="topbar">
          <button 
            className="hamburger" 
            id="hamburgerBtn" 
            aria-label="Toggle menu"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            ☰
          </button>
          <div className="topbar-right">
            <a href="#" className="about-link">ⓘ About</a>
          </div>
        </div>

        {/* PAGE: HOME */}
        <div className={`page ${activeTab === 'home' ? 'active' : ''}`} id="page-home">
          <div className="page-header">
            <h1 className="page-title">Welcome to CompostMind 🍃</h1>
            <p className="page-subtitle">
              Upload a photo of your waste and let AI identify whether it is{' '}
              <strong className="compostable-label">Compostable</strong> or{' '}
              <strong className="non-compostable-label">Non-Compostable.</strong>
            </p>
          </div>

          {/* UPLOAD SECTION */}
          <section className="card upload-section">
            <div className="card-header">
              <h2>Upload Waste Image</h2>
            </div>

            {/* Mode Toggle */}
            <div className="mode-toggle">
              <button 
                className={`mode-btn ${inputMode === 'upload' ? 'active' : ''}`} 
                id="btn-upload" 
                onClick={() => { setInputMode('upload'); stopCamera(); }}
              >
                Upload Image
              </button>
              <button 
                className={`mode-btn ${inputMode === 'camera' ? 'active' : ''}`} 
                id="btn-camera" 
                onClick={() => { setInputMode('camera'); setImagePreview(null); }}
              >
                Scan
              </button>
            </div>

            {/* Upload Mode */}
            {inputMode === 'upload' && (
              <div className="upload-area" id="upload-mode">
                <div 
                  className="dropzone" 
                  id="dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="dropzone-inner">
                    <p className="drop-text">Drag and drop an image here</p>
                    <p className="drop-sub">or click to browse</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/jpg,image/jpeg,image/png" 
                    onChange={handleFileChange} 
                    hidden
                  />
                </div>
                <p className="format-note">Supported formats: JPG, JPEG, PNG</p>
              </div>
            )}

            {/* Camera Mode */}
            {inputMode === 'camera' && (
              <div className="camera-area" id="camera-mode">
                {!imagePreview ? (
                  <div className="camera-container" id="cameraContainer">
                    <video ref={videoRef} autoPlay playsInline muted id="cameraVideo" />
                    <div className="camera-overlay">
                      <div className="camera-frame"></div>
                    </div>
                    <div className="camera-controls">
                      <button className="capture-btn" id="captureBtn" onClick={handleCapture}>
                        <span className="capture-ring"></span>
                        <span className="capture-dot"></span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Preview and Detect Controls */}
            {imagePreview && (
              <div className="mt-4 space-y-3">
                <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex space-x-3 pt-2">
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
                    {isDetecting ? 'AI Menganalisis...' : '🔍 Deteksi Sekarang'}
                  </button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </section>

          {/* FOOTER BADGES */}
          <div className="footer-badges">
            <div className="badge-item">
              <span className="badge-emoji">🌿</span>
              <strong>Eco Friendly</strong>
              <p>Small actions for a better planet.</p>
            </div>
            <div className="badge-item">
              <span className="badge-emoji">🌱</span>
              <strong>Reduce Waste</strong>
              <p>Composting helps reduce household waste.</p>
            </div>
            <div className="badge-item">
              <span className="badge-emoji">♻️</span>
              <strong>Better Soil</strong>
              <p>Nutrient-rich compost improves soil health.</p>
            </div>
          </div>

          <div className="main-footer">
            © 2026 CompostMind | Smart Composting Assistant
          </div>
        </div>

        {/* PAGE: HISTORY */}
        <div className={`page ${activeTab === 'history' ? 'active' : ''}`} id="page-history">
          <div className="history-header">
            <div>
              <h1>Analysis History 🕑</h1>
              <p>Your past waste analysis results.</p>
            </div>
          </div>
          <div className="card">
            <div className="history-list">
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No history yet. Analyze some waste first!</p>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE: TIPS */}
        <div className={`page ${activeTab === 'tips' ? 'active' : ''}`} id="page-tips">
          <div className="page-header">
            <h1 className="page-title">Composting Tips 🌿</h1>
            <p className="page-subtitle">Learn how to compost better.</p>
          </div>
          <div className="tips-grid">
            <div className="card tip-card">
              <div className="tip-emoji">🍌</div>
              <h3>Fruit & Veggie Scraps</h3>
              <p>Always compostable. Cut them small for faster breakdown. Avoid oily or salted scraps.</p>
            </div>
            <div className="card tip-card">
              <div className="tip-emoji">📰</div>
              <h3>Paper & Cardboard</h3>
              <p>Shredded paper and torn cardboard are excellent brown materials. Avoid glossy paper.</p>
            </div>
            <div className="card tip-card">
              <div className="tip-emoji">☕</div>
              <h3>Coffee Grounds</h3>
              <p>Coffee grounds and filters are great green material. They enrich compost with nitrogen.</p>
            </div>
            <div className="card tip-card">
              <div className="tip-emoji">🚫</div>
              <h3>Avoid These</h3>
              <p>Meat, dairy, oily food, and pet waste are non-compostable and attract pests.</p>
            </div>
            <div className="card tip-card">
              <div className="tip-emoji">💧</div>
              <h3>Moisture Balance</h3>
              <p>Keep compost as moist as a wrung-out sponge. Too dry = slow; too wet = smelly.</p>
            </div>
            <div className="card tip-card">
              <div className="tip-emoji">🔄</div>
              <h3>Turn Regularly</h3>
              <p>Turn your pile every 1–2 weeks to aerate. Oxygen speeds up decomposition significantly.</p>
            </div>
          </div>
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
