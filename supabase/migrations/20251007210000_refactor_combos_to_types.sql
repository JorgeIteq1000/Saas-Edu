-- Passo 1: Remover a tabela de associação antiga que ligava combos a cursos específicos.
DROP TABLE IF EXISTS public.combo_courses;

-- Passo 2: Criar a nova tabela de associação para ligar combos a TIPOS de curso.
CREATE TABLE public.combo_course_types (
    combo_id UUID REFERENCES public.combos(id) ON DELETE CASCADE,
    course_type_id UUID REFERENCES public.course_types(id) ON DELETE CASCADE,
    PRIMARY KEY (combo_id, course_type_id)
);

COMMENT ON TABLE public.combo_course_types IS 'Tabela pivot para associar TIPOS de curso a combos.';

-- Passo 3: Criar uma tabela para armazenar os cursos específicos que um aluno escolheu para sua matrícula de combo.
CREATE TABLE public.enrollment_selected_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.enrollment_selected_courses IS 'Registra os cursos específicos que um aluno selecionou dentro de uma matrícula de combo.';
COMMENT ON COLUMN public.enrollment_selected_courses.enrollment_id IS 'Refere-se a uma matrícula em um combo na tabela de enrollments.';

-- Habilitar RLS para as novas tabelas
ALTER TABLE public.combo_course_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_selected_courses ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Allow authenticated read access to combo_course_types"
ON public.combo_course_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin full access to combo_course_types"
ON public.combo_course_types FOR ALL TO authenticated
USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor'))
WITH CHECK ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor'));

CREATE POLICY "Allow user to see their own selected courses"
ON public.enrollment_selected_courses FOR SELECT TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor')
    OR
    enrollment_id IN (
        SELECT id FROM public.enrollments WHERE student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Allow admin to insert selected courses"
ON public.enrollment_selected_courses FOR INSERT TO authenticated
WITH CHECK ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor'));