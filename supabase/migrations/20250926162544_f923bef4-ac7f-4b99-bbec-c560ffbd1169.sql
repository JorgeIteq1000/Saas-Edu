-- Criar tabela de tipos de cursos
CREATE TABLE public.course_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de faculdades certificadoras
CREATE TABLE public.certifying_institutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de contratos
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  course_type_id UUID NOT NULL,
  certifying_institution_id UUID NOT NULL,
  contract_content TEXT NOT NULL,
  terms_and_conditions TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (course_type_id) REFERENCES course_types(id),
  FOREIGN KEY (certifying_institution_id) REFERENCES certifying_institutions(id)
);

-- Adicionar colunas na tabela courses para vincular com tipos e instituições
ALTER TABLE public.courses 
ADD COLUMN course_type_id UUID,
ADD COLUMN certifying_institution_id UUID;

-- Adicionar foreign keys
ALTER TABLE public.courses 
ADD CONSTRAINT fk_courses_course_type 
FOREIGN KEY (course_type_id) REFERENCES course_types(id);

ALTER TABLE public.courses 
ADD CONSTRAINT fk_courses_certifying_institution 
FOREIGN KEY (certifying_institution_id) REFERENCES certifying_institutions(id);

-- Enable RLS nas novas tabelas
ALTER TABLE public.course_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifying_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Políticas para course_types
CREATE POLICY "Everyone can view active course types" 
ON public.course_types 
FOR SELECT 
USING (active = true);

CREATE POLICY "Admin can manage course types" 
ON public.course_types 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin_geral'::user_role);

-- Políticas para certifying_institutions
CREATE POLICY "Everyone can view active institutions" 
ON public.certifying_institutions 
FOR SELECT 
USING (active = true);

CREATE POLICY "Admin can manage institutions" 
ON public.certifying_institutions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin_geral'::user_role);

-- Políticas para contracts
CREATE POLICY "Everyone can view active contracts" 
ON public.contracts 
FOR SELECT 
USING (active = true);

CREATE POLICY "Admin can manage contracts" 
ON public.contracts 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin_geral'::user_role);

-- Adicionar triggers para updated_at
CREATE TRIGGER update_course_types_updated_at
BEFORE UPDATE ON public.course_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certifying_institutions_updated_at
BEFORE UPDATE ON public.certifying_institutions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns dados iniciais
INSERT INTO public.course_types (name, description) VALUES
('Graduação', 'Cursos de graduação superior'),
('Pós-Graduação', 'Cursos de pós-graduação lato sensu'),
('Mestrado', 'Cursos de mestrado stricto sensu'),
('Doutorado', 'Cursos de doutorado stricto sensu'),
('Técnico', 'Cursos técnicos profissionalizantes'),
('Livre', 'Cursos livres de capacitação');

INSERT INTO public.certifying_institutions (name, cnpj, contact_email) VALUES
('Universidade Federal Exemplo', '12.345.678/0001-90', 'contato@ufex.edu.br'),
('Instituto Tecnológico Superior', '98.765.432/0001-10', 'admin@its.edu.br'),
('Faculdade de Ciências Aplicadas', '11.222.333/0001-44', 'secretaria@fca.edu.br');