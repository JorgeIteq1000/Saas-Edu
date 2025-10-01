-- supabase/migrations/YYYYMMDDHHMMSS_create_teachers_table.sql

-- 1. Remove a coluna de titulação da tabela de perfis (se você a adicionou)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS titulation;

-- 2. Cria uma tabela dedicada apenas para os docentes
CREATE TABLE public.teachers (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name text NOT NULL,
    titulation text NOT NULL
);

-- 3. Remove a referência antiga da tabela de disciplinas
ALTER TABLE public.disciplines DROP CONSTRAINT IF EXISTS disciplines_teacher_id_fkey;

-- 4. Adiciona a nova referência para a tabela de docentes
ALTER TABLE public.disciplines
ADD CONSTRAINT disciplines_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;

-- 5. Habilita a segurança e cria as políticas para a nova tabela
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access for teachers"
ON public.teachers FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin/manager full access for teachers"
ON public.teachers FOR ALL
USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor'));