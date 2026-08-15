import os
import uuid
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

# ==========================================
# 1. INISIALISASI SERVER & MODEL
# ==========================================
app = FastAPI(title="CompostMind AI Core")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PERUBAHAN DI SINI ---
# Kita pakai yolo11n.pt (Nano version agar super cepat di CPU laptop)
# Jika nanti best.pt dari teman sudah ada, tinggal ganti string "yolo11n.pt" menjadi "best.pt"
MODEL_PATH = "yolo11n.pt" 

print(f"⏳ Sedang memuat model {MODEL_PATH} ke memori... (Akan download otomatis jika belum ada)")
try:
    model = YOLO(MODEL_PATH)
    print(f"✅ Model {MODEL_PATH} berhasil dimuat!")
except Exception as e:
    print(f"❌ Gagal memuat model: {e}")

os.makedirs("temp_uploads", exist_ok=True)

# ==========================================
# 2. ENDPOINT DETEKSI (THE CORE LOGIC)
# ==========================================
@app.post("/detect")
async def detect_compost(file: UploadFile = File(...)):
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File yang diupload harus berupa gambar.")

    temp_filename = f"{uuid.uuid4()}.jpg"
    temp_filepath = os.path.join("temp_uploads", temp_filename)

    try:
        # A. Simpan file sementara
        with open(temp_filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # B. JALANKAN YOLOv11 INFERENCE! 🔥
        results = model(temp_filepath) 

        # C. Parsing output
        detections = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for i in range(len(boxes)):
                    class_id = int(boxes.cls[i].item())
                    # model.names akan memetakan ID ke nama COCO dataset (apple, banana, dll)
                    class_name = model.names.get(class_id, "unknown_object")
                    confidence = float(boxes.conf[i].item())
                    
                    # Filter confidence > 40%
                    if confidence > 0.40:
                        detections.append({
                            "name": class_name,
                            "confidence": round(confidence, 2)
                        })

        return {
            "status": "success",
            "message": f"Berhasil mendeteksi {len(detections)} objek menggunakan YOLOv11.",
            "detections": detections
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi error saat inferensi YOLO: {str(e)}")
    
    finally:
        # E. CLEANUP
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)

@app.get("/")
async def root():
    return {"message": "CompostMind AI Core (YOLOv11 Mode) is running!"}