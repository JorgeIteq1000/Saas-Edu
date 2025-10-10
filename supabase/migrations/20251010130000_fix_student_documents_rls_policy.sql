-- Remove as políticas antigas para garantir um estado limpo
DROP POLICY IF EXISTS "Allow student to read their own documents" ON public.student_documents;
DROP POLICY IF EXISTS "Allow student to insert their own documents" ON public.student_documents;
DROP POLICY IF EXISTS "Allow student to update their own documents" ON public.student_documents;

-- Política de Leitura (SELECT): Permite que um aluno veja seus documentos
CREATE POLICY "Allow student to read their own documents"
ON public.student_documents
FOR SELECT
TO authenticated
USING (
  (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = student_documents.user_id) = auth.uid()
);

-- Política de Inserção (INSERT): Permite que um aluno crie um registro de documento para si mesmo
CREATE POLICY "Allow student to insert their own documents"
ON public.student_documents
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = student_documents.user_id) = auth.uid()
);

-- Política de Atualização (UPDATE): Permite que um aluno atualize seus próprios documentos
CREATE POLICY "Allow student to update their own documents"
ON public.student_documents
FOR UPDATE
TO authenticated
USING (
  (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = student_documents.user_id) = auth.uid()
);

-- Log da alteração
COMMENT ON POLICY "Allow student to insert their own documents" ON public.student_documents IS 'Permite que um aluno insira documentos se o profile_id corresponder ao seu auth.uid via sub-select.';