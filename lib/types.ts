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
  name: string;
  quantity: number;
  condition: string;
  confidence_score: number | null;
}
