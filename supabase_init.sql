-- Extensión para UUIDs generados automáticamente
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de Links
CREATE TABLE public.links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_url TEXT NOT NULL,
    alias TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabla de Analytics (Clicks)
CREATE TABLE public.clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
    user_agent TEXT,
    os TEXT,
    referer TEXT,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

-- Políticas Públicas (El motor SSR necesita leer rápido los links)
CREATE POLICY "Public link reading" ON public.links FOR SELECT USING (true);
CREATE POLICY "Public click insertion" ON public.clicks FOR INSERT WITH CHECK (true);

-- Políticas Privadas (Dashboard Usuarios)
CREATE POLICY "Users can insert their own links" ON public.links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own links" ON public.links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own links" ON public.links FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can see stats for their own links" ON public.clicks FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.links WHERE public.links.id = public.clicks.link_id AND public.links.user_id = auth.uid())
);
