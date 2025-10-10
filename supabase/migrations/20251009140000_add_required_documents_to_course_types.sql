-- Adiciona a coluna para armazenar os documentos necessários para cada tipo de curso.
ALTER TABLE public.course_types
ADD COLUMN required_documents TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Log da alteração
COMMENT ON COLUMN public.course_types.required_documents IS 'Armazena a lista de documentos obrigatórios para a matrícula no tipo de curso.';