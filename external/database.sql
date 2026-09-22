-- 1. Tabel Sessions (Sesi Composting)
CREATE TABLE public.sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    title TEXT,
    status TEXT NOT NULL DEFAULT 'pre_composting'::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

-- 2. Tabel Ingredients (Bahan-bahan)
CREATE TABLE public.ingredients (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    condition TEXT NOT NULL DEFAULT 'whole'::text,
    confidence_score DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT ingredients_pkey PRIMARY KEY (id),
    CONSTRAINT ingredients_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE
);

-- 3. Tabel Steps (Langkah-langkah dalam Sesi)
CREATE TABLE public.steps (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    step_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    instruction TEXT NOT NULL,
    expected_output TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT steps_pkey PRIMARY KEY (id),
    CONSTRAINT steps_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE
);

-- 4. Tabel Chat History (Riwayat Chat AI)
CREATE TABLE public.chat_history (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    step_id UUID,
    role TEXT NOT NULL, -- 'user' atau 'assistant'
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chat_history_pkey PRIMARY KEY (id),
    CONSTRAINT chat_history_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
    CONSTRAINT chat_history_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.steps(id) ON DELETE SET NULL
);

-- --- INDEXES UNTUK PERFORMA ---
CREATE INDEX idx_ingredients_session_id ON public.ingredients(session_id);
CREATE INDEX idx_steps_session_id ON public.steps(session_id);
CREATE INDEX idx_chat_history_session_id ON public.chat_history(session_id);

-- --- ROW LEVEL SECURITY (RLS) ---
-- Karena tidak ada user, kita buat policy agar semua orang bisa akses (Public Access)
-- Catatan: Ini cocok untuk development atau aplikasi internal sederhana.

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow All Operations (Select, Insert, Update, Delete) untuk semua tabel
CREATE POLICY "Enable all access for all users" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON public.ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON public.steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON public.chat_history FOR ALL USING (true) WITH CHECK (true);