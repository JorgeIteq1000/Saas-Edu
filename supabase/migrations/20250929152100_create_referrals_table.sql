-- supabase/migrations/YYYYMMDDHHMMSS_create_referrals_table.sql

CREATE TABLE public.referrals (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Quem indicou (o aluno logado)
    referred_by_student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Dados do amigo indicado
    referred_name text NOT NULL,
    referred_phone text NOT NULL,
    interested_course_id uuid NOT NULL REFERENCES public.courses(id),
    
    -- Status da indicação para o admin
    status text DEFAULT 'nova' NOT NULL, -- Ex: nova, contactado, matriculado, recompensado
    
    -- Para quem a indicação foi atribuída
    assigned_to_rep_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    admin_notes text
);

-- Habilitar Row Level Security
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança:
-- 1. Alunos podem criar indicações.
CREATE POLICY "Students can create their own referrals."
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = referred_by_student_id));

-- 2. Alunos podem ver apenas as suas próprias indicações.
CREATE POLICY "Students can view their own referrals."
ON public.referrals FOR SELECT
USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = referred_by_student_id));

-- 3. Admins e Gestores podem ver e gerenciar todas as indicações.
CREATE POLICY "Admins and Managers can manage all referrals."
ON public.referrals FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor')
);