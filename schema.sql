-- SCHEMAT BAZY DANYCH DLA KUBA WORKOUT APP
-- Skopiuj ten kod i wklej w edytorze SQL w Supabase, a następnie kliknij "RUN".

-- 1. TABELA LOGÓW TRENINGOWYCH (Sesje)
CREATE TABLE public.workout_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_day VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', 'D'
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. TABELA LOGÓW SERII (Pojedyncze ćwiczenia)
CREATE TABLE public.exercise_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_name VARCHAR(100) NOT NULL,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight DECIMAL(5,2),
    is_pws_or_msp BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. TABELA NAWYKÓW (Korekta postawy)
CREATE TABLE public.daily_habits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    couch_stretch BOOLEAN DEFAULT FALSE,
    chin_tucks BOOLEAN DEFAULT FALSE,
    glute_bridge BOOLEAN DEFAULT FALSE,
    child_pose BOOLEAN DEFAULT FALSE,
    protein_170g BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, date)
);

-- WŁĄCZENIE RLS (Row Level Security) DLA BEZPIECZEŃSTWA
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_habits ENABLE ROW LEVEL SECURITY;

-- POLITYKI (Tylko zalogowany użytkownik widzi i edytuje SWOJE dane)
CREATE POLICY "Users can manage their own sessions" ON public.workout_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own exercise logs" ON public.exercise_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own habits" ON public.daily_habits
    FOR ALL USING (auth.uid() = user_id);
-- 4. TABELA POMIARÓW CIAŁA (Statystyki)
CREATE TABLE public.body_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    weight DECIMAL(5,2),
    waist DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, date)
);

-- WŁĄCZENIE RLS DLA NOWEJ TABELI
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;

-- POLITYKI DLA NOWEJ TABELI
CREATE POLICY "Users can manage their own body metrics" ON public.body_metrics
    FOR ALL USING (auth.uid() = user_id);
