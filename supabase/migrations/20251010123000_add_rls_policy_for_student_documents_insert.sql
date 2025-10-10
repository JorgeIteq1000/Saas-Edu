-- Habilita a Row Level Security para a tabela, caso ainda não esteja ativa.
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas para garantir que não haja conflitos.
DROP POLICY IF EXISTS "Allow student to read their own documents" ON public.student_documents;
DROP POLICY IF EXISTS "Allow student to insert their own documents" ON public.student_documents;
DROP POLICY IF EXISTS "Allow student to update their own documents" ON public.student_documents;

-- Política de Leitura: Alunos podem ver seus próprios documentos.
CREATE POLICY "Allow student to read their own documents"
ON public.student_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = student_documents.user_id AND profiles.user_id = auth.uid()
  )
);

-- Política de Escrita (INSERT): Alunos podem criar documentos para si mesmos. (ESTA É A CORREÇÃO)
CREATE POLICY "Allow student to insert their own documents"
ON public.student_documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = student_documents.user_id AND profiles.user_id = auth.uid()
  )
);

-- Política de Atualização (UPDATE): Alunos podem atualizar seus próprios documentos.
CREATE POLICY "Allow student to update their own documents"
ON public.student_documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = student_documents.user_id AND profiles.user_id = auth.uid()
  )
);

-- Log da alteração
COMMENT ON POLICY "Allow student to insert their own documents" ON public.student_documents IS 'Permite que um aluno crie um novo registro de documento se o profile_id corresponder ao seu auth.uid.';