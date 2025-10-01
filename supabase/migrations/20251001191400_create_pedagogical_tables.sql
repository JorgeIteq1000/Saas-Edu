-- supabase/migrations/YYYYMMDDHHMMSS_create_pedagogical_tables.sql

-- Tabela para armazenar as disciplinas
CREATE TABLE public.disciplines (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    workload_hours integer NOT NULL,
    sagah_content_id text, -- ID do conteúdo LTI da Sagah
    recovery_attempts integer DEFAULT 1 NOT NULL,
    teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL -- Professor responsável
);

-- Tabela de associação (pivô) entre cursos e disciplinas
CREATE TABLE public.course_disciplines (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    discipline_id uuid NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
    -- Garante que uma disciplina não pode ser adicionada duas vezes ao mesmo curso
    UNIQUE (course_id, discipline_id)
);

-- Habilitar Row Level Security
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_disciplines ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança:
-- log: Apenas usuários autenticados podem ver as disciplinas e suas associações.
CREATE POLICY "Allow authenticated read access"
ON public.disciplines FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access for course disciplines"
ON public.course_disciplines FOR SELECT
USING (auth.role() = 'authenticated');

-- log: Apenas administradores e gestores podem criar, alterar ou deletar.
CREATE POLICY "Allow admin/manager full access"
ON public.disciplines FOR ALL
USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor'));

CREATE POLICY "Allow admin/manager full access for course disciplines"
ON public.course_disciplines FOR ALL
USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor'));