-- supabase/migrations/YYYYMMDDHHMMSS_create_student_activity_logs.sql

CREATE TABLE public.student_activity_logs (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Aluno que é o "alvo" da ação
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Usuário que realizou a ação (aluno ou colaborador)
    actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Descrição da ação
    action_type text NOT NULL, -- Ex: 'acesso_administrativo', 'login_aluno', 'dados_atualizados'
    
    -- Detalhes adicionais, como o que foi alterado (opcional)
    details jsonb
);

-- Habilitar Row Level Security
ALTER TABLE public.student_activity_logs ENABLE ROW LEVEL SECURITY;

-- Índices para otimizar a busca
CREATE INDEX idx_student_activity_logs_student_id ON public.student_activity_logs(student_id);
CREATE INDEX idx_student_activity_logs_actor_id ON public.student_activity_logs(actor_id);


-- Políticas de Segurança:
-- 1. Alunos podem ver os logs relacionados a eles mesmos.
CREATE POLICY "Students can view their own activity logs."
ON public.student_activity_logs FOR SELECT
USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = student_id));

-- 2. Colaboradores com permissão podem ver os logs de qualquer aluno.
CREATE POLICY "Admins and managers can view all activity logs."
ON public.student_activity_logs FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor', 'vendedor')
);

-- 3. Usuários autenticados podem criar logs.
CREATE POLICY "Authenticated users can insert logs."
ON public.student_activity_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');