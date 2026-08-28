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

// Bentuk data Sesi di Supabase
export interface DbSession {
  id: string;
  user_id: string | null;
  guest_identifier: string | null;
  status: string;
  created_at?: string;
}

// Bentuk data untuk disimpan ke Supabase
export interface DbIngredient {
  id?: string;
  session_id: string;
  name: string;
  quantity: number;
  condition: 'whole' | 'peel' | 'rotten';
  confidence_score?: number;
}
