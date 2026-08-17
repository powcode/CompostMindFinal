// Bentuk data yang dikembalikan oleh server Python (FastAPI)
export interface YoloDetection {
  name: string;
  confidence: number;
}

export interface YoloResponse {
  status: string;
  message: string;
  detections: YoloDetection[];
}

// Bentuk data untuk disimpan ke Supabase
export interface DbIngredient {
  session_id: string;
  session_id: string;
  name: string;
  quantity: number;
  condition: 'whole' | 'peel' | 'rotten'; // ✅ Tipe literal, bukan string biasa
  confidence_score?: number;
}
