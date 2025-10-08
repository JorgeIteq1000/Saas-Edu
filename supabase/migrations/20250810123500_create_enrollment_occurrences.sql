-- Tabela para registrar ocorrências importantes em uma matrícula específica
CREATE TABLE public.enrollment_occurrences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Quem registrou a ocorrência
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB -- Campo para dados extras, como Ids de ações automáticas
);

-- Habilita RLS
ALTER TABLE public.enrollment_occurrences ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Gestores e admins podem ver todas as ocorrências"
ON public.enrollment_occurrences
FOR SELECT
USING (
  (get_my_claim('role'::text) = '"admin_geral"'::jsonb) OR
  (get_my_claim('role'::text) = '"gestor"'::jsonb)
);

CREATE POLICY "Gestores e admins podem inserir ocorrências"
ON public.enrollment_occurrences
FOR INSERT
WITH CHECK (
  (get_my_claim('role'::text) = '"admin_geral"'::jsonb) OR
  (get_my_claim('role'::text) = '"gestor"'::jsonb)
);

-- Comentários para clareza
COMMENT ON TABLE public.enrollment_occurrences IS 'Registra eventos e anotações importantes sobre a matrícula de um aluno em um curso.';
COMMENT ON COLUMN public.enrollment_occurrences.created_by IS 'Perfil do colaborador que criou o registro. Nulo se for automático.';
COMMENT ON COLUMN public.enrollment_occurrences.metadata IS 'Dados estruturados para ocorrências automáticas.';