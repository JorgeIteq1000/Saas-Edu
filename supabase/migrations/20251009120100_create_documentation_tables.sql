-- 1. Tabela para armazenar todos os tipos de documentos possíveis
CREATE TABLE public.document_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilita RLS
ALTER TABLE public.document_configs ENABLE ROW LEVEL SECURITY;

-- Permite que usuários autenticados leiam os tipos de documentos
CREATE POLICY "Allow authenticated read access to document configs"
ON public.document_configs
FOR SELECT
USING (auth.role() = 'authenticated');

-- Permite que admins/colaboradores gerenciem os tipos de documentos
CREATE POLICY "Allow staff to manage document configs"
ON public.document_configs
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE role IN ('admin_geral', 'colaborador')
  )
);

-- 2. Tabela de junção para definir quais documentos são obrigatórios por tipo de curso (Muitos-para-Muitos)
CREATE TABLE public.required_documents (
    course_type_id UUID NOT NULL REFERENCES public.course_types(id) ON DELETE CASCADE,
    document_config_id UUID NOT NULL REFERENCES public.document_configs(id) ON DELETE CASCADE,
    PRIMARY KEY (course_type_id, document_config_id)
);

-- Habilita RLS
ALTER TABLE public.required_documents ENABLE ROW LEVEL SECURITY;

-- Permite que usuários autenticados leiam os documentos obrigatórios
CREATE POLICY "Allow authenticated read access to required documents"
ON public.required_documents
FOR SELECT
USING (auth.role() = 'authenticated');

-- Permite que admins/colaboradores gerenciem os documentos obrigatórios
CREATE POLICY "Allow staff to manage required documents"
ON public.required_documents
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE role IN ('admin_geral', 'colaborador')
  )
);

-- Inserir alguns documentos padrão para começar
INSERT INTO public.document_configs (name, description) VALUES
('Documento de Identidade (RG ou CNH)', 'Frente e verso do documento com foto.'),
('CPF', 'Cadastro de Pessoa Física, caso não conste no documento de identidade.'),
('Comprovante de Residência', 'Conta de água, luz ou telefone recente (últimos 3 meses).'),
('Certificado de Conclusão do Ensino Médio', 'Frente e verso do certificado.'),
('Histórico Escolar do Ensino Médio', 'Documento completo com todas as notas.');