// ===== COMPOSTMIND SCRIPT =====

// --- Navigation ---
function navigateToPage(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.getElementById('page-' + page).classList.add('active');
  closeSidebar();
}

function navigateToHistory() {
  navigateToPage('history');
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    navigateToPage(page);
  });
});

// --- Hamburger / Mobile sidebar ---
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.querySelector('.sidebar');

// Create overlay
const overlay = document.createElement('div');
overlay.className = 'sidebar-overlay';
document.body.appendChild(overlay);

hamburgerBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
});
overlay.addEventListener('click', closeSidebar);

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

// --- Mode Switch ---
let currentMode = 'upload';
let cameraStream = null;
const cameraVideo = document.getElementById('cameraVideo');
const cameraContainer = document.getElementById('cameraContainer');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');

function switchMode(mode) {
  currentMode = mode;
  document.getElementById('btn-upload').classList.toggle('active', mode === 'upload');
  document.getElementById('btn-camera').classList.toggle('active', mode === 'camera');
  document.getElementById('upload-mode').style.display = mode === 'upload' ? 'block' : 'none';
  document.getElementById('camera-mode').style.display = mode === 'camera' ? 'block' : 'none';

  if (mode !== 'camera' && cameraStream) {
    stopCamera();
  }
}

// --- Upload / Dropzone ---
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');

dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) handleImage(file);
});

dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleImage(file);
});

// --- Camera ---
// function startCamera() {
//   const placeholder = document.getElementById('cameraPlaceholder');
//   const container = document.getElementById('cameraContainer');

//   if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//     navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
//       .then(stream => {
//         cameraStream = stream;
//         const video = document.getElementById('cameraVideo');
//         video.srcObject = stream;
//         placeholder.style.display = 'none';
//         container.style.display = 'block';
//       })
//       .catch(err => {
//         alert('Camera access denied or unavailable. Please allow camera permissions.\n\n' + err.message);
//       });
//   } else {
//     alert('Your browser does not support camera access. Please use the upload option.');
//   }
// }

// function stopCamera() {
//   if (cameraStream) {
//     cameraStream.getTracks().forEach(t => t.stop());
//     cameraStream = null;
//   }
//   const container = document.getElementById('cameraContainer');
//   const placeholder = document.getElementById('cameraPlaceholder');
//   container.style.display = 'none';
//   placeholder.style.display = 'block';
// }

// --- VARIABEL KONTROL LIVE SCANNING (QRIS MODE) ---
let scanInterval = null;      // Menyimpan perulangan cek gambar per detik
let timeoutTimer = null;      // Menyimpan timer batas 10 detik
let isAutoCapturing = false;  // Mencegah trigger ganda saat proses capture

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  cameraVideo.pause();
  cameraVideo.srcObject = null;
  cameraContainer.style.display = 'none';
  cameraPlaceholder.style.display = 'flex';
}

// Fungsi untuk mulai memindai secara live ala QRIS
async function startLiveScan() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Browser tidak mendukung akses kamera. Silakan gunakan upload gambar.');
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();
    cameraPlaceholder.style.display = 'none';
    cameraContainer.style.display = 'block';
    switchMode('camera');

    isAutoCapturing = false;
    clearTimeout(timeoutTimer);
    clearInterval(scanInterval);

    timeoutTimer = setTimeout(() => {
      if (!isAutoCapturing) {
        isAutoCapturing = true;
        clearInterval(scanInterval);
        capturePhoto();
      }
    }, 10000);

    scanInterval = setInterval(async () => {
      if (isAutoCapturing || cameraVideo.paused || cameraVideo.ended) return;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 320;
      tempCanvas.height = 240;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(cameraVideo, 0, 0, tempCanvas.width, tempCanvas.height);

      tempCanvas.toBlob(async (blob) => {
        if (!blob) return;

        const fileCek = new File([blob], 'cek_kilat.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', fileCek);

        try {
          const response = await fetch('http://127.0.0.1:8000/api/check-object', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const resData = await response.json();
            if (resData.is_object_found === true && !isAutoCapturing) {
              isAutoCapturing = true;
              clearTimeout(timeoutTimer);
              clearInterval(scanInterval);
              capturePhoto();
            }
          }
        } catch (err) {
          console.log('Menunggu backend siap menerima scanning stream...');
        }
      }, 'image/jpeg', 0.5);
    }, 1000);
  } catch (err) {
    alert('Gagal mengakses kamera: ' + err.message);
  }
}

// Fungsi Capture Photo Utama Milikmu (Sudah Disesuaikan & Dihubungkan)
function capturePhoto() {
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('captureCanvas');
  
  // Pastikan interval & timeout dibersihkan jika fungsi ini dipicu manual oleh tombol
  clearInterval(scanInterval);
  clearTimeout(timeoutTimer);

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  // Ambil dataURL untuk preview visual di fungsi displayResult nanti
  const dataURL = canvas.toDataURL('image/jpeg');

  canvas.toBlob(blob => {
    if (blob) {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      stopCamera();
      switchMode('upload'); // Kembali ke tampilan asal secara visual
      
      // Jalankan fungsi analisis utama ke backend untuk memicu respons Gemini API
      analyzeImage(dataURL, file);
    }
  }, 'image/jpeg', 0.92);
}

// Fungsi utama penganalisis gambar dan penembak Gemini API (Milikmu)
async function analyzeImage(dataURL, file) {
  const LOCAL_BACKEND_URL = 'http://127.0.0.1:8000/api/scan-kompos';
  const formData = new FormData();
  formData.append('file', file);

  // Nyalakan overlay loading jika ada di UI-mu
  if (typeof matikanOverlayLoading !== 'undefined') {
    // Jalankan overlay menyala di sini jika ada fungsi nyalakanOverlayLoading()
  }

  try {
    const response = await fetch(LOCAL_BACKEND_URL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Gagal menghubungi server Python. Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'success') {
      const synchronizedResult = {
        isCompostable: data.isCompostable,
        itemName: data.itemName,
        confidencePercent: data.confidence,
        recommendation: data.kesimpulan_logika.status,
        tips: [data.kesimpulan_logika.solusi], 
        didYouKnow: data.kesimpulan_logika.kekurangan ? `Kekurangan saat ini: ${data.kesimpulan_logika.kekurangan}` : 'Rasio material tumpukan kompos ini sudah berada dalam kondisi seimbang.'
      };

      displayResult(synchronizedResult, dataURL);

    } else {
      alert('AI Gagal Menganalisis: ' + data.message);
      if (typeof matikanOverlayLoading === 'function') matikanOverlayLoading();
    }

  } catch (err) {
    console.error('Analysis error:', err);
    alert('Tidak dapat terhubung ke server backend Python. Pastikan kamu sudah menjalankan uvicorn di terminal!');
    if (typeof matikanOverlayLoading === 'function') matikanOverlayLoading();
  }
}

// On page load, hide camera container
document.getElementById('cameraContainer').style.display = 'none';

// --- Handle Image & Analyze ---
function handleImage(file) {
  if (!file.type.match(/image\/(jpeg|jpg|png)/i)) {
    alert('Please upload a JPG, JPEG, or PNG image.');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const dataURL = e.target.result;
    showResultSection(dataURL);
    analyzeImage(dataURL, file);
  };
  reader.readAsDataURL(file);
}

function showResultSection(dataURL) {
  const resultSection = document.getElementById('resultSection');
  const resultImage = document.getElementById('resultImage');

  resultImage.src = dataURL;
  resultSection.style.display = 'block';
  resultSection.classList.add('fade-in-up');

  // hide recs until analysis done
  document.getElementById('recommendationSection').style.display = 'none';
  document.getElementById('didYouKnowSection').style.display = 'none';

  // show overlay
  document.getElementById('analyzingOverlay').style.display = 'flex';

  // Reset bar
  document.getElementById('confBarFill').style.width = '0%';

  // scroll to result
  setTimeout(() => {
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// async function analyzeImage(dataURL, file) {

//   const LOCAL_BACKEND_URL = 'http://127.0.0.1:8000/api/scan-kompos';

//   const base64Data = dataURL.split(',')[1];
//   const mediaType = file.type || 'image/jpeg';

//   try {
//     const response = await fetch('https://api.anthropic.com/v1/messages', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         model: 'claude-sonnet-4-20250514',
//         max_tokens: 1000,
//         system: `You are CompostMind, an expert composting assistant AI. When given a photo of a waste item, analyze it and respond ONLY with a JSON object (no markdown, no backticks) with these exact fields:
// {
//   "isCompostable": true or false,
//   "itemName": "name of the waste item",
//   "confidencePercent": number between 50 and 99 (e.g. 94.5),
//   "recommendation": "A short 1-sentence recommendation",
//   "tips": ["tip 1", "tip 2", "tip 3", "tip 4"],
//   "didYouKnow": "An interesting fact about composting this item."
// }
// Be accurate, educational, and encouraging.`,
//         messages: [
//           {
//             role: 'user',
//             content: [
//               {
//                 type: 'image',
//                 source: { type: 'base64', media_type: mediaType, data: base64Data }
//               },
//               { type: 'text', text: 'Analyze this waste item for composting. Respond only with JSON.' }
//             ]
//           }
//         ]
//       })
//     });

//     const data = await response.json();
//     const rawText = data.content?.map(b => b.text || '').join('').trim();

//     let result;
//     try {
//       const clean = rawText.replace(/```json|```/g, '').trim();
//       result = JSON.parse(clean);
//     } catch {
//       // fallback
//       result = {
//         isCompostable: rawText.toLowerCase().includes('compostable'),
//         itemName: 'Waste item',
//         confidencePercent: 85,
//         recommendation: 'Analyzed successfully.',
//         tips: ['Cut into smaller pieces for faster decomposition.', 'Mix with brown materials.', 'Keep moist.', 'Turn regularly.'],
//         didYouKnow: 'Composting reduces landfill waste significantly.'
//       };
//     }

//     displayResult(result, dataURL);

//   } catch (err) {
//     console.error('Analysis error:', err);
//     // Fallback demo result
//     displayResult({
//       isCompostable: true,
//       itemName: 'Organic waste',
//       confidencePercent: 92.5,
//       recommendation: 'This waste is compostable! Add it to your compost bin.',
//       tips: [
//         'Cut into smaller pieces for faster decomposition.',
//         'Mix with dry leaves or brown materials.',
//         'Keep the compost moist (not too wet).',
//         'Turn the compost regularly for better results.'
//       ],
//       didYouKnow: 'Composting food waste can reduce your household waste by up to 30%!'
//     }, dataURL);
//   }
// }

async function analyzeImage(dataURL, file) {
  // 1. Alamat API Lokal FastAPI Python kamu
  const LOCAL_BACKEND_URL = 'http://127.0.0.1:8000/api/scan-kompos';

  // 2. Bungkus file gambar asli kedalam FormData (Sesuai kebutuhan UploadFile di FastAPI)
  const formData = new FormData();
  formData.append('file', file);

  try {
    // 3. Tembak API Python Lokal menggunakan Fetch API
    const response = await fetch(LOCAL_BACKEND_URL, {
      method: 'POST',
      body: formData // Kirim data gambarnya di sini
    });

    if (!response.ok) {
      throw new Error(`Gagal menghubungi server Python. Status: ${response.status}`);
    }

    // 4. Ambil data JSON hasil analisis YOLO + logic.py
    const data = await response.json();
    
    if (data.status === 'success') {
      
      // 5. Selaraskan format data Python agar sesuai dengan fungsi displayResult milikmu
      const synchronizedResult = {
        isCompostable: data.isCompostable,
        itemName: data.itemName,
        confidencePercent: data.confidence,
        recommendation: data.kesimpulan_logika.status, // Diambil dari status di logic.py
        
        // Karena logic.py mengembalikan satu kalimat solusi, kita ubah jadi array 
        // agar tidak merusak perulangan (.forEach) di fungsi displayResult bawanmu.
        tips: [data.kesimpulan_logika.edukasi_ai], 
        
        // Jika ada informasi kekurangan nutrisi dari logic.py, tampilkan di sini
        didYouKnow: data.kesimpulan_logika.kekurangan ? `Kekurangan saat ini: ${data.kesimpulan_logika.kekurangan}` : 'Rasio material tumpukan kompos ini sudah berada dalam kondisi seimbang.'
      };

      // 6. Lempar data yang sudah selaras ke fungsi penampil layar
      displayResult(synchronizedResult, dataURL);

    } else {
      alert('AI Gagal Menganalisis: ' + data.message);
      matikanOverlayLoading();
    }

  } catch (err) {
    console.error('Analysis error:', err);
    alert('Tidak dapat terhubung ke server backend Python. Pastikan kamu sudah menjalankan uvicorn di terminal!');
    
    // Matikan overlay jika terjadi error koneksi
    matikanOverlayLoading();
  }
}

// Fungsi pembantu untuk mematikan animasi loading jika server python mati/error
function matikanOverlayLoading() {
  document.getElementById('analyzingOverlay').style.display = 'none';
}

function displayResult(result, dataURL) {
  const isComp = result.isCompostable;
  const conf = parseFloat(result.confidencePercent) || 85;

  // Hide overlay
  document.getElementById('analyzingOverlay').style.display = 'none';

  // Update gambar recommendation dengan hasil jepretan terbaru
  document.getElementById('recImage').src = dataURL;
  document.getElementById('recImage').style.display = 'block';

  // Badge & prediction
  const badge = document.getElementById('predictionBadge');
  const badgeIcon = document.getElementById('badgeIcon');
  const predText = document.getElementById('predictionText');

  badge.style.background = isComp ? 'var(--green-pale)' : '#ffeaea';
  badgeIcon.textContent = isComp ? '✓' : '✕';
  badgeIcon.className = 'badge-icon' + (isComp ? '' : ' non-compostable');
  predText.textContent = isComp ? 'Compostable' : 'Non-Compostable';
  predText.className = 'prediction-text' + (isComp ? '' : ' non-compostable');

  // Confidence
  document.getElementById('confScore').textContent = conf.toFixed(2) + '%';
  setTimeout(() => {
    document.getElementById('confBarFill').style.width = conf + '%';
    document.getElementById('confBarFill').style.background = isComp
      ? 'linear-gradient(90deg, var(--green-main), var(--green-light))'
      : 'linear-gradient(90deg, #e53935, #ef5350)';
  }, 200);

  // Recommendation
  const recSection = document.getElementById('recommendationSection');
  document.getElementById('recMainText').textContent = result.recommendation;
  const recList = document.getElementById('recList');
  recList.innerHTML = '';
  (result.tips || []).forEach(tip => {
    const li = document.createElement('li');
    li.textContent = (isComp ? '✅ ' : '⚠️ ') + tip;
    recList.appendChild(li);
  });
  recSection.style.display = 'block';
  recSection.classList.add('fade-in-up');

  // Did you know
  const dykSection = document.getElementById('didYouKnowSection');
  document.getElementById('dykText').textContent = result.didYouKnow || '';
  dykSection.style.display = 'block';
  dykSection.classList.add('fade-in-up');

  // Save to history
  saveHistory(result, dataURL, conf);

  // Auto-navigate ke History setelah 1.5 detik
  setTimeout(() => {
    navigateToHistory();
  }, 1500);
}

// --- History ---
function saveHistory(result, dataURL, conf) {
  const history = JSON.parse(localStorage.getItem('compostHistory') || '[]');
  history.unshift({
    itemName: result.itemName || 'Waste item',
    isCompostable: result.isCompostable,
    conf: conf.toFixed(1),
    time: new Date().toLocaleString(),
    thumb: dataURL
  });
  // Keep max 20
  if (history.length > 20) history.length = 20;
  localStorage.setItem('compostHistory', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const history = JSON.parse(localStorage.getItem('compostHistory') || '[]');

  if (history.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No history yet. Analyze some waste first!</p></div>';
    return;
  }

  list.innerHTML = history.map((item,index) => `
<div class="history-item">

    <div class="history-left">

        <div class="history-thumb">
            <img src="${item.thumb}">
        </div>

        <div class="history-info">

            <div class="h-label ${item.isCompostable ? 'c' : 'nc'}">
                ${item.isCompostable ? '✅ Compostable' : '❌ Non-Compostable'}
            </div>

            <div class="h-conf">
                ${item.itemName} — ${item.conf}% confidence
            </div>

            <div class="h-time">
                🕑 ${item.time}
            </div>

        </div>

    </div>

    <button
        class="delete-history-btn"
        onclick="deleteHistory(${index})">
        🗑
    </button>

</div>
  `).join('');
}

function deleteHistory(index){

    let history =
    JSON.parse(
        localStorage.getItem("compostHistory")
        || "[]"
    );

    history.splice(index,1);

    localStorage.setItem(
        "compostHistory",
        JSON.stringify(history)
    );

    renderHistory();
}

document
.getElementById("clearHistoryBtn")
.addEventListener("click", () => {

    if(
        confirm(
            "Delete all history?"
        )
    ){

        localStorage.removeItem(
            "compostHistory"
        );

        renderHistory();

    }

});

// Init history on load
renderHistory();