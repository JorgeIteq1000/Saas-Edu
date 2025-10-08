-- Tabela para armazenar os combos
CREATE TABLE public.combos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona comentários para clareza
COMMENT ON TABLE public.combos IS 'Armazena os pacotes de cursos (combos)';
COMMENT ON COLUMN public.combos.name IS 'Nome do combo, ex: Pós + 2ª Licenciatura';
COMMENT ON COLUMN public.combos.price IS 'Preço total do combo';
COMMENT ON COLUMN public.combos.is_active IS 'Indica se o combo está disponível para venda';

-- Tabela de associação entre combos e cursos (relação N-para-N)
CREATE TABLE public.combo_courses (
    combo_id UUID REFERENCES public.combos(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    PRIMARY KEY (combo_id, course_id)
);

-- Adiciona comentários para clareza
COMMENT ON TABLE public.combo_courses IS 'Tabela pivot para associar cursos a combos';

-- Modificar a tabela de matrículas (enrollments) para suportar combos
ALTER TABLE public.enrollments
ADD COLUMN combo_id UUID REFERENCES public.combos(id) ON DELETE SET NULL;

-- Adiciona um check para garantir que a matrícula é ou de um curso ou de um combo
-- NOTA: Esta constraint exige que a coluna course_id possa ser NULA.
-- Se ela estiver como NOT NULL, você precisará alterá-la primeiro.
-- Exemplo: ALTER TABLE public.enrollments ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.enrollments
ADD CONSTRAINT enrollments_course_or_combo_check
CHECK (
    (course_id IS NOT NULL AND combo_id IS NULL) OR
    (course_id IS NULL AND combo_id IS NOT NULL)
);

-- Adiciona comentários para clareza
COMMENT ON COLUMN public.enrollments.combo_id IS 'Referência ao combo no qual o aluno foi matriculado';

-- Habilita Row Level Security para as novas tabelas
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_courses ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para a tabela de combos (exemplo: permitir leitura para todos os autenticados)
CREATE POLICY "Allow authenticated read access to combos"
ON public.combos FOR SELECT
TO authenticated
USING (true);

-- Políticas de acesso para a tabela combo_courses (exemplo: permitir leitura para todos os autenticados)
CREATE POLICY "Allow authenticated read access to combo_courses"
ON public.combo_courses FOR SELECT
TO authenticated
USING (true);

-- Somente administradores podem criar, alterar ou deletar combos
CREATE POLICY "Allow admin full access to combos"
ON public.combos FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor')
);

CREATE POLICY "Allow admin full access to combo_courses"
ON public.combo_courses FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin_geral', 'gestor')
);