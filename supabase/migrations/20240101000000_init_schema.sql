--
-- Tipos ENUM (Tipos de dados customizados)
--
CREATE TYPE public.course_modality AS ENUM ('ead', 'presencial', 'hibrido');
CREATE TYPE public.course_type AS ENUM ('graduacao', 'pos_graduacao', 'especializacao', 'extensao', 'tecnico', 'livre');
CREATE TYPE public.user_role AS ENUM ('admin_geral', 'gestor', 'vendedor', 'colaborador', 'aluno');

--
-- Tabelas sem dependências externas diretas
--
CREATE TABLE public.course_types (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.certifying_institutions (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    cnpj text,
    contact_email text,
    contact_phone text,
    address text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.teams (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    manager_id uuid, -- A referência será adicionada depois
    cnpj text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

--
-- Tabela de Cursos (depende de course_types e certifying_institutions)
--
CREATE TABLE public.courses (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text,
    description text,
    course_type_id uuid REFERENCES public.course_types(id),
    certifying_institution_id uuid REFERENCES public.certifying_institutions(id),
    course_type public.course_type NOT NULL,
    modality public.course_modality NOT NULL,
    duration_months integer NOT NULL,
    workload_hours integer NOT NULL,
    enrollment_fee numeric,
    monthly_fee numeric,
    max_installments integer DEFAULT 12 NOT NULL,
    payment_methods text[] DEFAULT ARRAY['boleto', 'pix', 'cartao_de_credito'] NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    max_duration_months integer,
    min_duration_months integer,
    sagah_disciplines_code text
);

--
-- Tabela de Perfis de Usuário (depende de auth.users e teams)
--
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    updated_at timestamp with time zone,
    full_name text,
    email text UNIQUE,
    role public.user_role DEFAULT 'aluno'::public.user_role,
    active boolean DEFAULT true,
    phone text,
    document_number text,
    team_id uuid REFERENCES public.teams(id),
    birth_date date,
    gender text,
    rg text,
    rg_issuer text,
    address_street text,
    address_number text,
    address_complement text,
    address_neighborhood text,
    address_city text,
    address_state text,
    address_zip_code text,
    father_name text,
    mother_name text,
    birth_country text,
    birth_state text,
    birth_city text,
    previous_institution text,
    previous_course text,
    education_level text,
    graduation_date date
);

-- Adiciona a referência circular que faltava
ALTER TABLE public.teams ADD CONSTRAINT fk_teams_manager FOREIGN KEY (manager_id) REFERENCES public.profiles(id);

-- Políticas de Segurança e Gatilho
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, phone, document_number)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    (new.raw_user_meta_data->>'role')::public.user_role,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'document_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();