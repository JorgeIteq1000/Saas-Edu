-- Cria a tabela para armazenar os documentos enviados pelos alunos
CREATE TABLE public.student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    file_path TEXT,
    rejection_reason TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adiciona um índice para otimizar as buscas por aluno
CREATE INDEX idx_student_documents_user_id ON public.student_documents(user_id);

-- Garante que um aluno só pode enviar um tipo de documento por matrícula
ALTER TABLE public.student_documents
ADD CONSTRAINT unique_user_enrollment_document UNIQUE (user_id, enrollment_id, document_type);

-- Log da alteração
COMMENT ON TABLE public.student_documents IS 'Armazena os documentos enviados pelos alunos, seu status e o caminho do arquivo.';