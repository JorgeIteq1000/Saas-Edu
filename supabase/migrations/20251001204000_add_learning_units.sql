-- supabase/migrations/YYYYMMDDHHMMSS_add_learning_units.sql

-- 1. Remove a coluna 'sagah_content_id' da tabela 'disciplines', pois ela agora pertence às UAs.
ALTER TABLE public.disciplines
DROP COLUMN IF EXISTS sagah_content_id;

-- 2. Cria a nova tabela para as Unidades de Aprendizagem (UAs)
CREATE TABLE public.learning_units (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL, -- Nome da UA (ex: "Infecção pelo HIV na gestação")
    sagah_content_id text NOT NULL, -- O contentId específico da UA
    discipline_id uuid NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE -- Link para a disciplina pai
);

-- 3. Habilita a segurança e cria as políticas para a nova tabela
ALTER TABLE public.learning_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access for learning units"
ON public.learning_units FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin/manager full access for learning units"
ON public.learning_units FOR ALL
USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor'));