-- Habilita a Row Level Security para a tabela, caso ainda não esteja ativa.
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Remove a política antiga com o mesmo nome para evitar erros, se já existir.
DROP POLICY IF EXISTS "Allow student to read their own enrollments" ON public.enrollments;

-- Cria a política para a tabela de matrículas
CREATE POLICY "Allow student to read their own enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- Log da alteração
COMMENT ON POLICY "Allow student to read their own enrollments" ON public.enrollments IS 'Permite que um aluno (usuário autenticado) leia apenas as suas próprias matrículas.';