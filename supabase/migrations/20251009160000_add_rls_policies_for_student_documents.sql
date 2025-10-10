-- Habilita a Row Level Security para as tabelas, caso ainda não esteja ativa.
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_types ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas com o mesmo nome para evitar erros, se existirem.
DROP POLICY IF EXISTS "Allow authenticated users to read courses" ON public.courses;
DROP POLICY IF EXISTS "Allow authenticated users to read course_types" ON public.course_types;

-- Cria a política para a tabela de cursos
CREATE POLICY "Allow authenticated users to read courses"
ON public.courses
FOR SELECT
TO authenticated
USING (true);

-- Cria a política para a tabela de tipos de curso
CREATE POLICY "Allow authenticated users to read course_types"
ON public.course_types
FOR SELECT
TO authenticated
USING (true);

-- Log da alteração
COMMENT ON POLICY "Allow authenticated users to read courses" ON public.courses IS 'Permite que qualquer usuário logado leia os dados dos cursos.';
COMMENT ON POLICY "Allow authenticated users to read course_types" ON public.course_types IS 'Permite que qualquer usuário logado leia os dados dos tipos de curso.';