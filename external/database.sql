-- 1. Buat Tabel Sessions (Induk dari semua aktivitas)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'pre_composting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Buat Tabel Steps (Langkah-langkah dalam sesi)
CREATE TABLE steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  expected_output TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Buat Tabel Ingredients (Bahan kompos yang terdeteksi)
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'whole',
  confidence_score DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Buat Tabel Chat History (Riwayat percakapan AI)
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  step_id UUID REFERENCES steps(id) ON DELETE SET NULL,
  role TEXT NOT NULL, -- 'user' atau 'assistant'
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Tambahkan Indeks untuk Optimasi Pencarian
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_steps_session ON steps(session_id);
CREATE INDEX idx_ingredients_session ON ingredients(session_id);
CREATE INDEX idx_chat_session ON chat_history(session_id);