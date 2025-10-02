-- supabase/migrations/YYYYMMDDHHMMSS_create_student_grades.sql

-- Tabela para armazenar as notas dos alunos nas Unidades de Aprendizagem (UAs)
CREATE TABLE public.student_grades (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,

    -- Chaves estrangeiras para identificar o contexto da nota
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    discipline_id uuid NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
    learning_unit_id uuid NOT NULL REFERENCES public.learning_units(id) ON DELETE CASCADE,
    
    -- A nota em si
    grade numeric(4, 2) CHECK (grade >= 0.00 AND grade <= 10.00),

    -- Para controle de tentativas de recuperação
    attempt_number integer DEFAULT 1 NOT NULL,

    -- Garante que um aluno tenha apenas uma nota final por tentativa para cada UA
    UNIQUE (student_id, learning_unit_id, attempt_number)
);

-- Habilitar Row Level Security
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança:
-- 1. Alunos podem ver apenas as suas próprias notas.
CREATE POLICY "Students can view their own grades."
ON public.student_grades FOR SELECT
USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = student_id));

-- 2. Admins e Gestores podem gerenciar todas as notas.
CREATE POLICY "Admins and Managers can manage all grades."
ON public.student_grades FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor')
);