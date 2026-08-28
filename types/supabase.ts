export interface DbSession {
  id: string;
  user_id: string;
  status: 'pre_composting' | 'generating_steps' | 'active' | 'completed';
  created_at: string;
}

export interface DbIngredient {
  id: string;
  session_id: string;
  name: string;
  quantity: number;
  condition: 'whole' | 'peel' | 'rotten';
  confidence_score?: number | null;
  created_at?: string;
}
